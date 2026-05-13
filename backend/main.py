import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Optional, List
from contextlib import asynccontextmanager

# Set working directory to project root
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, ROOT)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.database import (
    init_db, save_prediction,
    get_history, get_alerts,
    get_machine_summary
)
from src.predict import PredictiveMaintenanceEngine

# ── Lifespan — load models on startup ─────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up — loading ML models...")
    app.state.engine = PredictiveMaintenanceEngine(model_dir='models')
    init_db()
    print("Ready.")
    yield
    print("Shutting down.")

# ── App ────────────────────────────────────────────────────────────
app = FastAPI(
    title="Predictive Maintenance API",
    description=(
        "AI-driven predictive maintenance for Japanese SME manufacturing. "
        "Aligned with METI DX initiative."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# ── CORS — allow React frontend ────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / Response models ──────────────────────────────────────
class SensorReading(BaseModel):
    air_temperature:     float
    process_temperature: float
    rotational_speed:    float
    torque:              float
    tool_wear:           float
    machine_type:        str = 'M'

class PredictRequest(BaseModel):
    machine_id:   int
    readings:     List[SensorReading]
    lstm_sequence: Optional[List[List[float]]] = None

class PredictResponse(BaseModel):
    machine_id:            int
    timestamp:             str
    status:                str
    failure_probability:   float
    anomaly_score:         float
    is_anomaly:            bool
    rul_cycles:            Optional[float]
    recommended_action:    str
    threshold_used:        float
    models_used:           dict

# ── Helper — build DataFrame from readings ─────────────────────────
def readings_to_df(readings: List[SensorReading]) -> pd.DataFrame:
    type_map = {'L': 0, 'M': 1, 'H': 2}
    rows = []
    for r in readings:
        rows.append({
            'Air temperature [K]':     r.air_temperature,
            'Process temperature [K]': r.process_temperature,
            'Rotational speed [rpm]':  r.rotational_speed,
            'Torque [Nm]':             r.torque,
            'Tool wear [min]':         r.tool_wear,
            'Type_encoded':            type_map.get(r.machine_type, 1),
            'Machine failure':         0,
        })
    return pd.DataFrame(rows)

# ── Routes ─────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "name":        "Predictive Maintenance API",
        "version":     "1.0.0",
        "status":      "running",
        "description": "METI-aligned SME manufacturing AI system",
        "endpoints": [
            "/predict",
            "/machines",
            "/history",
            "/alerts",
            "/health",
            "/demo/{machine_id}"
        ]
    }

@app.get("/health")
def health():
    return {
        "status":    "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "models": {
            "isolation_forest": "loaded",
            "xgboost":          "loaded",
            "lstm":             "loaded" if app.state.engine.lstm_loaded
                                else "not loaded"
        }
    }

@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    """
    Run all three ML models on sensor readings.
    Requires minimum 20 readings for rolling features.
    """
    if len(request.readings) < 20:
        raise HTTPException(
            status_code=400,
            detail="Minimum 20 sensor readings required for rolling features."
        )

    try:
        df = readings_to_df(request.readings)

        # LSTM sequence
        lstm_seq = None
        if request.lstm_sequence and len(request.lstm_sequence) == 30:
            lstm_seq = np.array(request.lstm_sequence)

        result = app.state.engine.predict(df, lstm_sequence=lstm_seq)

        # Save to database
        save_prediction(request.machine_id, result)

        return PredictResponse(
            machine_id=request.machine_id,
            timestamp=datetime.utcnow().isoformat(),
            **result
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/machines")
def get_machines():
    """List all machines with summary statistics."""
    summary = get_machine_summary()

    # If no predictions yet return default machine list
    if not summary:
        return {
            "machines": [
                {"machine_id": i, "status": "No data yet"}
                for i in range(1, 6)
            ]
        }
    return {"machines": summary}

@app.get("/history")
def history(machine_id: Optional[int] = None, limit: int = 50):
    """Get prediction history — all machines or filtered by machine_id."""
    records = get_history(machine_id=machine_id, limit=limit)
    return {
        "machine_id": machine_id,
        "count":      len(records),
        "records":    records
    }

@app.get("/alerts")
def alerts(limit: int = 20, unresolved_only: bool = False):
    """Get alert log."""
    records = get_alerts(limit=limit, unresolved_only=unresolved_only)
    return {
        "count":   len(records),
        "alerts":  records
    }

@app.get("/demo/{machine_id}")
def demo_prediction(machine_id: int):
    """
    Demo endpoint — runs prediction on real simulated data.
    No request body needed. Used by React frontend for live demo.
    """
    if machine_id not in range(1, 6):
        raise HTTPException(
            status_code=400,
            detail="machine_id must be between 1 and 5"
        )

    try:
        # Load simulated data for this machine
        sim = pd.read_csv('data/simulated/sensor_simulation.csv')
        mdf = sim[sim['machine_id'] == machine_id].reset_index(drop=True)

        # Use last 50 cycles as sensor readings
        recent = mdf.tail(50)

        readings = [
            SensorReading(
                air_temperature=     float(row['temperature']),
                process_temperature= float(row['temperature']) + 10,
                rotational_speed=    float(row['rotational_speed']),
                torque=              float(row['pressure']) / 3,
                tool_wear=           float(row['vibration']) * 100,
                machine_type='M'
            )
            for _, row in recent.iterrows()
        ]

        df = readings_to_df(readings)

        # LSTM sequence — last 30 cycles
        sensors = ['temperature', 'vibration',
                   'pressure', 'rotational_speed']
        lstm_seq = mdf[sensors].tail(30).values

        result = app.state.engine.predict(df, lstm_sequence=lstm_seq)
        save_prediction(machine_id, result)

        return {
            "machine_id": machine_id,
            "timestamp":  datetime.utcnow().isoformat(),
            "cycles_analyzed": len(recent),
            **result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))