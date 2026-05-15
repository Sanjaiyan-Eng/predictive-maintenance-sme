import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area
} from 'recharts'
import { getDemoPredict, getHistory } from '../api/client'

const STATUS_COLOR = { CRITICAL: '#fc8181', WARNING: '#f6ad55', NORMAL: '#48bb78' }
const STATUS_JP    = { CRITICAL: '危険', WARNING: '注意', NORMAL: '正常' }

export default function MachineDetail() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const [data,    setData]    = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getDemoPredict(parseInt(id)),
      getHistory(parseInt(id), 30)
    ]).then(([pred, hist]) => {
      setData(pred)
      setHistory(hist.records || [])
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ padding: '40px' }}>
      {[1,2,3].map(i => (
        <div key={i} className="skeleton"
             style={{ height: '80px', marginBottom: '16px', borderRadius: '12px' }} />
      ))}
    </div>
  )

  const status = data?.status || 'NORMAL'
  const color  = STATUS_COLOR[status]

  const chartData = history.map((r, i) => ({
    index:        i + 1,
    failure_prob: +(r.failure_probability * 100).toFixed(1),
    anomaly:      +(r.anomaly_score).toFixed(3)
  }))

  const metrics = [
    {
      en: 'Failure Probability', jp: '故障確率',
      val: `${(data?.failure_probability * 100).toFixed(1)}%`,
      col: data?.failure_probability > 0.5 ? '#fc8181' : '#48bb78'
    },
    {
      en: 'Anomaly Score', jp: '異常スコア',
      val: data?.anomaly_score?.toFixed(3),
      col: data?.is_anomaly ? '#fc8181' : '#48bb78'
    },
    {
      en: 'Remaining Useful Life', jp: '残余耐用寿命',
      val: data?.rul_cycles !== null ? `${data?.rul_cycles} cycles` : 'N/A',
      col: data?.rul_cycles < 50 ? '#fc8181' :
           data?.rul_cycles < 150 ? '#f6ad55' : '#48bb78'
    },
    {
      en: 'Anomaly Detected', jp: '異常検知',
      val: data?.is_anomaly ? '異常あり · Yes' : '正常 · No',
      col: data?.is_anomaly ? '#fc8181' : '#48bb78'
    }
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center',
                    gap: '16px', marginBottom: '24px' }}>
        <button className="btn btn-secondary"
                onClick={() => navigate('/')}>← Back</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600 }}>
            Machine {id} — 機械 {String(id).padStart(3, '0')}
          </h1>
          <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>
            詳細診断 · Detailed diagnostics
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={`badge badge-${status.toLowerCase()}`}
               style={{ fontSize: '12px', padding: '5px 14px' }}>
            {status}
          </div>
          <div style={{ fontSize: '12px', color, marginTop: '4px',
                        fontFamily: 'Noto Sans JP, sans-serif' }}>
            {STATUS_JP[status]}
          </div>
        </div>
      </div>

      {/* Alert banner */}
      {status !== 'NORMAL' && (
        <div style={{
          background: status === 'CRITICAL' ? '#3a1a1a' : '#3a2a1a',
          border: `1px solid ${color}`, borderRadius: '10px',
          padding: '14px 18px', marginBottom: '24px', color
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            ⚠️ {data?.recommended_action}
          </div>
          <div className="jp" style={{ fontSize: '12px', opacity: 0.8 }}>
            {status === 'CRITICAL'
              ? '即時点検が必要です。機械を停止して検査してください。'
              : '異常が検出されました。1週間以内に点検を予約してください。'}
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '12px', marginBottom: '24px' }}>
        {metrics.map(({ en, jp, val, col }) => (
          <div key={en} className="card">
            <div className="label-en">{en}</div>
            <div className="label-jp">{jp}</div>
            <div style={{ fontSize: '24px', fontWeight: 600,
                          color: col, margin: '10px 0' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
                      gap: '16px', marginBottom: '24px' }}>
          <div className="card">
            <div style={{ fontWeight: 500, marginBottom: '16px',
                          color: '#a0aec0', fontSize: '13px' }}>
              故障確率推移 · Failure Probability History
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="index" stroke="#718096" fontSize={11} />
                <YAxis stroke="#718096" fontSize={11} unit="%" />
                <Tooltip contentStyle={{ background: '#1a1f2e',
                                         border: '1px solid #2d3748',
                                         fontSize: '12px' }} />
                <ReferenceLine y={77} stroke="#fc8181"
                               strokeDasharray="4 4" />
                <Area type="monotone" dataKey="failure_prob"
                      stroke="#63b3ed" fill="#1a2a4a"
                      strokeWidth={2} name="Failure %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div style={{ fontWeight: 500, marginBottom: '16px',
                          color: '#a0aec0', fontSize: '13px' }}>
              異常スコア推移 · Anomaly Score History
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="index" stroke="#718096" fontSize={11} />
                <YAxis stroke="#718096" fontSize={11} />
                <Tooltip contentStyle={{ background: '#1a1f2e',
                                         border: '1px solid #2d3748',
                                         fontSize: '12px' }} />
                <Line type="monotone" dataKey="anomaly"
                      stroke="#b794f4" strokeWidth={2}
                      dot={false} name="Anomaly score" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Models used */}
      <div className="card">
        <div style={{ fontWeight: 500, marginBottom: '12px',
                      color: '#a0aec0', fontSize: '13px' }}>
          使用モデル · Models Used
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap',
                      marginBottom: '12px' }}>
          {Object.entries(data?.models_used || {}).map(([k, v]) => (
            <div key={k} style={{ background: '#222840', borderRadius: '8px',
                                   padding: '8px 14px', fontSize: '12px' }}>
              <span style={{ color: '#718096' }}>{k}: </span>
              <span style={{ color: '#63b3ed', fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '11px', color: '#4a5568' }}>
          Threshold: {data?.threshold_used} ·
          Timestamp: {data?.timestamp?.replace('T', ' ').slice(0, 19)} JST
        </div>
      </div>
    </div>
  )
}