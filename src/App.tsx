import { useEffect, useMemo, useState } from 'react'

type PageId = 'home' | 'pricing' | 'download' | 'login' | 'dashboard' | 'changelog'
type User = { id: number; email: string }
type License = { key: string; plan_id: string; status: string; expires_at: string | null; premium: boolean }

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const standardPlans = [
  { id: 'standard_7d', name: '7D', price: '5€', desc: 'Short standard access.', features: ['Core tweaks', 'Game presets', 'Signed updates'] },
  { id: 'standard_30d', name: '30D', price: '12€', desc: 'Monthly standard license.', features: ['All standard tweaks', 'Download access', 'Support ticket'] },
  { id: 'standard_60d', name: '60D', price: '19€', desc: 'Extended standard access.', features: ['HWID lock', 'Restore prompts', 'Update checks'] },
  { id: 'standard_90d', name: '90D', price: '24€', desc: 'Best standard value.', features: ['Long access', 'Priority queue', 'Device lock'] },
  { id: 'standard_lifetime', name: 'LIFETIME', price: '45€', desc: 'Permanent standard license.', features: ['Lifetime standard', 'Future standard updates', 'Discord support'] },
]

const premiumPlans = [
  { id: 'premium_14d', name: '14D PREMIUM', price: '8€', desc: 'Unlock premium tweaks for 14 days.', badge: 'START' },
  { id: 'premium_30d', name: '30D PREMIUM', price: '14€', desc: 'Monthly premium optimization access.', badge: 'POPULAR' },
  { id: 'premium_lifetime', name: 'LIFETIME PREMIUM', price: '50€', desc: 'Permanent premium tweak access.', badge: 'ELITE' },
]

