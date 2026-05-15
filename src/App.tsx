import { useEffect, useMemo, useState } from 'react'

type PageId = 'home' | 'pricing' | 'download' | 'login' | 'dashboard' | 'changelog'
type User = { id: number; email: string }
type License = { key: string; plan_id: string; status: string; expires_at: string | null; premium: boolean }

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const standardPlans = [
  { id: 'standard_7d', name: 'BASIC', duration: '7D', price: '5€', cents: '', desc: 'Short standard access.', icon: '◇', features: ['Core tweaks', 'Game presets', 'Signed updates'] },
  { id: 'standard_30d', name: 'STANDARD', duration: '30D', price: '12€', cents: '', desc: 'Monthly standard license.', icon: '⌁', features: ['All standard tweaks', 'Download access', 'Support ticket'] },
  { id: 'standard_60d', name: 'EXTENDED', duration: '60D', price: '19€', cents: '', desc: 'Extended standard access.', icon: '✦', features: ['HWID lock', 'Restore prompts', 'Update checks'] },
  { id: 'standard_90d', name: 'PRO', duration: '90D', price: '24€', cents: '', desc: 'Best standard value.', icon: '✧', features: ['Long access', 'Priority queue', 'Device lock'] },
  { id: 'standard_lifetime', name: 'LIFETIME', duration: 'LIFETIME', price: '45€', cents: '', desc: 'Permanent standard license.', icon: '◆', features: ['Lifetime standard', 'Future standard updates', 'Discord support'] },
]

const premiumPlans = [
  { id: 'premium_14d', name: '14D PREMIUM', price: '8€', desc: 'Unlock premium tweaks for 14 days.', badge: 'START' },
  { id: 'premium_30d', name: '30D PREMIUM', price: '14€', desc: 'Monthly premium optimization access.', badge: 'POPULAR' },
  { id: 'premium_lifetime', name: 'LIFETIME PREMIUM', price: '50€', desc: 'Permanent premium tweak access.', badge: 'ELITE' },
]

const stats = [
  ['♙', '50K+', 'Active Users'],
  ['⊕', '98%', 'Satisfaction Rate'],
  ['⚙', '24/7', 'Customer Support'],
  ['◌', '99.9%', 'Uptime'],
]

