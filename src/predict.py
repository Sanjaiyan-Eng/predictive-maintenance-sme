import os
os.chdir(r'D:\predictive-maintenance-sme')

import pickle
import json
import numpy as np
import pandas as pd
import os
import warnings
warnings.filterwarnings('ignore')

# ── Column definitions ─────────────────────────────────────────────
SENSOR_COLS_RAW = [
    'Air temperature [K]',
    'Process temperature [K]',
    'Rotational speed [rpm]',
    'Torque [Nm]',
    'Tool wear [min]'
]

SENSOR_COLS_CLEAN = [
    'Air_temperature_K',
    'Process_temperature_K',
    'Rotational_speed_rpm',
    'Torque_Nm',
    'Tool_wear_min'
]

SIMULATED_SENSORS = [
    'temperature',
    'vibration',
    'pressure',
    'rotational_speed'
]

SEQ_LEN = 30
RUL_CAP = 200


# ── Feature name cleaner ───────────────────────────────────────────
def clean_feature_names(df):
    df.columns = (
        df.columns
        .str.replace('[', '', regex=False)
        .str.replace(']', '', regex=False)
        .str.replace('<', '', regex=False)
        .str.replace('>', '', regex=False)
        .str.replace(' ', '_', regex=False)
    )
    return df


# ── Feature engineering (mirrors features.py) ─────────────────────
def build_features_for_inference(df):
    """Apply same feature engineering used during training."""
    sensors = SENSOR_COLS_RAW

    # Rolling features
    for col in sensors:
        for w in [5, 10, 20]:
            df[f'{col}_rmean_{w}'] = df[col].rolling(w, min_periods=1).mean()
            df[f'{col}_rstd_{w}']  = df[col].rolling(w, min_periods=1).std().fillna(0)
            df[f'{col}_rmax_{w}']  = df[col].rolling(w, min_periods=1).max()
            df[f'{col}_rmin_{w}']  = df[col].rolling(w, min_periods=1).min()

    # Rate of change
    for col in sensors:
        df[f'{col}_roc'] = df[col].diff().fillna(0)

    # Physics features
    if 'Torque [Nm]' in df.columns and 'Rotational speed [rpm]' in df.columns:
        df['power_kw'] = (
            df['Torque [Nm]'] * df['Rotational speed [rpm]'] * 2 * np.pi / 60
        ) / 1000

    if 'Air temperature [K]' in df.columns and 'Process temperature [K]' in df.columns:
        df['temp_diff'] = (
            df['Process temperature [K]'] - df['Air temperature [K]']
        )

    if 'Tool wear [min]' in df.columns and 'Torque [Nm]' in df.columns:
        df['wear_torque'] = df['Tool wear [min]'] * df['Torque [Nm]']

    if 'Tool wear [min]' in df.columns and 'Rotational speed [rpm]' in df.columns:
        df['wear_speed'] = df['Tool wear [min]'] * df['Rotational speed [rpm]']

    return df


