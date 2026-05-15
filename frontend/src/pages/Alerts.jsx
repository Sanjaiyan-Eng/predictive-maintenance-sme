import { useState, useEffect } from 'react'
import { getAlerts } from '../api/client'

const STATUS_COLOR = { CRITICAL: '#fc8181', WARNING: '#f6ad55' }
const STATUS_JP    = { CRITICAL: '危険', WARNING: '注意' }

export default function Alerts() {
  const [alerts,  setAlerts]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('ALL')

  useEffect(() => {
    getAlerts(50)
      .then(d => setAlerts(d.alerts || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'ALL'
    ? alerts
    : alerts.filter(a => a.status === filter)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600 }}>
            アラート管理 · Alerts
          </h1>
          <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
            Warning and critical event log · 警告・危険イベントログ
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'CRITICAL', 'WARNING'].map(f => (
            <button key={f} className="btn"
                    onClick={() => setFilter(f)}
                    style={{
                      background: filter === f ? '#222840' : 'transparent',
                      color: filter === f ? '#63b3ed' : '#718096',
                      border: `1px solid ${filter === f ? '#63b3ed' : '#2d3748'}`
                    }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        [1,2,3].map(i => (
          <div key={i} className="skeleton"
               style={{ height: '80px', marginBottom: '12px',
                        borderRadius: '12px' }} />
        ))
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center',
                                       padding: '48px', color: '#48bb78' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
          <div style={{ fontWeight: 500 }}>No alerts — All machines normal</div>
          <div className="jp" style={{ color: '#718096', marginTop: '6px' }}>
            アラートなし — すべての機械が正常です
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(alert => (
            <div key={alert.id} className="card"
                 style={{ borderLeft: `4px solid ${STATUS_COLOR[alert.status]}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                            alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>Machine {alert.machine_id}</span>
                  <span style={{ fontSize: '11px',
                                 color: '#718096' }}>機械 {String(alert.machine_id).padStart(3,'0')}</span>
                  <div>
                    <span className={`badge badge-${alert.status.toLowerCase()}`}>
                      {alert.status}
                    </span>
                    <span style={{ fontSize: '10px', marginLeft: '6px',
                                   color: STATUS_COLOR[alert.status],
                                   fontFamily: 'Noto Sans JP' }}>
                      {STATUS_JP[alert.status]}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px',
                              color: '#718096' }}>
                  <div>{alert.timestamp?.replace('T', ' ').slice(0, 19)}</div>
                  <div className="jp">JST</div>
                </div>
              </div>
              <div style={{ fontSize: '13px', color: '#a0aec0' }}>
                {alert.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}