function App() {
  const [page, setPage] = useState<PageId>('home')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  const PriceCard = ({ plan, index, compact = false }: { plan: typeof standardPlans[number]; index: number; compact?: boolean }) => (
    <article className={`eqy-v5-plan ${index === 1 || index === 3 ? 'featured' : ''} ${compact ? 'compact' : ''}`}>
      {(index === 1 || index === 3) && <div className="eqy-v5-popular">MOST POPULAR</div>}
      <div className="eqy-v5-plan-head">
        <div>
          <span className="eqy-v5-plan-icon">{plan.icon}</span>
          <h3>{compact ? plan.name : plan.duration}</h3>
          <p>{plan.desc}</p>
        </div>
        <strong>{plan.price}</strong>
      </div>
      <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
      <button onClick={() => void startCheckout(plan.id)} className={index === 1 || index === 3 ? 'eqy-v5-primary' : 'eqy-v5-outline'}>
        Buy {compact ? plan.name.toLowerCase() : 'standard'}
      </button>
    </article>
  )

  return (
    <div className="eqy-v5-root">
      <div className="eqy-v5-bg" />
      <div className="eqy-v5-stars" />
      <div className="eqy-v5-vignette" />

      <header className="eqy-v5-nav">
        <button onClick={() => setPage('home')} className="eqy-v5-brand">
          <img src="/eqy-logo.svg" alt="EQY" />
          <div><strong>EQY</strong><span>TWEAK</span></div>
        </button>

        <nav>
          {nav.map(([id, label]) => (
            <button key={id} onClick={() => setPage(id)} className={page === id ? 'active' : ''}>{label}</button>
          ))}
        </nav>

        <div className="eqy-v5-nav-actions">
          {!isLoggedIn && <button onClick={() => setPage('login')} className="eqy-v5-sign">Sign In</button>}
          <button onClick={() => setPage(isLoggedIn ? 'dashboard' : 'login')} className="eqy-v5-cta">
            {isLoggedIn ? 'Dashboard' : 'Get Started'}
          </button>
        </div>
      </header>

      <main className="eqy-v5-main">
        {message && (
          <div className="eqy-v5-alert">
            <span>{message}</span>
            <button onClick={() => setMessage('')}>×</button>
          </div>
        )}

        {page === 'home' && (
          <section className="eqy-v5-page">
            <div className="eqy-v5-hero">
              <div className="eqy-v5-hero-copy">
                <div className="eqy-v5-kicker">PREMIUM WINDOWS OPTIMIZATION</div>
                <h1>Unlock Maximum <span>Performance.</span></h1>
                <p>EQY Tweak is a premium optimization tool that boosts FPS, reduces latency and gives you the competitive edge.</p>
                <div className="eqy-v5-actions">
                  <button onClick={() => setPage('pricing')} className="eqy-v5-primary">↯ View Plans</button>
                  <button onClick={() => protectedDownload('exe')} className="eqy-v5-ghost">▷ See It In Action</button>
                </div>
                <div className="eqy-v5-feature-row">
                  {['FPS BOOST', 'LOWER LATENCY', 'SYSTEM OPTIMIZATION', 'EASY TO USE'].map((item, idx) => (
                    <span key={item}><i>{['↗', '⌁', '✹', '◈'][idx]}</i>{item}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="eqy-v5-stats">
              {stats.map(([icon, value, label]) => (
                <div key={label}><span>{icon}</span><strong>{value}</strong><p>{label}</p></div>
              ))}
            </div>

            <section className="eqy-v5-pricing-preview">
              <div className="eqy-v5-section-title">
                <span>CHOOSE YOUR PLAN</span>
                <h2>Simple Pricing. Maximum Results.</h2>
                <p>One-time payment. Lifetime license. No subscriptions.</p>
              </div>
              <div className="eqy-v5-preview-grid">
                {standardPlans.slice(0, 3).map((plan, index) => <PriceCard key={plan.id} plan={plan} index={index} compact />)}
              </div>
            </section>
          </section>
        )}

        {page === 'pricing' && (
          <section className="eqy-v5-page eqy-v5-pricing-page">
            <div className="eqy-v5-section-title">
              <span>LICENSE STORE</span>
              <h2>Standard licenses</h2>
              <p>Choose the license duration. Login is required before PayPal checkout.</p>
            </div>
            <div className="eqy-v5-plan-grid">
              {standardPlans.map((plan, index) => <PriceCard key={plan.id} plan={plan} index={index} />)}
            </div>
            <div className="eqy-v5-premium-block">
              <div className="eqy-v5-section-title left">
                <span>PREMIUM SUBSCRIPTION</span>
                <h2>Unlock the premium tweak layer.</h2>
                <p>Premium plans unlock restricted optimizations inside the app: advanced FPS presets, aggressive latency changes, premium categories and future exclusive modules.</p>
              </div>
              <div className="eqy-v5-premium-grid">
                {premiumPlans.map((plan) => (
                  <article key={plan.id} className="eqy-v5-premium-plan">
                    <div><span>{plan.name}</span><em>{plan.badge}</em></div>
                    <strong>{plan.price}</strong>
                    <p>{plan.desc}</p>
                    <button onClick={() => void startCheckout(plan.id)} className="eqy-v5-primary">Buy premium</button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {page === 'download' && (
          <section className="eqy-v5-page eqy-v5-download">
            <div>
              <div className="eqy-v5-kicker">DOWNLOAD CENTER</div>
              <h2>Install the desktop app.</h2>
              <p>Downloads are protected. You must login before downloading the installer.</p>
              <div className="eqy-v5-actions">
                <button onClick={() => protectedDownload('exe')} className="eqy-v5-primary">Download EXE</button>
                <button onClick={() => protectedDownload('msi')} className="eqy-v5-ghost">Download MSI</button>
              </div>
            </div>
            <div className="eqy-v5-info-card">
              {[['Version', '0.1.1'], ['Platform', 'Windows x64'], ['Installer', 'EXE + MSI'], ['Updates', 'Signed latest.json']].map(([a, b]) => (
                <div key={a}><span>{a}</span><strong>{b}</strong></div>
              ))}
            </div>
          </section>
        )}

        {page === 'login' && (
          <section className="eqy-v5-page eqy-v5-auth-wrap">
            <div className="eqy-v5-auth">
              <div className="eqy-v5-kicker">ACCESS PORTAL</div>
              <h2>{isLoggedIn ? 'Account' : 'Login or register'}</h2>
              {isLoggedIn ? (
                <>
                  <p>Logged in as {user?.email}</p>
                  <button onClick={() => setPage('dashboard')} className="eqy-v5-primary">Open Dashboard</button>
                  <button onClick={logout} className="eqy-v5-ghost">Logout</button>
                </>
              ) : (
                <>
                  <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button onClick={() => void login()} className="eqy-v5-primary">Login</button>
                  <button onClick={() => void register()} className="eqy-v5-ghost">Register</button>
                </>
              )}
            </div>
          </section>
        )}

        {page === 'dashboard' && (
          <section className="eqy-v5-page">
            <div className="eqy-v5-section-title left">
              <span>ACCOUNT</span>
              <h2>License dashboard</h2>
              <p>Manage your account, downloads, generated licenses and HWID reset requests.</p>
            </div>
            <div className="eqy-v5-dashboard">
              {[['Status', isLoggedIn ? 'Logged in' : 'Guest'], ['Email', user?.email || 'None'], ['Licenses', String(licenses.length)], ['Premium', licenses.some((l) => l.premium) ? 'Unlocked' : 'Locked']].map(([a, b]) => (
                <div key={a}><span>{a}</span><strong>{b}</strong></div>
              ))}
            </div>
            <div className="eqy-v5-license-list">
              {licenses.length ? licenses.map((license) => (
                <div key={license.key}>
                  <strong>{license.key}</strong>
                  <span>{license.plan_id} • {license.status} • {license.expires_at || 'Lifetime'}</span>
                </div>
              )) : <p>No licenses yet. Buy a plan to generate one automatically.</p>}
            </div>
            <div className="eqy-v5-dashboard-actions">
              <button onClick={() => setHwidPopup(true)} className="eqy-v5-primary">Reset HWID</button>
              <button onClick={() => protectedDownload('exe')} className="eqy-v5-ghost">Download app</button>
              <button onClick={openDiscord} className="eqy-v5-ghost">Open Discord</button>
            </div>
          </section>
        )}

        {page === 'changelog' && (
          <section className="eqy-v5-page">
            <div className="eqy-v5-section-title left"><span>UPDATES</span><h2>Changelog</h2></div>
            {['0.2.0 — real login, PayPal checkout, license generation, protected downloads', '0.1.1 — updater signing, admin startup, restore fixes', '0.1.0 — first public desktop release'].map((item) => (
              <div key={item} className="eqy-v5-log">{item}</div>
            ))}
          </section>
        )}
      </main>

      {loginRequiredPopup && (
        <div className="eqy-v5-modal">
          <div><div className="eqy-v5-kicker">LOGIN REQUIRED</div><h2>You must login first</h2><p>Before downloading, buying or opening protected actions, login or create an account.</p><section><button onClick={() => { setLoginRequiredPopup(false); setPage('login') }} className="eqy-v5-primary">Login</button><button onClick={() => setLoginRequiredPopup(false)} className="eqy-v5-ghost">Close</button></section></div>
        </div>
      )}

      {hwidPopup && (
        <div className="eqy-v5-modal">
          <div><div className="eqy-v5-kicker">HWID RESET</div><h2>Open a Discord ticket</h2><p>HWID resets are manual and can only be performed by EQY admins.</p><section><button onClick={openDiscord} className="eqy-v5-primary">Open Discord</button><button onClick={() => setHwidPopup(false)} className="eqy-v5-ghost">Close</button></section></div>
        </div>
      )}

      <footer className="eqy-v5-footer">
        <span>© 2026 EQY Tweak</span>
        <button onClick={() => setPage('changelog')}>Updates</button>
      </footer>
    </div>
  )
}

export default App
