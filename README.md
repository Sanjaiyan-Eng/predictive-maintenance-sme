# Predictive Maintenance AI System for Japanese SME Manufacturing


Three-model machine failure prediction (anomaly detection, failure classification, remaining useful life) served through a FastAPI backend and a bilingual English/Japanese React dashboard.

**Live demo:** https://predictive-maintenance-sme.vercel.app
**API docs:** https://predictive-maintenance-api-03i4.onrender.com/docs

> The backend runs on a free tier and sleeps after inactivity. The first load can take 30 to 60 seconds.


## Problem

Many Japanese SME factories run legacy machines with no monitoring and little budget for new hardware or data-science staff. Unplanned breakdowns stop production. This project shows a low-cost approach: predict failures from sensor readings using existing data, with no new hardware assumed.

## What it does

- Detects abnormal machine behavior without failure labels (Isolation Forest)
- Predicts failure probability (XGBoost)
- Estimates remaining useful life in cycles (LSTM)
- Combines the three outputs into a NORMAL / WARNING / CRITICAL status with a maintenance recommendation
- Logs predictions and alerts to SQLite
- Shows everything on a bilingual dashboard with machine cards, factory map, alert log and reports

## Model results

| Model | Task | Data | Result |
|---|---|---|---|
| Isolation Forest | Unsupervised anomaly detection | UCI AI4I 2020 | ROC-AUC 0.801 |
| XGBoost | Failure classification | UCI AI4I 2020 | ROC-AUC 0.932, PR-AUC 0.693, precision 0.81, recall 0.59, F1 0.68 |
| LSTM | Remaining useful life | Simulated sensor stream | MAE 4.94 cycles (RUL capped at 200) |



## Architecture

```
Sensor data (UCI AI4I 2020 + simulated stream)
        |
Preprocessing -> Feature engineering (rolling stats, rate of change, physics features)
        |
Isolation Forest   XGBoost   LSTM
        \             |       /
         Unified prediction engine
                   |
      FastAPI backend + SQLite logging
                   |
   React dashboard (English / Japanese)
```

| Layer | Technology | Hosting |
|---|---|---|
| ML | scikit-learn, XGBoost, TensorFlow/Keras | Render |
| Backend | FastAPI, SQLite | Render |
| Frontend | React, Vite, Recharts, React Router | Vercel |

## Features engineered

70 features added to the 5 raw sensors (air temperature, process temperature, rotational speed, torque, tool wear):
- Rolling mean, std, max, min over 5, 10 and 20 cycle windows
- Rate of change per sensor
- Mechanical power (torque x rotational speed)
- Temperature differential (process minus air)
- Wear-torque and wear-speed interaction terms

## Dashboard pages

| Page | Purpose |
|---|---|
| Dashboard (工場概要) | Fleet overview, KPI cards, per-machine status |
| Machine detail (機械詳細) | Failure probability, anomaly score, RUL, history charts |
| Alerts (アラート) | Warning and critical event log with filter |
| Reports (分析レポート) | Model performance summary |
| Factory map (工場マップ) | Floor layout with status overlay |
| Settings (設定) | API status and display settings |

Labels are shown in English with a Japanese subtitle.

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | API info |
| GET | `/health` | Service and model load status |
| POST | `/predict` | Run all models on submitted sensor readings (minimum 20) |
| GET | `/demo/{machine_id}` | Run models on simulated data for machine 1 to 5 |
| GET | `/machines` | Per-machine summary from logged predictions |
| GET | `/history` | Prediction history |
| GET | `/alerts` | Alert log |

Interactive docs: `/docs`

## Project structure

```
predictive-maintenance-sme/
├── backend/            FastAPI app (main.py, database.py, requirements.txt)
├── frontend/           React + Vite dashboard
├── src/                simulate.py, preprocess.py, features.py, predict.py
├── notebooks/          01_eda, 02_features, 03_anomaly_detection,
│                       04_xgboost_classifier, 05_lstm_rul
├── models/             Saved models, scalers, thresholds, metrics
├── data/               simulated/ and processed/ (raw data not included)
├── alerts/             Alert engine
├── dashboard/          Earlier Streamlit prototype
├── assets/             Charts and screenshots
├── render.yaml         Render service config
└── README.md
```

## Run locally

**Prerequisites:** Python 3.11, Node.js 18+

```bash
git clone https://github.com/Sanjaiyan-Eng/predictive-maintenance-sme.git
cd predictive-maintenance-sme

python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r backend/requirements.txt
```

Start the backend from the project root:

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

Start the frontend in a second terminal:

```bash
cd frontend
npm install
echo VITE_API_URL=http://localhost:8000 > .env
npm run dev
```

Open http://localhost:5173

### Retrain the models (optional)

1. Download the [UCI AI4I 2020 dataset](https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset) and save it as `data/raw/ai4i2020.csv`
2. `python src/simulate.py`
3. `python -m src.preprocess`
4. `python -m src.features`
5. Run the notebooks in `notebooks/` in order

## Limitations

- **Simulated data.** The LSTM is trained and evaluated on a synthetic sensor stream. XGBoost and Isolation Forest use the public UCI AI4I dataset. No real factory data is used.
- **Threshold tuning.** The XGBoost threshold (0.77) and the Isolation Forest contamination were tuned on the test split, so the reported F1 is optimistic. Tuning on the validation split would give a cleaner estimate.
- **Isolation Forest.** Failures in this dataset overlap with normal operation, so F1 is low (0.13 at contamination 0.15). It is included as the option for factories with no failure history.
- **Demo behavior.** `/demo/{id}` reads the last 50 cycles of each simulated machine, which end in failure, so machines tend to show CRITICAL.
- **Storage.** SQLite on the free Render tier is cleared on restart, so history and alerts reset.
- **Cost figure.** The yen value on the dashboard is an assumed ¥500,000 per flagged machine, not a measured saving.
- **Settings page.** Sliders change the page only, not backend thresholds.




## Data sources

- [UCI AI4I 2020 Predictive Maintenance Dataset](https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset)
- Custom simulated sensor stream (`src/simulate.py`): 5 machines, 5,000 cycles each, injected degradation


