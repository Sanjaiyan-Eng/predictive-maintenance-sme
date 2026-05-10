import numpy as np
import pandas as pd
import os

def simulate_machine(n_samples=5000, machine_id=1, anomaly_start=4000, seed=42):
    """
    Simulate time-series sensor data for one industrial machine.
    Normal operation, then gradual degradation, then failure.
    """
    np.random.seed(seed)
    t = np.arange(n_samples)

    # Baseline operating signals
    temperature   = 60 + 5 * np.sin(0.01 * t) + np.random.normal(0, 1.2, n_samples)
    vibration     = 0.5 + 0.05 * np.sin(0.05 * t) + np.random.normal(0, 0.04, n_samples)
    pressure      = 100 + 3 * np.sin(0.02 * t) + np.random.normal(0, 2, n_samples)
    rotational_sp = 1500 + 20 * np.sin(0.03 * t) + np.random.normal(0, 10, n_samples)

    # Inject gradual degradation after anomaly_start
    deg_len = n_samples - anomaly_start
    if deg_len > 0:
        temperature[anomaly_start:]   += np.linspace(0, 25, deg_len)
        vibration[anomaly_start:]     += np.linspace(0, 2.0, deg_len)
        pressure[anomaly_start:]      += np.linspace(0, 15, deg_len)
        rotational_sp[anomaly_start:] -= np.linspace(0, 200, deg_len)

    # Failure label — 1 starting 200 cycles into degradation
    failure = np.zeros(n_samples, dtype=int)
    failure_start = anomaly_start + 200
    if failure_start < n_samples:
        failure[failure_start:] = 1

    # Remaining Useful Life — cycles until failure_start
    rul = np.maximum(0, failure_start - t)

    return pd.DataFrame({
        'machine_id': machine_id,
        'cycle': t,
        'temperature': np.round(temperature, 2),
        'vibration': np.round(vibration, 4),
        'pressure': np.round(pressure, 2),
        'rotational_speed': np.round(rotational_sp, 1),
        'failure': failure,
        'rul': rul
    })

if __name__ == '__main__':
    os.makedirs('data/simulated', exist_ok=True)
    anomaly_points = [3800, 4000, 4200, 3600, 4400]
    dfs = [simulate_machine(5000, i+1, ap, 42+i)
           for i, ap in enumerate(anomaly_points)]
    df = pd.concat(dfs, ignore_index=True)
    df.to_csv('data/simulated/sensor_simulation.csv', index=False)
    print(f"Generated {len(df)} rows across {df['machine_id'].nunique()} machines")
    print(f"Failure rate: {df['failure'].mean():.2%}")
    print(df.head())
    