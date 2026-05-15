import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Dashboard     from './pages/Dashboard'
import MachineDetail from './pages/MachineDetail'
import Alerts        from './pages/Alerts'
import Reports       from './pages/Reports'
import FactoryMap    from './pages/FactoryMap'
import Settings      from './pages/Settings'
import './index.css'

function JSTClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
      setTime(jst.toISOString().slice(11, 19))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div style={{ textAlign: 'right' }}>
      <div className="label-en">JST 日本標準時</div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0',
                    fontVariantNumeric: 'tabular-nums' }}>{time}</div>
    </div>
  )
}

const NAV_ITEMS = [
  { to: '/',         icon: '📊', en: 'Dashboard',     jp: '工場概要'    },
  { to: '/alerts',   icon: '🚨', en: 'Alerts',        jp: 'アラート'    },
  { to: '/reports',  icon: '📈', en: 'Reports',       jp: '分析レポート' },
  { to: '/map',      icon: '🏭', en: 'Factory Map',   jp: '工場マップ'  },
  { to: '/settings', icon: '⚙️', en: 'Settings',      jp: '設定'       },
]

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Top navbar */}
        <nav style={{
          background: '#1a1f2e', borderBottom: '1px solid #2d3748',
          padding: '10px 24px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '15px', fontWeight: 600,
                             color: '#63b3ed' }}>予知保全 AI</span>
              <span style={{ fontSize: '11px', color: '#4a5568',
                             marginLeft: '8px' }}>Predictive Maintenance System</span>
            </div>
            <span style={{ background: '#1a3a2a', color: '#48bb78',
                           fontSize: '10px', padding: '3px 8px',
                           borderRadius: '10px', fontWeight: 600 }}>
              ● LIVE
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <JSTClock />
            <div style={{ background: '#1a2a3a', border: '1px solid #2d4a6a',
                          borderRadius: '6px', padding: '4px 12px',
                          fontSize: '10px', color: '#63b3ed', fontWeight: 500 }}>
              METI DX準拠
            </div>
          </div>
        </nav>

        <div style={{ display: 'flex', flex: 1 }}>

          {/* Sidebar */}
          <aside style={{
            width: '200px', background: '#1a1f2e',
            borderRight: '1px solid #2d3748',
            padding: '16px 12px', display: 'flex',
            flexDirection: 'column', gap: '4px',
            position: 'sticky', top: '53px',
            height: 'calc(100vh - 53px)', overflowY: 'auto'
          }}>
            {NAV_ITEMS.map(({ to, icon, en, jp }) => (
              <NavLink key={to} to={to} end={to === '/'}
                style={({ isActive }) => ({
                  textDecoration: 'none',
                  display: 'block',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  background: isActive ? '#222840' : 'transparent',
                  borderLeft: isActive ? '3px solid #63b3ed' : '3px solid transparent',
                  transition: 'all 0.15s'
                })}>
                <div style={{ fontSize: '12px', color: '#e2e8f0',
                              fontWeight: 500 }}>{icon} {en}</div>
                <div className="label-jp" style={{ marginLeft: '20px' }}>{jp}</div>
              </NavLink>
            ))}

            {/* Sidebar footer */}
            <div style={{ marginTop: 'auto', paddingTop: '16px',
                          borderTop: '1px solid #2d3748',
                          fontSize: '10px', color: '#4a5568',
                          lineHeight: 1.8 }}>
              <div>Connected Industries対応</div>
              <div>中小企業DX推進</div>
              <div style={{ marginTop: '6px', color: '#2d5a3a' }}>
                ● API接続中
              </div>
            </div>
          </aside>

          {/* Page content */}
          <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <Routes>
              <Route path="/"            element={<Dashboard />}     />
              <Route path="/machine/:id" element={<MachineDetail />} />
              <Route path="/alerts"      element={<Alerts />}        />
              <Route path="/reports"     element={<Reports />}       />
              <Route path="/map"         element={<FactoryMap />}    />
              <Route path="/settings"    element={<Settings />}      />
            </Routes>
          </main>
        </div>

        {/* Footer */}
        <footer style={{
          background: '#1a1f2e', borderTop: '1px solid #2d3748',
          padding: '10px 24px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ fontSize: '11px', color: '#4a5568' }}>
            予知保全AIシステム · Predictive Maintenance AI ·
            Built for METI Japan Internship Program
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: '#2d4a6a',
                           background: '#1a2a3a', padding: '2px 8px',
                           borderRadius: '4px' }}>
              METI DX推進プログラム準拠
            </span>
            <span style={{ fontSize: '10px', color: '#2d5a3a',
                           background: '#1a2a1a', padding: '2px 8px',
                           borderRadius: '4px' }}>
              Connected Industries対応
            </span>
          </div>
        </footer>

      </div>
    </BrowserRouter>
  )
}