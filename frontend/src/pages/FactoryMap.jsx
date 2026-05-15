import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDemoPredict } from '../api/client'

const MACHINE_POSITIONS = [
  { id: 1, x: 15, y: 20, label: 'CNC旋盤 Lathe'      },
  { id: 2, x: 55, y: 20, label: 'フライス盤 Mill'      },
  { id: 3, x: 80, y: 20, label: '研削盤 Grinder'      },
  { id: 4, x: 25, y: 60, label: 'プレス機 Press'       },
  { id: 5, x: 65, y: 60, label: '溶接機 Welder'       },
]

const STATUS_COLOR = { CRITICAL: '#fc8181', WARNING: '#f6ad55', NORMAL: '#48bb78' }
const STATUS_JP    = { CRITICAL: '危険', WARNING: '注意', NORMAL: '正常' }

export default function FactoryMap() {
  const [machineData, setMachineData] = useState({})
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all(
      MACHINE_POSITIONS.map(m =>
        getDemoPredict(m.id).then(d => ({ id: m.id, data: d }))
      )
    ).then(results => {
      const map = {}
      results.forEach(({ id, data }) => { map[id] = data })
      setMachineData(map)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const sel = selected ? machineData[selected] : null

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600 }}>
          工場マップ · Factory Map
        </h1>
        <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
          Visual floor layout · 工場フロアレイアウト — Click a machine for details
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr',
                    gap: '16px' }}>

        {/* Floor map */}
        <div className="card" style={{ position: 'relative',
                                        minHeight: '420px' }}>
          <div style={{ fontWeight: 500, marginBottom: '16px',
                        color: '#a0aec0', fontSize: '13px' }}>
            工場フロア · Factory Floor
          </div>

          {/* Floor background */}
          <div style={{ position: 'relative', background: '#0f1117',
                        border: '1px solid #2d3748', borderRadius: '8px',
                        height: '340px', overflow: 'hidden' }}>

            {/* Grid lines */}
            <svg width="100%" height="100%"
                 style={{ position: 'absolute', top: 0, left: 0 }}>
              <defs>
                <pattern id="grid" width="40" height="40"
                         patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none"
                        stroke="#1a1f2e" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Zone labels */}
            <div style={{ position: 'absolute', top: '8px', left: '8px',
                          fontSize: '10px', color: '#4a5568' }}>
              加工エリア A · Machining Zone A
            </div>
            <div style={{ position: 'absolute', bottom: '8px', left: '8px',
                          fontSize: '10px', color: '#4a5568' }}>
              加工エリア B · Machining Zone B
            </div>

            {/* Machines */}
            {MACHINE_POSITIONS.map(({ id, x, y, label }) => {
              const data    = machineData[id]
              const status  = data?.status || 'NORMAL'
              const color   = STATUS_COLOR[status]
              const isSelected = selected === id

              return (
                <div key={id}
                     onClick={() => setSelected(id === selected ? null : id)}
                     style={{
                       position: 'absolute',
                       left: `${x}%`, top: `${y}%`,
                       transform: 'translate(-50%, -50%)',
                       cursor: 'pointer', textAlign: 'center',
                       zIndex: isSelected ? 10 : 1
                     }}>

                  {/* Pulse ring for critical */}
                  {status === 'CRITICAL' && (
                    <div style={{
                      position: 'absolute',
                      top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '70px', height: '70px',
                      border: `2px solid ${color}`,
                      borderRadius: '50%',
                      opacity: 0.3,
                      animation: 'pulse 2s infinite'
                    }} />
                  )}

                  {/* Machine box */}
                  <div style={{
                    width: '60px', height: '60px',
                    background: isSelected ? '#222840' : '#1a1f2e',
                    border: `2px solid ${color}`,
                    borderRadius: '10px',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 12px ${color}40`,
                    transition: 'all 0.2s'
                  }}>
                    <div style={{ fontSize: '18px' }}>⚙️</div>
                    <div style={{ fontSize: '9px', color,
                                  fontWeight: 600, marginTop: '2px' }}>
                      M{id}
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '9px', color,
                                  fontWeight: 600 }}>{status}</div>
                    <div style={{ fontSize: '9px', color,
                                  fontFamily: 'Noto Sans JP' }}>
                      {STATUS_JP[status]}
                    </div>
                  </div>

                  {/* Machine label */}
                  <div style={{ fontSize: '9px', color: '#4a5568',
                                marginTop: '2px', whiteSpace: 'nowrap' }}>
                    {label}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px',
                        fontSize: '11px' }}>
            {Object.entries(STATUS_COLOR).map(([s, c]) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center',
                                    gap: '6px' }}>
                <div style={{ width: '10px', height: '10px',
                              background: c, borderRadius: '50%' }} />
                <span style={{ color: '#718096' }}>{s} </span>
                <span style={{ color: c, fontFamily: 'Noto Sans JP',
                               fontSize: '10px' }}>
                  {STATUS_JP[s]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="card">
          {!selected ? (
            <div style={{ textAlign: 'center', padding: '40px 20px',
                          color: '#718096' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏭</div>
              <div>Click a machine on the map</div>
              <div className="jp" style={{ marginTop: '4px',
                                           fontSize: '12px' }}>
                マップ上の機械をクリック
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px',
                            marginBottom: '4px' }}>
                Machine {selected}
              </div>
              <div className="label-jp" style={{ marginBottom: '16px' }}>
                機械 {String(selected).padStart(3, '0')}
              </div>

              {loading ? (
                <div className="skeleton" style={{ height: '200px' }} />
              ) : sel ? (
                <>
                  <div className={`badge badge-${sel.status.toLowerCase()}`}
                       style={{ marginBottom: '16px', fontSize: '12px',
                                padding: '5px 14px' }}>
                    {sel.status} · {STATUS_JP[sel.status]}
                  </div>

                  {[
                    { en: 'Failure Probability', jp: '故障確率',
                      val: `${(sel.failure_probability*100).toFixed(1)}%` },
                    { en: 'Anomaly Score', jp: '異常スコア',
                      val: sel.anomaly_score?.toFixed(3) },
                    { en: 'RUL', jp: '残余耐用寿命',
                      val: sel.rul_cycles !== null
                        ? `${sel.rul_cycles} cycles` : 'N/A' },
                  ].map(({ en, jp, val }) => (
                    <div key={en} style={{ display: 'flex',
                                          justifyContent: 'space-between',
                                          padding: '8px 0',
                                          borderBottom: '1px solid #2d3748',
                                          fontSize: '13px' }}>
                      <div>
                        <div style={{ color: '#a0aec0' }}>{en}</div>
                        <div className="label-jp">{jp}</div>
                      </div>
                      <div style={{ fontWeight: 600, color: '#e2e8f0' }}>
                        {val}
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: '12px', fontSize: '12px',
                                color: '#718096' }}>
                    {sel.recommended_action}
                  </div>

                  <button className="btn btn-primary"
                          onClick={() => navigate(`/machine/${selected}`)}
                          style={{ width: '100%', marginTop: '16px' }}>
                    詳細を見る · View Detail
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translate(-50%,-50%) scale(1); opacity: 0.3; }
          50%       { transform: translate(-50%,-50%) scale(1.3); opacity: 0; }
        }
      `}</style>
    </div>
  )
}