import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDemoPredict } from '../api/client'

const MACHINES   = [1, 2, 3, 4, 5]
const REFRESH_S  = 30
const DOWNTIME_COST_JPY = 500000

const STATUS_COLOR = { CRITICAL: '#fc8181', WARNING: '#f6ad55', NORMAL: '#48bb78' }
const STATUS_JP    = { CRITICAL: '危険', WARNING: '注意', NORMAL: '正常' }
const ACTION_JP    = {
  CRITICAL: '即時点検が必要です',
  WARNING:  '1週間以内に点検してください',
  NORMAL:   '通常監視を継続してください'
}

function KPICard({ enLabel, jpLabel, value, sub, color }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: '140px' }}>
      <div className="label-en">{enLabel}</div>
      <div className="label-jp">{jpLabel}</div>
      <div style={{ fontSize: '28px', fontWeight: 600,
                    color: color || '#e2e8f0', margin: '8px 0 4px' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '11px', color: '#718096' }}>{sub}</div>}
    </div>
  )
}

function MachineCard({ id, data, loading, onClick }) {
  const status = data?.status || 'NORMAL'
  const color  = STATUS_COLOR[status]

  return (
    <div className="card" onClick={onClick}
         style={{ cursor: 'pointer', borderLeft: `4px solid ${color}`,
                  transition: 'background 0.2s' }}
         onMouseEnter={e => e.currentTarget.style.background = '#222840'}
         onMouseLeave={e => e.currentTarget.style.background = '#1a1f2e'}>

      {/* Card header */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>Machine {id}</div>
          <div className="label-jp">機械 {String(id).padStart(3, '0')}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={`badge badge-${status.toLowerCase()}`}>{status}</div>
          <div style={{ fontSize: '10px', color, marginTop: '2px',
                        fontFamily: 'Noto Sans JP, sans-serif' }}>
            {STATUS_JP[status]}
          </div>
        </div>
      </div>

      {/* Metrics */}
      {loading ? (
        <>
          <div className="skeleton" style={{ height: '14px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '14px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '14px' }} />
        </>
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column',
                      gap: '6px', fontSize: '13px' }}>
          {[
            { en: 'Failure Probability', jp: '故障確率',
              val: `${(data.failure_probability * 100).toFixed(1)}%`,
              col: data.failure_probability > 0.5 ? '#fc8181' : '#e2e8f0' },
            { en: 'Anomaly Score', jp: '異常スコア',
              val: data.anomaly_score?.toFixed(3),
              col: data.is_anomaly ? '#fc8181' : '#e2e8f0' },
            { en: 'RUL', jp: '残余耐用寿命',
              val: data.rul_cycles !== null ? `${data.rul_cycles} cycles` : 'N/A',
              col: data.rul_cycles < 50 ? '#fc8181' :
                   data.rul_cycles < 150 ? '#f6ad55' : '#48bb78' },
          ].map(({ en, jp, val, col }) => (
            <div key={en} style={{ display: 'flex',
                                   justifyContent: 'space-between',
                                   alignItems: 'center' }}>
              <div>
                <span style={{ color: '#718096', fontSize: '12px' }}>{en} </span>
                <span className="label-jp" style={{ display: 'inline' }}>{jp}</span>
              </div>
              <span style={{ color: col, fontWeight: 500 }}>{val}</span>
            </div>
          ))}

          {/* Action */}
          <div style={{ marginTop: '8px', paddingTop: '8px',
                        borderTop: '1px solid #2d3748',
                        fontSize: '11px', color: '#718096' }}>
            <div>{data.recommended_action}</div>
            <div className="jp" style={{ color: '#4a5568', marginTop: '2px' }}>
              {ACTION_JP[status]}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ color: '#718096', fontSize: '13px' }}>
          Click to analyze · クリックして分析
        </div>
      )}
    </div>
  )
}

