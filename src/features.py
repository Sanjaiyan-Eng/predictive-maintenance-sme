import pandas as pd
import numpy as np
import os

SENSOR_COLS = [
    'Air temperature [K]',
    'Process temperature [K]',
    'Rotational speed [rpm]',
    'Torque [Nm]',
    'Tool wear [min]'
]

TARGET = 'Machine failure'

# ── Rolling statistics ─────────────────────────────────────────────
def add_rolling_features(df, cols, windows=(5, 10, 20)):
    for col in cols:
        for w in windows:
            df[f'{col}_rmean_{w}'] = (
                df[col].rolling(w, min_periods=1).mean()
            )
            df[f'{col}_rstd_{w}'] = (
                df[col].rolling(w, min_periods=1).std().fillna(0)
            )
            df[f'{col}_rmax_{w}'] = (
                df[col].rolling(w, min_periods=1).max()
            )
            df[f'{col}_rmin_{w}'] = (
                df[col].rolling(w, min_periods=1).min()
            )
    print(f"  Rolling features added: {len(cols) * len(windows) * 4} new columns")
    return df

# ── Rate of change ─────────────────────────────────────────────────
def add_rate_of_change(df, cols):
    for col in cols:
        df[f'{col}_roc'] = df[col].diff().fillna(0)
    print(f"  Rate of change features added: {len(cols)} new columns")
    return df

# ── Physics-grounded interactions ──────────────────────────────────
def add_physics_features(df):
    added = []

    if ('Torque [Nm]' in df.columns and
            'Rotational speed [rpm]' in df.columns):
        # Mechanical power: P = T × ω (converted to kW)
        df['power_kw'] = (
            df['Torque [Nm]'] *
            df['Rotational speed [rpm]'] *
            2 * np.pi / 60
        ) / 1000
        added.append('power_kw')

    if ('Air temperature [K]' in df.columns and
            'Process temperature [K]' in df.columns):
        # Temperature differential — key failure indicator
        df['temp_diff'] = (
            df['Process temperature [K]'] -
            df['Air temperature [K]']
        )
        added.append('temp_diff')

    if ('Tool wear [min]' in df.columns and
            'Torque [Nm]' in df.columns):
        # Wear-torque interaction
        df['wear_torque'] = (
            df['Tool wear [min]'] * df['Torque [Nm]']
        )
        added.append('wear_torque')

    if ('Tool wear [min]' in df.columns and
            'Rotational speed [rpm]' in df.columns):
        # Wear-speed interaction
        df['wear_speed'] = (
            df['Tool wear [min]'] * df['Rotational speed [rpm]']
        )
        added.append('wear_speed')

    print(f"  Physics features added: {added}")
    return df

# ── RUL label ──────────────────────────────────────────────────────
def add_rul_label(df, failure_col=TARGET, cap=1000):
    """
    Remaining Useful Life — cycles until next failure event.
    Capped at `cap` if no future failure within window.
    """
    rul       = []
    remaining = cap

    for val in reversed(df[failure_col].values):
        if val == 1:
            remaining = 0
        else:
            remaining = min(remaining + 1, cap)
        rul.append(remaining)

    df['rul'] = list(reversed(rul))
    print(f"  RUL label added — min: {df['rul'].min()}, "
          f"max: {df['rul'].max()}, mean: {df['rul'].mean():.1f}")
    return df

# ── Master function ────────────────────────────────────────────────
def build_features(df, split_name=''):
    print(f"\nBuilding features for: {split_name}")
    before = df.shape[1]

    df = add_rolling_features(df, SENSOR_COLS)
    df = add_rate_of_change(df, SENSOR_COLS)
    df = add_physics_features(df)
    df = add_rul_label(df)

    after = df.shape[1]
    print(f"  Columns: {before} → {after} (+{after - before} features)")
    return df

# ── Main ───────────────────────────────────────────────────────────
if __name__ == '__main__':
    os.makedirs('data/processed', exist_ok=True)

    print("=" * 50)
    print("FEATURE ENGINEERING PIPELINE")
    print("=" * 50)

    for split in ['train', 'val', 'test']:
        df = pd.read_csv(f'data/processed/{split}.csv')
        df = build_features(df, split_name=split)
        df.to_csv(f'data/processed/{split}_features.csv', index=False)
        print(f"  Saved: data/processed/{split}_features.csv")

    print("\n" + "=" * 50)
    print("FEATURE ENGINEERING COMPLETE")
    print("=" * 50)

    # Report final feature count
    sample = pd.read_csv('data/processed/train_features.csv')
    print(f"\nFinal feature count: {sample.shape[1]} columns")
    print(f"Final train rows   : {sample.shape[0]:,}")

    # Top features correlated with failure
    target_corr = (
        sample.select_dtypes(include=[float, int])
        .corr()[TARGET]
        .drop(TARGET)
        .abs()
        .sort_values(ascending=False))
    print(f"\nTop 10 features correlated with failure:")
    for feat, val in target_corr.head(10).items():
        print(f"  {feat:<45} {val:.4f}")