import pandas as pd
import numpy as np
import pickle
import os
from sklearn.preprocessing import StandardScaler

# ── Column definitions ─────────────────────────────────────────────
SENSOR_COLS = [
    'Air temperature [K]',
    'Process temperature [K]',
    'Rotational speed [rpm]',
    'Torque [Nm]',
    'Tool wear [min]'
]

FAILURE_MODES = ['TWF', 'HDF', 'PWF', 'OSF', 'RNF']
TARGET        = 'Machine failure'

# ── Step 1: Load ───────────────────────────────────────────────────
def load_data(path='data/raw/ai4i2020.csv'):
    df = pd.read_csv(path)
    df.columns = df.columns.str.strip()
    print(f"Loaded: {df.shape[0]} rows, {df.shape[1]} columns")
    return df

# ── Step 2: Clean ──────────────────────────────────────────────────
def clean_data(df):
    # Drop non-feature identifier columns
    drop_cols = ['UDI', 'Product ID']
    df = df.drop(columns=[c for c in drop_cols if c in df.columns])

    # Forward fill any missing sensor values
    df[SENSOR_COLS] = df[SENSOR_COLS].fillna(method='ffill')

    missing = df.isnull().sum().sum()
    print(f"Missing values after cleaning: {missing}")
    return df

# ── Step 3: Encode categorical ─────────────────────────────────────
def encode_categorical(df):
    if 'Type' in df.columns:
        df['Type_encoded'] = df['Type'].map({'L': 0, 'M': 1, 'H': 2})
        df = df.drop(columns=['Type'])
        print("Encoded: Type → Type_encoded (L=0, M=1, H=2)")
    return df

# ── Step 4: Scale sensors ──────────────────────────────────────────
def scale_sensors(df, fit=True, scaler_path='models/scaler.pkl'):
    os.makedirs('models', exist_ok=True)

    if fit:
        scaler = StandardScaler()
        df[SENSOR_COLS] = scaler.fit_transform(df[SENSOR_COLS])
        with open(scaler_path, 'wb') as f:
            pickle.dump(scaler, f)
        print(f"Scaler fitted and saved to {scaler_path}")
    else:
        with open(scaler_path, 'rb') as f:
            scaler = pickle.load(f)
        df[SENSOR_COLS] = scaler.transform(df[SENSOR_COLS])
        print(f"Scaler loaded from {scaler_path}")

    return df

# ── Step 5: Temporal split ─────────────────────────────────────────
def temporal_split(df, train_ratio=0.70, val_ratio=0.15):
    """
    Split preserving time order.
    Never shuffle — sensor data has temporal dependency.
    Train: 70% | Val: 15% | Test: 15%
    """
    n         = len(df)
    train_end = int(n * train_ratio)
    val_end   = int(n * (train_ratio + val_ratio))

    train = df.iloc[:train_end].copy()
    val   = df.iloc[train_end:val_end].copy()
    test  = df.iloc[val_end:].copy()

    print(f"\nSplit sizes:")
    print(f"  Train : {len(train):,} rows ({len(train)/n:.0%})")
    print(f"  Val   : {len(val):,} rows ({len(val)/n:.0%})")
    print(f"  Test  : {len(test):,} rows ({len(test)/n:.0%})")

    print(f"\nFailure rate per split:")
    print(f"  Train : {train[TARGET].mean():.2%}")
    print(f"  Val   : {val[TARGET].mean():.2%}")
    print(f"  Test  : {test[TARGET].mean():.2%}")

    return train, val, test

# ── Main pipeline ──────────────────────────────────────────────────
def run_pipeline():
    os.makedirs('data/processed', exist_ok=True)

    print("=" * 50)
    print("PREPROCESSING PIPELINE")
    print("=" * 50)

    # Load
    print("\n[1/5] Loading data...")
    df = load_data()

    # Clean
    print("\n[2/5] Cleaning data...")
    df = clean_data(df)

    # Encode
    print("\n[3/5] Encoding categorical columns...")
    df = encode_categorical(df)

    # Scale
    print("\n[4/5] Scaling sensor columns...")
    df = scale_sensors(df, fit=True)

    # Split
    print("\n[5/5] Splitting into train / val / test...")
    train, val, test = temporal_split(df)

    # Save
    train.to_csv('data/processed/train.csv', index=False)
    val.to_csv('data/processed/val.csv',     index=False)
    test.to_csv('data/processed/test.csv',   index=False)

    print("\n" + "=" * 50)
    print("PIPELINE COMPLETE")
    print("=" * 50)
    print(f"Saved:")
    print(f"  data/processed/train.csv ({len(train):,} rows)")
    print(f"  data/processed/val.csv   ({len(val):,} rows)")
    print(f"  data/processed/test.csv  ({len(test):,} rows)")
    print(f"  models/scaler.pkl")

    return train, val, test

if __name__ == '__main__':
    train, val, test = run_pipeline()