# ── Main engine class ──────────────────────────────────────────────
class PredictiveMaintenanceEngine:
    """
    Unified inference engine.
    Loads all three models on startup.
    Exposes single predict() method for FastAPI.
    """

    def __init__(self, model_dir='models'):
        self.model_dir = model_dir
        self._load_models()

    def _load(self, filename):
        path = os.path.join(self.model_dir, filename)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model file not found: {path}")
        with open(path, 'rb') as f:
            return pickle.load(f)

    def _load_models(self):
        print("Loading models...")

        # Scaler
        self.scaler = self._load('scaler.pkl')
        print("  scaler.pkl loaded")

        # Isolation Forest
        self.iso         = self._load('isolation_forest.pkl')
        self.iso_features = self._load('iso_feature_cols.pkl')
        print("  isolation_forest.pkl loaded")

        # XGBoost
        self.xgb          = self._load('xgboost_classifier.pkl')
        self.xgb_features = self._load('xgb_feature_cols.pkl')
        self.xgb_threshold = self._load('xgb_threshold.pkl')
        print("  xgboost_classifier.pkl loaded")

        # LSTM
        try:
            from tensorflow.keras.models import load_model
            lstm_path = os.path.join(self.model_dir, 'lstm_rul.keras')
            self.lstm = load_model(lstm_path)
            self.lstm_scaler = self._load('lstm_scaler.pkl')
            self.lstm_loaded = True
            print("  lstm_rul.keras loaded")
        except Exception as e:
            print(f"  LSTM not loaded: {e}")
            self.lstm_loaded = False

        print("All models loaded.\n")

    def _run_isolation_forest(self, X):
        X_iso = X[self.iso_features].fillna(0)
        score     = float(-self.iso.score_samples(X_iso)[0])
        is_anomaly = bool(self.iso.predict(X_iso)[0] == -1)
        return score, is_anomaly

    def _run_xgboost(self, X):
        X_xgb        = X[self.xgb_features].fillna(0)
        failure_prob  = float(self.xgb.predict_proba(X_xgb)[0, 1])
        will_fail     = bool(failure_prob >= self.xgb_threshold)
        return failure_prob, will_fail

    def _run_lstm(self, sensor_sequence):
        """
        sensor_sequence: numpy array of shape (seq_len, 4)
        sensors: temperature, vibration, pressure, rotational_speed
        """
        if not self.lstm_loaded:
            return None

        seq_scaled = self.lstm_scaler.transform(sensor_sequence)
        seq_input  = seq_scaled.reshape(1, SEQ_LEN, len(SIMULATED_SENSORS))
        rul_pred   = float(self.lstm.predict(seq_input, verbose=0)[0][0])
        rul_pred   = max(0, min(rul_pred, RUL_CAP))
        return round(rul_pred, 1)

    def _get_status_and_action(self, failure_prob, is_anomaly,
                                anomaly_score, rul):
        if failure_prob >= 0.70 or (rul is not None and rul < 50):
            status = 'CRITICAL'
            action = ('Immediate maintenance required. '
                      'Failure imminent within 50 cycles. '
                      'Stop machine and inspect.')
        elif (failure_prob >= self.xgb_threshold or
              is_anomaly or
              (rul is not None and rul < 150)):
            status = 'WARNING'
            action = ('Anomaly detected. Schedule maintenance '
                      'within 1 week. Monitor closely.')
        else:
            status = 'NORMAL'
            action = ('Machine operating within expected parameters. '
                      'Continue routine monitoring.')
        return status, action

    def predict(self, sensor_df, lstm_sequence=None):
        """
        Main inference method.

        Args:
            sensor_df: pd.DataFrame with raw sensor columns
                       (at least 20 rows for rolling features)
            lstm_sequence: np.array shape (30, 4) for RUL prediction
                           columns: temperature, vibration,
                                    pressure, rotational_speed

        Returns:
            dict with full diagnostic output
        """
        # Feature engineering
        df = sensor_df.copy()
        df = build_features_for_inference(df)

        # Scale sensors
        df[SENSOR_COLS_RAW] = self.scaler.transform(df[SENSOR_COLS_RAW])

        # Clean feature names for XGBoost
        df_clean = clean_feature_names(df.copy())

        # Run models on last row
        X_last       = df_clean.tail(1)
        X_last_raw   = df.tail(1)

        anomaly_score, is_anomaly = self._run_isolation_forest(X_last_raw)
        failure_prob, will_fail   = self._run_xgboost(X_last)

        # RUL from LSTM
        rul = None
        if lstm_sequence is not None and self.lstm_loaded:
            rul = self._run_lstm(lstm_sequence)

        status, action = self._get_status_and_action(
            failure_prob, is_anomaly, anomaly_score, rul
        )

        return {
            'status':              status,
            'failure_probability': round(failure_prob, 4),
            'will_fail':           will_fail,
            'anomaly_score':       round(anomaly_score, 4),
            'is_anomaly':          is_anomaly,
            'rul_cycles':          rul,
            'recommended_action':  action,
            'threshold_used':      round(float(self.xgb_threshold), 2),
            'models_used': {
                'anomaly_detection':    'Isolation Forest',
                'failure_classifier':   'XGBoost',
                'rul_predictor':        'LSTM' if self.lstm_loaded else 'N/A'
            }
        }


# ── Quick test ─────────────────────────────────────────────────────
if __name__ == '__main__':
    print("=" * 50)
    print("PREDICTIVE MAINTENANCE ENGINE — TEST")
    print("=" * 50)

    # Load engine
    engine = PredictiveMaintenanceEngine(model_dir='models')

    # Load test data
    test = pd.read_csv('data/processed/test_features.csv')

    # Reverse the column name cleaning for raw sensor cols
    # (test data has original column names)
    sample = test.head(50).copy()

    # Rename back to original names for inference
    rename_map = {
        'Air_temperature_K':    'Air temperature [K]',
        'Process_temperature_K':'Process temperature [K]',
        'Rotational_speed_rpm': 'Rotational speed [rpm]',
        'Torque_Nm':            'Torque [Nm]',
        'Tool_wear_min':        'Tool wear [min]'
    }
    # Check if columns need renaming
    if 'Air_temperature_K' in sample.columns:
        sample = sample.rename(columns=rename_map)

    print("\nRunning prediction on test sample...")
    result = engine.predict(sample)

    print("\n=== Prediction Result ===")
    for k, v in result.items():
        print(f"  {k:<25}: {v}")

    # Test with LSTM sequence from simulated data
    print("\n=== Testing LSTM RUL prediction ===")
    sim = pd.read_csv('data/simulated/sensor_simulation.csv')
    sim_machine1 = sim[sim['machine_id'] == 1].reset_index(drop=True)
    seq = sim_machine1[SIMULATED_SENSORS].values[100:130]  # 30 cycles

    result_with_rul = engine.predict(sample, lstm_sequence=seq)
    print(f"  RUL prediction: {result_with_rul['rul_cycles']} cycles")
    print(f"  Status        : {result_with_rul['status']}")
    print(f"  Action        : {result_with_rul['recommended_action']}")

    print("\n" + "=" * 50)
    print("ENGINE TEST COMPLETE")
    print("=" * 50)