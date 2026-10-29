import os
import numpy as np
import pandas as pd
import pickle
from sklearn.preprocessing import MinMaxScaler

os.chdir(r'D:\predictive-maintenance-sme')

print("Loading data...")
df = pd.read_csv('data/simulated/sensor_simulation.csv')

SENSORS = ['temperature', 'vibration', 'pressure', 'rotational_speed']
SEQ_LEN = 30
RUL_CAP = 200

scaler = MinMaxScaler()
df[SENSORS] = scaler.fit_transform(df[SENSORS])
df['rul_capped'] = np.minimum(df['rul'], RUL_CAP)

def make_sequences(df, seq_len=30):
    X, y = [], []
    for mid in sorted(df['machine_id'].unique()):
        mdf = df[df['machine_id'] == mid].reset_index(drop=True)
        arr = mdf[SENSORS].values
        rul = mdf['rul_capped'].values
        for i in range(seq_len, len(arr)):
            X.append(arr[i-seq_len:i])
            y.append(rul[i])
    return np.array(X), np.array(y)

print("Building sequences...")
X, y = make_sequences(df, SEQ_LEN)
split = int(len(X) * 0.8)
X_train = X[:split]
X_test  = X[split:]
y_train = np.minimum(y[:split], RUL_CAP)
y_test  = y[split:]

print(f"X_train: {X_train.shape}")

import tensorflow as tf
from tensorflow import keras

print(f"TensorFlow version: {tf.__version__}")

# Build with functional API — Keras 3 compatible
inputs  = keras.Input(shape=(SEQ_LEN, len(SENSORS)))
x       = keras.layers.LSTM(64, return_sequences=True)(inputs)
x       = keras.layers.Dropout(0.2)(x)
x       = keras.layers.LSTM(32)(x)
x       = keras.layers.Dropout(0.2)(x)
x       = keras.layers.Dense(16, activation='relu')(x)
outputs = keras.layers.Dense(1)(x)
model   = keras.Model(inputs, outputs)

model.compile(optimizer='adam', loss='mae')
model.summary()

callbacks = [
    keras.callbacks.EarlyStopping(
        patience=10,
        restore_best_weights=True,
        monitor='val_loss'
    )
]

print("\nTraining LSTM...")
history = model.fit(
    X_train, y_train,
    validation_split=0.2,
    epochs=80,
    batch_size=64,
    callbacks=callbacks,
    verbose=1
)

y_pred = model.predict(X_test).flatten()
mae    = float(np.mean(np.abs(y_pred - np.minimum(y_test, RUL_CAP))))
print(f"\nMAE: {mae:.2f} cycles")

# Save
model.save('models/lstm_rul.keras')
print("Saved: models/lstm_rul.keras")

with open('models/lstm_scaler.pkl', 'wb') as f:
    pickle.dump(scaler, f)
print("Saved: models/lstm_scaler.pkl")

print("\nDone. Ready to push.")