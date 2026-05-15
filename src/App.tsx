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

// New pricing cards matching the screenshot
const pricingCards = [
  {
    id: 'basic',
    name: 'BASIC',
    subtitle: 'Perfect for casual users who want a simple boost.',
    price: '9',
    cents: '99',
    currency: '€',
    features: ['Basic Optimization', 'FPS Boost', 'System Tweaks'],
    cta: 'Buy Basic',
    highlight: false,
    badge: null,
  },
  {
    id: 'standard',
    name: 'STANDARD',
    subtitle: 'Best choice for gamers who want performance.',
    price: '19',
    cents: '99',
    currency: '€',
    features: ['Advanced Optimization', 'FPS Boost', 'Lower Latency', 'System Tweaks', 'Priority Support'],
    cta: 'Buy Standard',
    highlight: true,
    badge: 'MOST POPULAR',
  },
  {
    id: 'premium',
    name: 'PREMIUM',
    subtitle: 'Maximum performance for competitive players.',
    price: '29',
    cents: '99',
    currency: '€',
    features: ['Everything in Standard', 'Extreme Optimization', 'Lowest Latency', 'VIP Support', 'Early Access Updates'],
    cta: 'Buy Premium',
    highlight: false,
    badge: 'BEST VALUE',
  },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  useEffect(() => { void loadMe() }, [token])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paypalToken = params.get('token')
    if (params.get('paypal') === 'success' && paypalToken && token) {
      void capturePayPal(paypalToken)
    }
  }, [token])

  const requireLoginAction = (callback?: () => void) => {
    if (!token) { setLoginRequiredPopup(true); return }
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
      setToken(data.token); setUser(data.user); setPage('dashboard')
      setMessage('Account created successfully.')
    } catch (e) { setMessage((e as Error).message) }
  }

  const login = async () => {
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem('eqy_token', data.token)
      setToken(data.token); setUser(data.user); setPage('dashboard')
      setMessage('Logged in successfully.')
    } catch (e) { setMessage((e as Error).message) }
  }

  const logout = () => {
    localStorage.removeItem('eqy_token')
    setToken(''); setUser(null); setLicenses([]); setPage('home')
  }

  const startCheckout = async (planId: string) => {
    requireLoginAction(async () => {
      try {
        const data = await api('/api/paypal/create-order', {
          method: 'POST', headers: authHeaders, body: JSON.stringify({ planId }),
        })
        window.location.href = data.approvalUrl
      } catch (e) { setMessage((e as Error).message) }
    })
  }

  const capturePayPal = async (orderId: string) => {
    try {
      const data = await api('/api/paypal/capture-order', {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ orderId }),
      })
      setMessage(`Payment complete. License: ${data.license.key}`)
      window.history.replaceState({}, document.title, window.location.pathname)
      await loadMe(); setPage('dashboard')
    } catch (e) { setMessage((e as Error).message) }
  }

  const protectedDownload = (kind: 'exe' | 'msi') => {
    requireLoginAction(() => {
      window.location.href = `${API_URL}/api/download/${kind}?token=${encodeURIComponent(token)}`
    })
  }

  const openDiscord = () => window.open('https://discord.gg/h488P4Qezd', '_blank', 'noopener,noreferrer')

  const navLinks = [
    ['home', 'Home'],
    ['features', 'Features'],
    ['pricing', 'Pricing'],
    ['reviews', 'Reviews'],
    ['faq', 'FAQ'],
    ['contact', 'Contact'],
  ] as const

  return (
    <div className="eqy-root">
      {/* Background layers */}
      <div className="eqy-bg-base" />
      <div className="eqy-bg-planet" />
      <div className="eqy-bg-stars" />
      <div className="eqy-bg-glow" />

      {/* NAV */}
      <header className="eqy-nav">
        <button className="eqy-brand" onClick={() => setPage('home')}>
          <div className="eqy-brand-icon">
            <img src="/eqy-logo.svg" alt="EQY" />
          </div>
          <div className="eqy-brand-text">
            <strong>EQY</strong>
            <span>TWEAK</span>
          </div>
        </button>

        <nav className="eqy-nav-links">
          {navLinks.map(([id, label]) => (
            <button
              key={id}
              className={`eqy-nav-link ${page === id ? 'active' : ''}`}
              onClick={() => setPage(id as PageId)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="eqy-nav-actions">
          <button className="eqy-btn-ghost" onClick={() => setPage(isLoggedIn ? 'dashboard' : 'login')}>
            {isLoggedIn ? 'Dashboard' : 'Sign In'}
          </button>
          <button className="eqy-btn-primary" onClick={() => setPage('pricing')}>
            Get Started
          </button>
        </div>

        <button className="eqy-hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <span /><span /><span />
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="eqy-mobile-menu">
          {navLinks.map(([id, label]) => (
            <button key={id} onClick={() => { setPage(id as PageId); setMobileMenuOpen(false) }}>{label}</button>
          ))}
          <button onClick={() => { setPage(isLoggedIn ? 'dashboard' : 'login'); setMobileMenuOpen(false) }} className="eqy-btn-ghost">Sign In</button>
          <button onClick={() => { setPage('pricing'); setMobileMenuOpen(false) }} className="eqy-btn-primary">Get Started</button>
        </div>
      )}

      <main className="eqy-main">
        {message && (
          <div className="eqy-alert">
            <span>{message}</span>
            <button onClick={() => setMessage('')}>×</button>
          </div>
        )}

        {/* HOME */}
        {page === 'home' && (
          <div className="eqy-page-reveal">
            {/* HERO */}
            <section className="eqy-hero">
              <div className="eqy-hero-content">
                <div className="eqy-hero-badge">PREMIUM WINDOWS OPTIMIZATION</div>
                <h1 className="eqy-hero-title">
                  Unlock Maximum<br />
                  <span className="eqy-hero-accent">Performance.</span>
                </h1>
                <p className="eqy-hero-desc">
                  EQY Tweak is a premium optimization tool that boosts FPS, reduces latency and gives you the competitive edge.
                </p>
                <div className="eqy-hero-btns">
                  <button className="eqy-btn-primary eqy-btn-large" onClick={() => setPage('pricing')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    View Plans
                  </button>
                  <button className="eqy-btn-outline eqy-btn-large" onClick={() => protectedDownload('exe')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                    See It In Action
                  </button>
                </div>

                <div className="eqy-hero-features">
                  <div className="eqy-feature-tag">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1478ff" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    FPS BOOST
                  </div>
                  <div className="eqy-feature-tag">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1478ff" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    LOWER LATENCY
                  </div>
                  <div className="eqy-feature-tag">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1478ff" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                    SYSTEM OPTIMIZATION
                  </div>
                  <div className="eqy-feature-tag">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1478ff" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    EASY TO USE
                  </div>
                </div>
              </div>
            </section>

            {/* STATS BAR */}
            <div className="eqy-stats-bar">
              <div className="eqy-stat">
                <div className="eqy-stat-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1478ff" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                  <strong className="eqy-stat-value">50K+</strong>
                  <span className="eqy-stat-label">Active Users</span>
                </div>
              </div>
              <div className="eqy-stat-divider" />
              <div className="eqy-stat">
                <div className="eqy-stat-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1478ff" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div>
                  <strong className="eqy-stat-value">98%</strong>
                  <span className="eqy-stat-label">Satisfaction Rate</span>
                </div>
              </div>
              <div className="eqy-stat-divider" />
              <div className="eqy-stat">
                <div className="eqy-stat-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1478ff" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                </div>
                <div>
                  <strong className="eqy-stat-value">24/7</strong>
                  <span className="eqy-stat-label">Customer Support</span>
                </div>
              </div>
              <div className="eqy-stat-divider" />
              <div className="eqy-stat">
                <div className="eqy-stat-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1478ff" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div>
                  <strong className="eqy-stat-value">99.9%</strong>
                  <span className="eqy-stat-label">Uptime</span>
                </div>
              </div>
            </div>

            {/* PRICING SECTION on home */}
            <section className="eqy-pricing-section">
              <div className="eqy-section-label">CHOOSE YOUR PLAN</div>
              <h2 className="eqy-section-title">Simple Pricing. Maximum Results.</h2>
              <p className="eqy-section-sub">One-time payment. Lifetime license. No subscriptions.</p>

              <div className="eqy-pricing-grid">
                {pricingCards.map((card) => (
                  <div key={card.id} className={`eqy-price-card ${card.highlight ? 'highlight' : ''}`}>
                    {card.badge && (
                      <div className={`eqy-price-badge ${card.id === 'premium' ? 'badge-corner' : 'badge-top'}`}>
                        {card.id === 'standard' && <svg width="12" height="12" viewBox="0 0 24 24" fill="#facc15" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                        {card.badge}
                      </div>
                    )}

                    <div className="eqy-price-header">
                      <div className="eqy-price-icon">
                        {card.id === 'basic' && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1478ff" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}
                        {card.id === 'standard' && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1478ff" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                        {card.id === 'premium' && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1478ff" strokeWidth="2"><polygon points="6 3 18 3 22 9 12 22 2 9 6 3"/></svg>}
                      </div>
                      <div>
                        <div className="eqy-price-name">{card.name}</div>
                        <div className="eqy-price-sub">{card.subtitle}</div>
                      </div>
                      <div className="eqy-price-amount">
                        <span className="eqy-currency">{card.currency}</span>
                        <span className="eqy-price-num">{card.price}</span>
                        <span className="eqy-cents">.{card.cents}</span>
                      </div>
                    </div>

                    <ul className="eqy-price-features">
                      {card.features.map((f) => (
                        <li key={f}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1478ff" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      className={card.highlight ? 'eqy-btn-primary eqy-btn-full' : 'eqy-btn-outline-card eqy-btn-full'}
                      onClick={() => void startCheckout(card.id === 'basic' ? 'standard_30d' : card.id === 'standard' ? 'standard_60d' : 'premium_30d')}
                    >
                      {card.cta}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* PRICING PAGE */}
        {page === 'pricing' && (
          <section className="eqy-page-reveal eqy-inner-page">
            <div className="eqy-section-label" style={{ textAlign: 'center', marginBottom: 8 }}>LICENSE STORE</div>
            <h2 className="eqy-section-title" style={{ textAlign: 'center' }}>Standard licenses</h2>
            <p className="eqy-section-sub" style={{ textAlign: 'center' }}>Choose the license duration. Login required before checkout.</p>

            <div className="eqy-plan-grid">
              {standardPlans.map((plan, index) => (
                <article key={plan.id} className={`eqy-plan-card ${index === 3 ? 'highlight' : ''}`}>
                  <div className="eqy-plan-top">
                    <span>{plan.name}</span>
                    {index === 3 && <em>VALUE</em>}
                  </div>
                  <strong className="eqy-plan-price">{plan.price}</strong>
                  <p className="eqy-plan-desc">{plan.desc}</p>
                  <ul className="eqy-plan-features">
                    {plan.features.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                  <button className="eqy-btn-primary eqy-btn-full" onClick={() => void startCheckout(plan.id)}>Buy standard</button>
                </article>
              ))}
            </div>

            <div className="eqy-premium-block">
              <div className="eqy-premium-copy">
                <div className="eqy-section-label">PREMIUM SUBSCRIPTION</div>
                <h2 className="eqy-section-title">Unlock the premium tweak layer.</h2>
                <p className="eqy-section-sub">Premium plans unlock restricted optimizations: advanced FPS presets, aggressive latency changes, premium categories and future exclusive modules.</p>
              </div>
              <div className="eqy-premium-grid">
                {premiumPlans.map((plan) => (
                  <article key={plan.id} className="eqy-plan-card">
                    <div className="eqy-plan-top"><span>{plan.name}</span><em>{plan.badge}</em></div>
                    <strong className="eqy-plan-price">{plan.price}</strong>
                    <p className="eqy-plan-desc">{plan.desc}</p>
                    <button className="eqy-btn-primary eqy-btn-full" onClick={() => void startCheckout(plan.id)}>Buy premium</button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* DOWNLOAD */}
        {page === 'download' && (
          <section className="eqy-page-reveal eqy-inner-page eqy-download-page">
            <div>
              <div className="eqy-section-label">DOWNLOAD CENTER</div>
              <h2 className="eqy-section-title">Install the desktop app.</h2>
              <p className="eqy-section-sub">Downloads are protected. Login before downloading the installer.</p>
              <div className="eqy-hero-btns" style={{ marginTop: 32 }}>
                <button className="eqy-btn-primary eqy-btn-large" onClick={() => protectedDownload('exe')}>Download EXE</button>
                <button className="eqy-btn-outline eqy-btn-large" onClick={() => protectedDownload('msi')}>Download MSI</button>
              </div>
            </div>
            <div className="eqy-download-card">
              {[['Version', '0.1.1'], ['Platform', 'Windows x64'], ['Installer', 'EXE + MSI'], ['Updates', 'Signed latest.json']].map(([a, b]) => (
                <div key={a} className="eqy-download-row"><span>{a}</span><strong>{b}</strong></div>
              ))}
            </div>
          </section>
        )}

        {/* LOGIN */}
        {page === 'login' && (
          <section className="eqy-page-reveal eqy-auth-wrap">
            <div className="eqy-auth-card">
              <div className="eqy-section-label" style={{ marginBottom: 16 }}>ACCESS PORTAL</div>
              <h2 className="eqy-auth-title">{isLoggedIn ? 'Account' : 'Login or register'}</h2>
              {isLoggedIn ? (
                <>
                  <p className="eqy-auth-info">Logged in as {user?.email}</p>
                  <button className="eqy-btn-primary eqy-btn-full" onClick={() => setPage('dashboard')}>Open Dashboard</button>
                  <button className="eqy-btn-outline eqy-btn-full" style={{ marginTop: 12 }} onClick={logout}>Logout</button>
                </>
              ) : (
                <>
                  <input className="eqy-input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <input className="eqy-input" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button className="eqy-btn-primary eqy-btn-full" onClick={() => void login()}>Login</button>
                  <button className="eqy-btn-outline eqy-btn-full" onClick={() => void register()}>Register</button>
                </>
              )}
            </div>
          </section>
        )}

        {/* DASHBOARD */}
        {page === 'dashboard' && (
          <section className="eqy-page-reveal eqy-inner-page">
            <div className="eqy-section-label">ACCOUNT</div>
            <h2 className="eqy-section-title">License dashboard</h2>
            <p className="eqy-section-sub">Manage your account, downloads, generated licenses and HWID reset requests.</p>

            <div className="eqy-dash-grid">
              {[['Status', isLoggedIn ? 'Logged in' : 'Guest'], ['Email', user?.email || 'None'], ['Licenses', String(licenses.length)], ['Premium', licenses.some((l) => l.premium) ? 'Unlocked' : 'Locked']].map(([a, b]) => (
                <div key={a} className="eqy-dash-stat">
                  <span className="eqy-dash-label">{a}</span>
                  <strong className="eqy-dash-value">{b}</strong>
                </div>
              ))}
            </div>

            <div className="eqy-license-list">
              {licenses.length ? licenses.map((lic) => (
                <div key={lic.key} className="eqy-license-row">
                  <strong>{lic.key}</strong>
                  <span>{lic.plan_id} • {lic.status} • {lic.expires_at || 'Lifetime'}</span>
                </div>
              )) : <p className="eqy-license-empty">No licenses yet. Buy a plan to generate one automatically.</p>}
            </div>

            <div className="eqy-dash-actions">
              <button className="eqy-btn-primary" onClick={() => setHwidPopup(true)}>Reset HWID</button>
              <button className="eqy-btn-outline" onClick={() => protectedDownload('exe')}>Download app</button>
              <button className="eqy-btn-outline" onClick={openDiscord}>Open Discord</button>
            </div>
          </section>
        )}

        {/* CHANGELOG */}
        {page === 'changelog' && (
          <section className="eqy-page-reveal eqy-inner-page">
            <div className="eqy-section-label">UPDATES</div>
            <h2 className="eqy-section-title">Changelog</h2>
            {['0.2.0 — real login, PayPal checkout, license generation, protected downloads', '0.1.1 — updater signing, admin startup, restore fixes', '0.1.0 — first public desktop release'].map((item) => (
              <div key={item} className="eqy-log-item">{item}</div>
            ))}
          </section>
        )}
      </main>

      {/* MODALS */}
      {loginRequiredPopup && (
        <div className="eqy-modal-overlay">
          <div className="eqy-modal">
            <div className="eqy-section-label" style={{ marginBottom: 16 }}>LOGIN REQUIRED</div>
            <h2 className="eqy-modal-title">You must login first</h2>
            <p className="eqy-modal-desc">Before downloading, buying or opening protected actions, login or create an account.</p>
            <div className="eqy-modal-actions">
              <button className="eqy-btn-primary" onClick={() => { setLoginRequiredPopup(false); setPage('login') }}>Login</button>
              <button className="eqy-btn-outline" onClick={() => setLoginRequiredPopup(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {hwidPopup && (
        <div className="eqy-modal-overlay">
          <div className="eqy-modal">
            <div className="eqy-section-label" style={{ marginBottom: 16 }}>HWID RESET</div>
            <h2 className="eqy-modal-title">Open a Discord ticket</h2>
            <p className="eqy-modal-desc">HWID resets are manual and can only be performed by EQY admins.</p>
            <div className="eqy-modal-actions">
              <button className="eqy-btn-primary" onClick={openDiscord}>Open Discord</button>
              <button className="eqy-btn-outline" onClick={() => setHwidPopup(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <footer className="eqy-footer">
        <span>© 2026 EQY Tweak</span>
        <button onClick={() => setPage('changelog')}>Updates</button>
      </footer>
    </div>
  )
}

export default App
