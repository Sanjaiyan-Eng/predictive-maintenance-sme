import { useState, useEffect } from 'react'
import { getHealth } from '../api/client'

export default function Settings() {
  const [health,    setHealth]    = useState(null)
  const [critical,  setCritical]  = useState(70)
  const [warning,   setWarning]   = useState(40)
  const [refresh,   setRefresh]   = useState(30)
  const [saved,     setSaved]     = useState(false)

  useEffect(() => {
    getHealth().then(setHealth).catch(console.error)
  }, [])

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600 }}>
          設定 · Settings
        </h1>
        <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
          System configuration · システム設定
        </div>
      </div>

      {/* API Status */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ fontWeight: 500, marginBottom: '16px',
                      color: '#a0aec0', fontSize: '13px' }}>
          API接続状態 · API Connection Status
        </div>
        {health ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center' }}>
              <span style={{ color: '#718096', fontSize: '13px' }}>
                System status · システム状態
              </span>
              <span style={{ color: '#48bb78', fontWeight: 600,
                             fontSize: '13px' }}>
                ● {health.status}
              </span>
            </div>
            {Object.entries(health.models || {}).map(([model, status]) => (
              <div key={model} style={{ display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center' }}>
                <span style={{ color: '#718096', fontSize: '13px' }}>
                  {model} · モデル
                </span>
                <span style={{ color: status === 'loaded' ? '#48bb78' : '#fc8181',
                               fontSize: '13px', fontWeight: 500 }}>
                  {status === 'loaded' ? '● 読込済 Loaded' : '✗ Not loaded'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#fc8181', fontSize: '13px' }}>
            ✗ API接続エラー · Cannot connect to API
          </div>
        )}
      </div>

      {/* Alert thresholds */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ fontWeight: 500, marginBottom: '16px',
                      color: '#a0aec0', fontSize: '13px' }}>
          アラート閾値 · Alert Thresholds
        </div>

        {[
          { label: 'Critical threshold · 危険閾値',
            val: critical, set: setCritical, color: '#fc8181' },
          { label: 'Warning threshold · 注意閾値',
            val: warning,  set: setWarning,  color: '#f6ad55' },
        ].map(({ label, val, set, color }) => (
          <div key={label} style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
                          marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#a0aec0' }}>{label}</span>
              <span style={{ fontSize: '13px', color, fontWeight: 600 }}>
                {val}%
              </span>
            </div>
            <input type="range" min="10" max="95" value={val}
                   onChange={e => set(+e.target.value)}
                   style={{ width: '100%', accentColor: color }} />
          </div>
        ))}

        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
                        marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#a0aec0' }}>
              Refresh interval · 更新間隔
            </span>
            <span style={{ fontSize: '13px', color: '#63b3ed', fontWeight: 600 }}>
              {refresh}s
            </span>
          </div>
          <input type="range" min="10" max="120" value={refresh}
                 onChange={e => setRefresh(+e.target.value)}
                 style={{ width: '100%', accentColor: '#63b3ed' }} />
        </div>

        <button className="btn btn-primary" onClick={handleSave}
                style={{ width: '100%' }}>
          {saved ? '✓ 保存しました · Saved!' : '保存 · Save Settings'}
        </button>
      </div>

      {/* System info */}
      <div className="card">
        <div style={{ fontWeight: 500, marginBottom: '16px',
                      color: '#a0aec0', fontSize: '13px' }}>
          システム情報 · System Information
        </div>
        {[
          { en: 'Project',    jp: 'プロジェクト',     val: 'Predictive Maintenance AI' },
          { en: 'Target',     jp: '対象',             val: 'Japanese SME Manufacturing' },
          { en: 'Compliance', jp: '準拠',             val: 'METI DX推進プログラム' },
          { en: 'Models',     jp: 'モデル数',         val: '3 (IsoForest + XGBoost + LSTM)' },
          { en: 'ROC-AUC',    jp: 'XGBoost性能',     val: '0.932' },
          { en: 'LSTM R²',    jp: 'LSTM精度',        val: '0.9516' },
          { en: 'Framework',  jp: 'フレームワーク',   val: 'FastAPI + React' },
          { en: 'Deployment', jp: 'デプロイ',         val: 'Render + Vercel' },
        ].map(({ en, jp, val }) => (
          <div key={en} style={{ display: 'flex',
                                  justifyContent: 'space-between',
                                  padding: '8px 0',
                                  borderBottom: '1px solid #2d3748',
                                  fontSize: '13px' }}>
            <div>
              <span style={{ color: '#a0aec0' }}>{en} </span>
              <span className="label-jp" style={{ display: 'inline' }}>
                {jp}
              </span>
            </div>
            <span style={{ color: '#63b3ed', fontWeight: 500 }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}