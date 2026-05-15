import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import { getHistory } from '../api/client'

const MODEL_METRICS = [
  { model: 'Isolation Forest', task: 'Anomaly Detection · 異常検知',
    metric: 'ROC-AUC', value: 0.801, color: '#b794f4' },
  { model: 'XGBoost',          task: 'Failure Classification · 故障分類',
    metric: 'ROC-AUC', value: 0.932, color: '#63b3ed' },
  { model: 'LSTM',             task: 'RUL Prediction · 残余寿命予測',
    metric: 'R²',      value: 0.9516, color: '#48bb78' },
]

export default function Reports() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistory(null, 100)
      .then(d => setHistory(d.records || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const byMachine = [1,2,3,4,5].map(id => {
    const recs = history.filter(r => r.machine_id === id)
    return {
      machine:     `M${id}`,
      predictions: recs.length,
      avg_failure: recs.length > 0
        ? +(recs.reduce((a,r) => a + r.failure_probability, 0)
            / recs.length * 100).toFixed(1)
        : 0,
      critical: recs.filter(r => r.status === 'CRITICAL').length,
      warning:  recs.filter(r => r.status === 'WARNING').length,
    }
  })

  const radarData = [
    { metric: 'Precision', value: 81 },
    { metric: 'Recall',    value: 59 },
    { metric: 'F1',        value: 68 },
    { metric: 'ROC-AUC',   value: 93 },
    { metric: 'PR-AUC',    value: 69 },
  ]

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600 }}>
          分析レポート · Reports
        </h1>
        <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
          Model performance and prediction analytics · モデル性能と予測分析
        </div>
      </div>

      {/* Model performance cards */}
      <div style={{ display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px', marginBottom: '24px' }}>
        {MODEL_METRICS.map(({ model, task, metric, value, color }) => (
          <div key={model} className="card">
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{model}</div>
            <div style={{ fontSize: '11px', color: '#718096',
                          marginBottom: '12px' }}>{task}</div>
            <div style={{ fontSize: '36px', fontWeight: 700,
                          color }}>{value}</div>
            <div style={{ fontSize: '12px', color: '#718096',
                          marginTop: '4px' }}>{metric}</div>
            <div style={{ marginTop: '12px', height: '4px',
                          background: '#2d3748', borderRadius: '4px' }}>
              <div style={{ width: `${value * 100}%`, height: '100%',
                            background: color, borderRadius: '4px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
                    gap: '16px', marginBottom: '24px' }}>

        {/* Bar chart */}
        <div className="card">
          <div style={{ fontWeight: 500, marginBottom: '16px',
                        color: '#a0aec0', fontSize: '13px' }}>
            平均故障確率 · Avg Failure Probability by Machine
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: '200px' }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byMachine}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="machine" stroke="#718096" fontSize={11} />
                <YAxis stroke="#718096" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#1a1f2e',
                                  border: '1px solid #2d3748',
                                  fontSize: '12px' }} />
                <Bar dataKey="avg_failure" radius={[4,4,0,0]}>
                  {byMachine.map((e, i) => (
                    <Cell key={i}
                      fill={e.avg_failure > 50 ? '#fc8181' :
                            e.avg_failure > 20 ? '#f6ad55' : '#48bb78'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Radar chart */}
        <div className="card">
          <div style={{ fontWeight: 500, marginBottom: '16px',
                        color: '#a0aec0', fontSize: '13px' }}>
            XGBoost性能レーダー · XGBoost Performance Radar
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#2d3748" />
              <PolarAngleAxis dataKey="metric" stroke="#718096" fontSize={11} />
              <PolarRadiusAxis angle={30} domain={[0, 100]}
                               stroke="#2d3748" fontSize={10} />
              <Radar name="XGBoost" dataKey="value"
                     stroke="#63b3ed" fill="#63b3ed" fillOpacity={0.2}
                     strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary table */}
      <div className="card">
        <div style={{ fontWeight: 500, marginBottom: '16px',
                      color: '#a0aec0', fontSize: '13px' }}>
          予測サマリー · Prediction Summary
        </div>
        <table>
          <thead>
            <tr>
              {['Machine · 機械', 'Predictions · 予測数',
                'Avg Failure% · 平均故障確率',
                'Critical · 危険', 'Warning · 注意'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byMachine.map(row => (
              <tr key={row.machine}>
                <td style={{ fontWeight: 600 }}>{row.machine}</td>
                <td style={{ color: '#a0aec0' }}>{row.predictions}</td>
                <td style={{ color: row.avg_failure > 50 ? '#fc8181' :
                                    row.avg_failure > 20 ? '#f6ad55' : '#48bb78',
                             fontWeight: 500 }}>
                  {row.avg_failure}%
                </td>
                <td style={{ color: '#fc8181' }}>{row.critical}</td>
                <td style={{ color: '#f6ad55' }}>{row.warning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}