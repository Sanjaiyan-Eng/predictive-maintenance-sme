import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'predictions.db')

# ── Initialize database ────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c    = conn.cursor()

    c.execute('''
        CREATE TABLE IF NOT EXISTS predictions (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp          TEXT NOT NULL,
            machine_id         INTEGER NOT NULL,
            status             TEXT NOT NULL,
            failure_probability REAL,
            anomaly_score      REAL,
            is_anomaly         INTEGER,
            rul_cycles         REAL,
            recommended_action TEXT,
            models_used        TEXT
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp   TEXT NOT NULL,
            machine_id  INTEGER NOT NULL,
            status      TEXT NOT NULL,
            message     TEXT,
            resolved    INTEGER DEFAULT 0
        )
    ''')

    conn.commit()
    conn.close()
    print(f"Database initialized: {DB_PATH}")

# ── Save prediction ────────────────────────────────────────────────
def save_prediction(machine_id, result):
    conn = sqlite3.connect(DB_PATH)
    c    = conn.cursor()

    c.execute('''
        INSERT INTO predictions (
            timestamp, machine_id, status,
            failure_probability, anomaly_score,
            is_anomaly, rul_cycles,
            recommended_action, models_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        datetime.utcnow().isoformat(),
        machine_id,
        result['status'],
        result['failure_probability'],
        result['anomaly_score'],
        int(result['is_anomaly']),
        result.get('rul_cycles'),
        result['recommended_action'],
        json.dumps(result['models_used'])
    ))

    # Log alert if not normal
    if result['status'] in ('WARNING', 'CRITICAL'):
        c.execute('''
            INSERT INTO alerts (
                timestamp, machine_id, status, message
            ) VALUES (?, ?, ?, ?)
        ''', (
            datetime.utcnow().isoformat(),
            machine_id,
            result['status'],
            result['recommended_action']
        ))

    conn.commit()
    conn.close()

# ── Get prediction history ─────────────────────────────────────────
def get_history(machine_id=None, limit=50):
    conn = sqlite3.connect(DB_PATH)
    c    = conn.cursor()

    if machine_id:
        c.execute('''
            SELECT * FROM predictions
            WHERE machine_id = ?
            ORDER BY id DESC LIMIT ?
        ''', (machine_id, limit))
    else:
        c.execute('''
            SELECT * FROM predictions
            ORDER BY id DESC LIMIT ?
        ''', (limit,))

    rows = c.fetchall()
    conn.close()

    columns = [
        'id', 'timestamp', 'machine_id', 'status',
        'failure_probability', 'anomaly_score',
        'is_anomaly', 'rul_cycles',
        'recommended_action', 'models_used'
    ]
    return [dict(zip(columns, row)) for row in rows]

# ── Get alerts ─────────────────────────────────────────────────────
def get_alerts(limit=20, unresolved_only=False):
    conn = sqlite3.connect(DB_PATH)
    c    = conn.cursor()

    if unresolved_only:
        c.execute('''
            SELECT * FROM alerts
            WHERE resolved = 0
            ORDER BY id DESC LIMIT ?
        ''', (limit,))
    else:
        c.execute('''
            SELECT * FROM alerts
            ORDER BY id DESC LIMIT ?
        ''', (limit,))

    rows = c.fetchall()
    conn.close()

    columns = [
        'id', 'timestamp', 'machine_id',
        'status', 'message', 'resolved'
    ]
    return [dict(zip(columns, row)) for row in rows]

# ── Get machine summary ────────────────────────────────────────────
def get_machine_summary():
    conn = sqlite3.connect(DB_PATH)
    c    = conn.cursor()

    c.execute('''
        SELECT
            machine_id,
            COUNT(*) as total_predictions,
            AVG(failure_probability) as avg_failure_prob,
            MAX(timestamp) as last_seen,
            SUM(CASE WHEN status = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count,
            SUM(CASE WHEN status = 'WARNING'  THEN 1 ELSE 0 END) as warning_count
        FROM predictions
        GROUP BY machine_id
        ORDER BY machine_id
    ''')

    rows = c.fetchall()
    conn.close()

    columns = [
        'machine_id', 'total_predictions',
        'avg_failure_prob', 'last_seen',
        'critical_count', 'warning_count'
    ]
    return [dict(zip(columns, row)) for row in rows]

if __name__ == '__main__':
    init_db()
    print("Database ready.")