function App() {
  const [page, setPage] = useState<PageId>('home')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [licenseKey, setLicenseKey] = useState('')
  const [token, setToken] = useState(localStorage.getItem('eqy_token') || '')
  const [user, setUser] = useState<User | null>(null)
  const [licenses, setLicenses] = useState<License[]>([])
  const [message, setMessage] = useState('')
  const [loginRequiredPopup, setLoginRequiredPopup] = useState(false)
  const [hwidPopup, setHwidPopup] = useState(false)

  const isLoggedIn = Boolean(token && user)

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token])

  const api = async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${API_URL}${path}`, options)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Request failed')
    return data
  }

  const loadMe = async () => {
    if (!token) return
    try {
      const data = await api('/api/auth/me', { headers: authHeaders })
      setUser(data.user)
      setLicenses(data.licenses || [])
    } catch {
      localStorage.removeItem('eqy_token')
      setToken('')
      setUser(null)
    }
  }

  useEffect(() => {
    void loadMe()
  }, [token])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paypalToken = params.get('token')
    if (params.get('paypal') === 'success' && paypalToken && token) {
      void capturePayPal(paypalToken)
    }
  }, [token])

  const requireLoginAction = (callback?: () => void) => {
    if (!token) {
      setLoginRequiredPopup(true)
      return
    }
    callback?.()
  }

  const register = async () => {
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem('eqy_token', data.token)
      setToken(data.token)
      setUser(data.user)
      setPage('dashboard')
      setMessage('Account created successfully.')
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  const login = async () => {
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem('eqy_token', data.token)
      setToken(data.token)
      setUser(data.user)
      setPage('dashboard')
      setMessage('Logged in successfully.')
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  const logout = () => {
    localStorage.removeItem('eqy_token')
    setToken('')
    setUser(null)
    setLicenses([])
    setPage('home')
  }

  const startCheckout = async (planId: string) => {
    requireLoginAction(async () => {
      try {
        const data = await api('/api/paypal/create-order', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ planId }),
        })
        window.location.href = data.approvalUrl
      } catch (e) {
        setMessage((e as Error).message)
      }
    })
  }

  const capturePayPal = async (orderId: string) => {
    try {
      const data = await api('/api/paypal/capture-order', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ orderId }),
      })
      setMessage(`Payment complete. License generated: ${data.license.key}`)
      window.history.replaceState({}, document.title, window.location.pathname)
      await loadMe()
      setPage('dashboard')
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  const protectedDownload = (kind: 'exe' | 'msi') => {
    requireLoginAction(() => {
      window.location.href = `${API_URL}/api/download/${kind}?token=${encodeURIComponent(token)}`
    })
  }

  const openDiscord = () => window.open('https://discord.gg/h488P4Qezd', '_blank', 'noopener,noreferrer')

  const nav = [
    ['home', 'Home'],
    ['pricing', 'Pricing'],
    ['download', 'Download'],
    ['login', isLoggedIn ? 'Account' : 'Login'],
    ['changelog', 'Updates'],
  ] as const

  return (
    <div className="min-h-screen overflow-hidden bg-[#02040a] text-white">
      <div className="eqy-v4-scene" />
      <div className="eqy-v4-aurora" />
      <div className="eqy-v4-noise" />

      <header className="eqy-v4-nav">
        <button onClick={() => setPage('home')} className="eqy-v4-brand">
          <img src="/eqy-logo.svg" alt="EQY" />
          <div><strong>EQY</strong><span>OPTIMIZATION OS</span></div>
        </button>

        <nav>
          {nav.map(([id, label]) => (
            <button key={id} onClick={() => setPage(id)} className={page === id ? 'active' : ''}>{label}</button>
          ))}
        </nav>

        <button onClick={() => setPage(isLoggedIn ? 'dashboard' : 'login')} className="eqy-v4-cta">
          {isLoggedIn ? 'Dashboard' : 'Login'}
        </button>
      </header>

      <main className="relative z-10 mx-auto max-w-[1280px] px-6 pb-24 pt-14">
        {message && (
          <div className="eqy-alert">
            <span>{message}</span>
            <button onClick={() => setMessage('')}>×</button>
          </div>
        )}

        {page === 'home' && (
          <section className="eqy-v4-page eqy-v4-hero">
            <div className="eqy-v4-hero-copy">
              <div className="eqy-v4-pill">LIVE CHECKOUT • REAL LOGIN • PROTECTED DOWNLOADS</div>
              <h1>Your PC,<span> tuned like elite hardware.</span></h1>
              <p>
                EQY Tweak now supports real accounts, PayPal checkout, automatic license generation,
                premium access, signed updates and protected downloads.
              </p>
              <div className="eqy-v4-actions">
                <button onClick={() => setPage('pricing')} className="eqy-v4-primary">Explore plans</button>
                <button onClick={() => protectedDownload('exe')} className="eqy-v4-secondary">Download app</button>
              </div>
              <div className="eqy-v4-trust">
                {['PayPal checkout', 'License generation', 'Protected downloads', 'Premium presets'].map((item) => (
                  <div key={item}><span />{item}</div>
                ))}
              </div>
            </div>

            <div className="eqy-v4-showcase">
              <img className="eqy-v4-chip" src="/eqy-logo.svg" alt="" />
              <div className="eqy-product-screen">
                <div className="eqy-product-bar"><span /><span /><span /></div>
                <div className="eqy-product-content">
                  <div className="eqy-system-line"><strong>License</strong><em>{isLoggedIn ? 'Verified' : 'Login required'}</em></div>
                  <div className="eqy-system-line"><strong>Premium</strong><em>{licenses.some((l) => l.premium) ? 'Unlocked' : 'Locked'}</em></div>
                  <div className="eqy-system-line"><strong>Updater</strong><em>Signed</em></div>
                  <div className="eqy-terminal">
                    <p>› account api ready</p>
                    <p>› paypal order flow live</p>
                    <p>› license auto generation</p>
                    <p className="text-emerald-300">› protected download enabled</p>
                  </div>
                </div>
              </div>
              <div className="eqy-v4-glass-card top"><span>ACCESS</span><strong>{isLoggedIn ? user?.email : 'Guest'}</strong></div>
              <div className="eqy-v4-glass-card bottom"><span>STATUS</span><strong>{isLoggedIn ? 'Ready' : 'Login needed'}</strong></div>
            </div>
          </section>
        )}

        {page === 'pricing' && (
          <section className="eqy-v4-page">
            <div className="eqy-v4-section-head">
              <div className="eqy-v4-pill">LICENSE STORE</div>
              <h2>Standard licenses</h2>
              <p>Choose the license duration. Login is required before PayPal checkout.</p>
            </div>

            <div className="eqy-v4-plan-grid">
              {standardPlans.map((plan, index) => (
                <article key={plan.id} className={`eqy-v4-plan ${index === 3 ? 'highlight' : ''}`}>
                  <div className="eqy-v4-plan-top"><span>{plan.name}</span>{index === 3 && <em>VALUE</em>}</div>
                  <strong>{plan.price}</strong>
                  <p>{plan.desc}</p>
                  <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                  <button onClick={() => void startCheckout(plan.id)} className="eqy-v4-primary">Buy standard</button>
                </article>
              ))}
            </div>

            <div className="eqy-v4-premium-block">
              <div className="eqy-v4-premium-copy">
                <div className="eqy-v4-pill">PREMIUM SUBSCRIPTION</div>
                <h2>Unlock the premium tweak layer.</h2>
                <p>Premium plans unlock restricted optimizations inside the app: advanced FPS presets, aggressive latency changes, premium categories and future exclusive modules.</p>
              </div>

              <div className="eqy-v4-premium-plans">
                {premiumPlans.map((plan) => (
                  <article key={plan.id} className="eqy-v4-premium-plan">
                    <div><span>{plan.name}</span><em>{plan.badge}</em></div>
                    <strong>{plan.price}</strong>
                    <p>{plan.desc}</p>
                    <button onClick={() => void startCheckout(plan.id)} className="eqy-v4-primary">Buy premium</button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {page === 'download' && (
          <section className="eqy-v4-page eqy-v4-download">
            <div>
              <div className="eqy-v4-pill">DOWNLOAD CENTER</div>
              <h2>Install the desktop app.</h2>
              <p>Downloads are protected. You must login before downloading the installer.</p>
              <div className="eqy-v4-actions">
                <button onClick={() => protectedDownload('exe')} className="eqy-v4-primary">Download EXE</button>
                <button onClick={() => protectedDownload('msi')} className="eqy-v4-secondary">Download MSI</button>
              </div>
            </div>
            <div className="eqy-v4-download-card">
              {[['Version', '0.1.1'], ['Platform', 'Windows x64'], ['Installer', 'EXE + MSI'], ['Updates', 'Signed latest.json']].map(([a, b]) => (
                <div key={a}><span>{a}</span><strong>{b}</strong></div>
              ))}
            </div>
          </section>
        )}

        {page === 'login' && (
          <section className="eqy-v4-page eqy-v4-auth-wrap">
            <div className="eqy-v4-auth">
              <div className="eqy-v4-pill">ACCESS PORTAL</div>
              <h2>{isLoggedIn ? 'Account' : 'Login or register'}</h2>
              {isLoggedIn ? (
                <>
                  <p>Logged in as {user?.email}</p>
                  <button onClick={() => setPage('dashboard')} className="eqy-v4-primary">Open Dashboard</button>
                  <button onClick={logout} className="eqy-v4-secondary">Logout</button>
                </>
              ) : (
                <>
                  <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button onClick={() => void login()} className="eqy-v4-primary">Login</button>
                  <button onClick={() => void register()} className="eqy-v4-secondary">Register</button>
                </>
              )}
            </div>
          </section>
        )}

        {page === 'dashboard' && (
          <section className="eqy-v4-page">
            <div className="eqy-v4-section-head left">
              <div className="eqy-v4-pill">ACCOUNT</div>
              <h2>License dashboard</h2>
              <p>Manage your account, downloads, generated licenses and HWID reset requests.</p>
            </div>

            <div className="eqy-v4-dashboard">
              {[['Status', isLoggedIn ? 'Logged in' : 'Guest'], ['Email', user?.email || 'None'], ['Licenses', String(licenses.length)], ['Premium', licenses.some((l) => l.premium) ? 'Unlocked' : 'Locked']].map(([a, b]) => (
                <div key={a}><span>{a}</span><strong>{b}</strong></div>
              ))}
            </div>

            <div className="eqy-license-list">
              {licenses.length ? licenses.map((license) => (
                <div key={license.key}>
                  <strong>{license.key}</strong>
                  <span>{license.plan_id} • {license.status} • {license.expires_at || 'Lifetime'}</span>
                </div>
              )) : <p>No licenses yet. Buy a plan to generate one automatically.</p>}
            </div>

            <div className="eqy-v4-dashboard-actions">
              <button onClick={() => setHwidPopup(true)} className="eqy-v4-primary">Reset HWID</button>
              <button onClick={() => protectedDownload('exe')} className="eqy-v4-secondary">Download app</button>
              <button onClick={openDiscord} className="eqy-v4-secondary">Open Discord</button>
            </div>
          </section>
        )}

        {page === 'changelog' && (
          <section className="eqy-v4-page">
            <div className="eqy-v4-section-head left"><div className="eqy-v4-pill">UPDATES</div><h2>Changelog</h2></div>
            {['0.2.0 — real login, PayPal checkout, license generation, protected downloads', '0.1.1 — updater signing, admin startup, restore fixes', '0.1.0 — first public desktop release'].map((item) => (
              <div key={item} className="eqy-v4-log">{item}</div>
            ))}
          </section>
        )}
      </main>

      {loginRequiredPopup && (
        <div className="eqy-v4-modal">
          <div><div className="eqy-v4-pill">LOGIN REQUIRED</div><h2>You must login first</h2><p>Before downloading, buying or opening protected actions, login or create an account.</p><section><button onClick={() => { setLoginRequiredPopup(false); setPage('login') }} className="eqy-v4-primary">Login</button><button onClick={() => setLoginRequiredPopup(false)} className="eqy-v4-secondary">Close</button></section></div>
        </div>
      )}

      {hwidPopup && (
        <div className="eqy-v4-modal">
          <div><div className="eqy-v4-pill">HWID RESET</div><h2>Open a Discord ticket</h2><p>HWID resets are manual and can only be performed by EQY admins.</p><section><button onClick={openDiscord} className="eqy-v4-primary">Open Discord</button><button onClick={() => setHwidPopup(false)} className="eqy-v4-secondary">Close</button></section></div>
        </div>
      )}

      <footer className="relative z-10 mx-auto flex max-w-[1280px] justify-between border-t border-white/10 px-6 py-8 text-xs text-slate-500">
        <span>© 2026 EQY Tweak</span>
        <button onClick={() => setPage('changelog')}>Updates</button>
      </footer>
    </div>
  )
}

export default App