function MonodzukuriPanel({ machineData }) {
  const values   = Object.values(machineData)
  const caught   = values.filter(d => d?.status !== 'NORMAL').length
  const uptime   = values.length > 0
    ? ((values.filter(d => d?.status === 'NORMAL').length / values.length) * 100).toFixed(1)
    : '—'
  const savedJPY = caught * DOWNTIME_COST_JPY
  const planned  = values.length > 0
    ? Math.round((values.filter(d => d?.status !== 'CRITICAL').length
                  / values.length) * 100)
    : '—'

  const metrics = [
    { val: `${uptime}%`, en: 'Uptime',             jp: '稼働率',     col: '#48bb78' },
    { val: caught,       en: 'Failures Prevented',  jp: '故障防止',   col: '#63b3ed' },
    { val: `${planned}%`,en: 'Planned Maintenance', jp: '計画保全率', col: '#f6ad55' },
    { val: `¥${(savedJPY/1000000).toFixed(1)}M`,
                         en: 'Cost Avoided',        jp: '節約コスト', col: '#b794f4' },
  ]

  return (
    <div className="card" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <span style={{ fontSize: '14px', fontWeight: 600,
                         color: '#a0aec0' }}>ものづくり指標 </span>
          <span style={{ fontSize: '12px', color: '#718096' }}>
            Monodzukuri Quality Metrics
          </span>
        </div>
        <span style={{ fontSize: '10px', color: '#4a5568',
                       background: '#222840', padding: '3px 10px',
                       borderRadius: '4px' }}>
          改善 Kaizen
        </span>
      </div>
      <div style={{ display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {metrics.map(({ val, en, jp, col }) => (
          <div key={en} style={{ background: '#0f1117', borderRadius: '8px',
                                  padding: '14px', textAlign: 'center',
                                  border: '1px solid #2d3748' }}>
            <div style={{ fontSize: '22px', fontWeight: 600,
                          color: col }}>{val}</div>
            <div style={{ fontSize: '11px', color: '#718096',
                          marginTop: '4px' }}>{en}</div>
            <div className="label-jp">{jp}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [machineData, setMachineData] = useState({})
  const [loading,     setLoading]     = useState({})
  const [countdown,   setCountdown]   = useState(REFRESH_S)
  const [lastUpdate,  setLastUpdate]  = useState(null)
  const navigate = useNavigate()

  const analyzeAll = useCallback(async () => {
    setCountdown(REFRESH_S)
    for (const id of MACHINES) {
      setLoading(prev => ({ ...prev, [id]: true }))
      try {
        const data = await getDemoPredict(id)
        setMachineData(prev => ({ ...prev, [id]: data }))
      } catch(e) {
        console.error(`Machine ${id}:`, e)
      } finally {
        setLoading(prev => ({ ...prev, [id]: false }))
      }
    }
    setLastUpdate(new Date().toLocaleTimeString())
  }, [])

  // Initial load
  useEffect(() => { analyzeAll() }, [])

  // Countdown timer
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { analyzeAll(); return REFRESH_S }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [analyzeAll])

  const statuses = Object.values(machineData).map(d => d?.status)
  const critical = statuses.filter(s => s === 'CRITICAL').length
  const warning  = statuses.filter(s => s === 'WARNING').length
  const normal   = statuses.filter(s => s === 'NORMAL').length
  const avgFail  = statuses.length > 0
    ? (Object.values(machineData)
        .reduce((a, d) => a + (d?.failure_probability || 0), 0)
       / statuses.length * 100).toFixed(1)
    : '—'
  const savedJPY = Object.values(machineData)
    .filter(d => d?.status !== 'NORMAL').length * DOWNTIME_COST_JPY

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600 }}>
            工場概要 Dashboard
          </h1>
          <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
            日本の中小製造業向け予知保全システム · METI DX推進プログラム準拠
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastUpdate && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#718096' }}>
                Last updated · 最終更新
              </div>
              <div style={{ fontSize: '12px', color: '#a0aec0' }}>
                {lastUpdate}
              </div>
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#718096' }}>
              Next refresh · 次回更新
            </div>
            <div style={{ fontSize: '14px', color: '#63b3ed', fontWeight: 600 }}>
              {countdown}s
            </div>
          </div>
          <button className="btn btn-primary" onClick={analyzeAll}>
            更新 Refresh
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: '12px',
                    marginBottom: '24px', flexWrap: 'wrap' }}>
        <KPICard enLabel="Critical"  jpLabel="危険"
                 value={critical} sub="machines" color="#fc8181" />
        <KPICard enLabel="Warning"   jpLabel="注意"
                 value={warning}  sub="machines" color="#f6ad55" />
        <KPICard enLabel="Normal"    jpLabel="正常"
                 value={normal}   sub="machines" color="#48bb78" />
        <KPICard enLabel="Avg Failure Probability" jpLabel="平均故障確率"
                 value={`${avgFail}%`} color="#63b3ed" />
        <KPICard enLabel="Cost Avoided" jpLabel="節約コスト"
                 value={`¥${(savedJPY/1000000).toFixed(1)}M`}
                 sub="estimated downtime" color="#b794f4" />
      </div>

      {/* Machine grid */}
      <div style={{ fontSize: '13px', fontWeight: 500, color: '#a0aec0',
                    marginBottom: '12px' }}>
        稼働状態 — Machine Status
      </div>
      <div style={{ display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '16px' }}>
        {MACHINES.map(id => (
          <MachineCard key={id} id={id}
            data={machineData[id]}
            loading={!!loading[id]}
            onClick={() => navigate(`/machine/${id}`)} />
        ))}
      </div>

      {/* Monodzukuri panel */}
      <MonodzukuriPanel machineData={machineData} />
    </div>
  )
}