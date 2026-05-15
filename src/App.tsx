import { useEffect, useMemo, useState } from 'react'

type PageId = 'home' | 'pricing' | 'download' | 'login' | 'dashboard' | 'changelog' | 'admin'
type User = { id: number; email: string; created_at?: string }
type License = {
  id?: number
  key: string
  plan_id: string
  status: string
  expires_at: string | null
  premium: boolean
  hwid?: string | null
  created_at?: string | null
  last_verified_at?: string | null
  is_active?: boolean
}

type HwidRequest = {
  id: number
  license_id?: number | null
  license_key?: string | null
  plan_id?: string | null
  email?: string | null
  reason?: string | null
  status: string
  created_at: string
  reviewed_at?: string | null
}

type AdminData = {
  users: Array<{ id: number; email: string; created_at: string; license_count?: number }>
  licenses: Array<{ id: number; key: string; email?: string | null; plan_id: string; status: string; hwid?: string | null; expires_at?: string | null; premium: boolean; created_at: string }>
  hwidRequests: HwidRequest[]
}

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

function formatDate(value?: string | null) {
  if (!value) return 'Lifetime'
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function maskKey(key: string) {
  if (!key) return 'None'
  return `${key.slice(0, 12)}••••${key.slice(-7)}`
}

function App() {
  const [page, setPage] = useState<PageId>('home')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [licenseKey, setLicenseKey] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [token, setToken] = useState(localStorage.getItem('eqy_token') || '')
  const [user, setUser] = useState<User | null>(null)
  const [licenses, setLicenses] = useState<License[]>([])
  const [message, setMessage] = useState('')
  const [loginRequiredPopup, setLoginRequiredPopup] = useState(false)
  const [licenseRequiredPopup, setLicenseRequiredPopup] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hwidPopup, setHwidPopup] = useState(false)
  const [hwidReason, setHwidReason] = useState('')
  const [hwidRequests, setHwidRequests] = useState<HwidRequest[]>([])
  const [adminSecret, setAdminSecret] = useState('')
  const [adminToken, setAdminToken] = useState(localStorage.getItem('eqy_admin_token') || '')
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [adminBusy, setAdminBusy] = useState(false)
  const [adminCreateEmail, setAdminCreateEmail] = useState('')
  const [adminCreateDays, setAdminCreateDays] = useState('')
  const [adminCreatePremium, setAdminCreatePremium] = useState(false)

  const isLoggedIn = Boolean(token && user)
  const activeLicenses = licenses.filter((license) => license.is_active ?? (license.status === 'active' && (!license.expires_at || new Date(license.expires_at) > new Date())))
  const primaryLicense = activeLicenses[0] || licenses[0]
  const premiumUnlocked = activeLicenses.some((license) => license.premium)
  const memberTier = premiumUnlocked ? 'Premium Member' : activeLicenses.length ? 'Standard Member' : 'Free Account'
  const passwordStrength = newPassword.length >= 12 ? 'Strong' : newPassword.length >= 8 ? 'Good' : newPassword.length >= 1 ? 'Weak' : 'None'

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
      setHwidRequests(data.hwidRequests || [])
    } catch {
      localStorage.removeItem('eqy_token')
      setToken('')
      setUser(null)
      setLicenses([])
      setHwidRequests([])
    }
  }

  useEffect(() => {
    void loadMe()
  }, [token])

  useEffect(() => {
    if (window.location.pathname === '/admin') setPage('admin')
  }, [])

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
    setHwidRequests([])
    setPage('home')
  }

  const startCheckout = async (planId: string) => {
    requireLoginAction(async () => {
      try {
        const data = await api('/api/paypal/create-order', {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ planId }),
        })

        if (!data?.approvalUrl) {
          throw new Error('PayPal approval URL missing.')
        }

        window.location.href = data.approvalUrl
      } catch (e) {
        console.error(e)
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

  const activateLicense = async () => {
    requireLoginAction(async () => {
      if (!licenseKey.trim()) { setMessage('Enter a license key first.'); return }
      setBusy(true)
      try {
        const data = await api('/api/license/activate', { method: 'POST', headers: authHeaders, body: JSON.stringify({ key: licenseKey }) })
        setMessage(data.message || 'License activated successfully.')
        setLicenseKey('')
        await loadMe()
      } catch (e) { setMessage((e as Error).message) } finally { setBusy(false) }
    })
  }

  const changePassword = async () => {
    if (!currentPassword || !newPassword) { setMessage('Fill current and new password.'); return }
    if (newPassword.length < 6) { setMessage('New password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setMessage('Password confirmation does not match.'); return }
    setBusy(true)
    try {
      await api('/api/auth/change-password', { method: 'POST', headers: authHeaders, body: JSON.stringify({ currentPassword, newPassword }) })
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordOpen(false)
      setMessage('Password updated successfully.')
    } catch (e) { setMessage((e as Error).message) } finally { setBusy(false) }
  }

  const protectedDownload = async (kind: 'exe' | 'msi') => {
    requireLoginAction(async () => {
      try {
        const res = await fetch(`${API_URL}/api/download/${kind}?token=${encodeURIComponent(token)}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          if (res.status === 403 || String(data.error || '').toLowerCase().includes('license')) { setLicenseRequiredPopup(true); return }
          setMessage(data.error || 'Download failed.'); return
        }
        const blob = await res.blob()
        const href = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = href
        a.download = kind === 'msi' ? 'eqy-tweak-installer.msi' : 'eqy-tweak-setup.exe'
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(href)
      } catch (e) { setMessage((e as Error).message) }
    })
  }

  const requestHwidReset = async () => {
    if (!primaryLicense?.key) { setMessage('No license selected.'); return }
    try {
      await api('/api/license/hwid-reset-request', { method: 'POST', headers: authHeaders, body: JSON.stringify({ key: primaryLicense.key, reason: hwidReason || 'Requested from account dashboard.' }) })
      setMessage('HWID reset request sent. You can track the status in your dashboard.')
      setHwidReason('')
      setHwidPopup(false)
      await loadMe()
    } catch (e) { setMessage((e as Error).message) }
  }


  const adminHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  }), [adminToken])

  const adminLogin = async () => {
    setAdminBusy(true)
    try {
      const data = await api('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: adminSecret }),
      })
      localStorage.setItem('eqy_admin_token', data.token)
      setAdminToken(data.token)
      setAdminSecret('')
      setMessage('Admin unlocked.')
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setAdminBusy(false)
    }
  }

  const adminLogout = () => {
    localStorage.removeItem('eqy_admin_token')
    setAdminToken('')
    setAdminData(null)
  }

  const loadAdmin = async () => {
    if (!adminToken) return
    setAdminBusy(true)
    try {
      const data = await api('/api/admin/overview', { headers: adminHeaders })
      setAdminData(data)
    } catch (e) {
      setMessage((e as Error).message)
      if (String((e as Error).message).toLowerCase().includes('admin')) adminLogout()
    } finally {
      setAdminBusy(false)
    }
  }

  useEffect(() => {
    if (page === 'admin' && adminToken) void loadAdmin()
  }, [page, adminToken])

  const adminAction = async (path: string, body: Record<string, unknown> = {}) => {
    setAdminBusy(true)
    try {
      const data = await api(path, { method: 'POST', headers: adminHeaders, body: JSON.stringify(body) })
      setMessage(data.message || 'Admin action completed.')
      await loadAdmin()
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setAdminBusy(false)
    }
  }

  const adminCreateLicense = async () => {
    await adminAction('/api/admin/licenses/create', {
      email: adminCreateEmail || null,
      days: adminCreateDays ? Number(adminCreateDays) : null,
      premium: adminCreatePremium,
    })
    setAdminCreateEmail('')
    setAdminCreateDays('')
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
                  <button onClick={() => setPage('download')} className="eqy-v5-ghost">▷ See It In Action</button>
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
          <section className="eqy-v5-page eqy-account-page">
            <div className="eqy-account-hero">
              <div>
                <div className="eqy-v5-kicker">ACCOUNT COMMAND CENTER</div>
                <h2>Welcome back,<br />{user?.email?.split('@')[0] || 'Operator'}</h2>
                <p>Manage your EQY license, protected downloads, account security, HWID status and premium benefits from one cinematic dashboard.</p>
                <div className="eqy-account-badges">
                  <span>{memberTier}</span>
                  <span>{activeLicenses.length ? 'License Active' : 'No Active License'}</span>
                  <span>{primaryLicense?.hwid ? 'HWID Bound' : 'HWID Ready'}</span>
                </div>
              </div>
              <div className="eqy-account-orb">
                <span>EQY STATUS</span>
                <strong>{activeLicenses.length ? 'ON' : 'OFF'}</strong>
                <em>{premiumUnlocked ? 'Premium Access' : activeLicenses.length ? 'Standard Access' : 'Free Account'}</em>
              </div>
            </div>

            <div className="eqy-account-grid">
              <div className="eqy-account-card">
                <div className="eqy-card-head"><span>License Overview</span><em>{primaryLicense?.status || 'inactive'}</em></div>
                <h3>{primaryLicense ? maskKey(primaryLicense.key) : 'No license connected'}</h3>
                <p>{primaryLicense ? `${primaryLicense.plan_id} • Expires: ${formatDate(primaryLicense.expires_at)}` : 'Buy a plan or activate an existing key to unlock protected downloads.'}</p>
                <div className="eqy-license-meter"><i style={{ width: activeLicenses.length ? '100%' : '18%' }} /></div>
                <div className="eqy-license-stats">
                  <div><span>Plan</span><strong>{primaryLicense?.plan_id || 'None'}</strong></div>
                  <div><span>Expires</span><strong>{formatDate(primaryLicense?.expires_at)}</strong></div>
                  <div><span>HWID</span><strong>{primaryLicense?.hwid ? 'Bound' : 'Not bound'}</strong></div>
                  <div><span>Premium</span><strong>{premiumUnlocked ? 'Unlocked' : 'Locked'}</strong></div>
                </div>
              </div>

              <div className="eqy-account-card">
                <div className="eqy-card-head"><span>Activate License</span><em>Manual Key</em></div>
                <h3>Connect a key</h3>
                <p>Already bought or received a license? Activate it here and it will appear in your account.</p>
                <div className="eqy-input-row">
                  <input value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} placeholder="EQY-XXXX-XXXX-XXXX" />
                  <button disabled={busy} onClick={() => void activateLicense()} className="eqy-v5-primary">Activate</button>
                </div>
              </div>

              <div className="eqy-account-card">
                <div className="eqy-card-head"><span>Account Security</span><em>Protected</em></div>
                <h3>{user?.email || 'Not logged in'}</h3>
                <p>Change your password anytime. Use a strong unique password to protect purchases and license access.</p>
                <div className="eqy-dashboard-buttons">
                  <button onClick={() => setPasswordOpen(!passwordOpen)} className="eqy-v5-primary">Change Password</button>
                  <button onClick={logout} className="eqy-v5-ghost">Logout</button>
                </div>
                {passwordOpen && (
                  <div className="eqy-password-panel">
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" />
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" />
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
                    <div className={`eqy-strength ${passwordStrength.toLowerCase()}`}><i /></div>
                    <button disabled={busy} onClick={() => void changePassword()} className="eqy-v5-primary">Update Password</button>
                  </div>
                )}
              </div>
            </div>

            <div className="eqy-account-wide">
              <div className="eqy-account-card">
                <div className="eqy-card-head"><span>Protected Downloads</span><em>0.1.1 Stable</em></div>
                <h3>EQY Tweak Installer</h3>
                <p>Download access is unlocked only for accounts with an active license. Choose the installer format you prefer.</p>
                <div className="eqy-dashboard-buttons">
                  <button onClick={() => void protectedDownload('exe')} className="eqy-v5-primary">Download .EXE</button>
                  <button onClick={() => void protectedDownload('msi')} className="eqy-v5-ghost">Download .MSI</button>
                  <button onClick={() => setPage('changelog')} className="eqy-v5-ghost">Changelog</button>
                </div>
              </div>

              <div className="eqy-account-card">
                <div className="eqy-card-head"><span>Device Control</span><em>{primaryLicense?.hwid ? 'Linked' : 'Ready'}</em></div>
                <h3>{primaryLicense?.hwid ? 'Device authorized' : 'No device linked yet'}</h3>
                <p>{primaryLicense?.last_verified_at ? `Last verification: ${formatDate(primaryLicense.last_verified_at)}` : 'Your HWID binds automatically the first time the desktop app verifies the license.'}</p>
                <div className="eqy-dashboard-buttons">
                  <button onClick={() => setHwidPopup(true)} className="eqy-v5-primary">Request HWID Reset</button>
                  <button onClick={openDiscord} className="eqy-v5-ghost">Support</button>
                </div>
                {hwidRequests.length > 0 && (
                  <div className="eqy-mini-list">
                    <h4>Reset request status</h4>
                    {hwidRequests.slice(0, 3).map((req) => (
                      <div key={req.id}>
                        <strong>{req.status.toUpperCase()}</strong>
                        <span>{req.reason || 'No reason'} • {formatDate(req.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="eqy-account-wide">
              <div className="eqy-account-card">
                <div className="eqy-card-head"><span>Premium Benefits</span><em>{premiumUnlocked ? 'Unlocked' : 'Preview'}</em></div>
                <div className="eqy-benefit-grid">
                  {['FPS Optimization', 'Latency Reduction', 'Memory Cleaner', 'Gaming Profiles', 'Network Boost', 'Premium Updates', 'HWID Protection', 'Priority Support'].map((benefit, index) => (
                    <div key={benefit} className={!activeLicenses.length && index > 2 ? 'locked' : ''}>
                      <span>{index < 3 || activeLicenses.length ? 'ACTIVE' : 'LOCKED'}</span>
                      <strong>{benefit}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="eqy-account-card">
                <div className="eqy-card-head"><span>Your Licenses</span><em>{licenses.length}</em></div>
                <div className="eqy-v5-license-list pro">
                  {licenses.length ? licenses.map((license) => (
                    <div key={license.key}>
                      <strong>{license.key}</strong>
                      <span>{license.plan_id} • {license.status} • {formatDate(license.expires_at)}</span>
                    </div>
                  )) : <p>No licenses yet. Buy a plan to generate one automatically.</p>}
                </div>
              </div>
            </div>
          </section>
        )}


        {page === 'admin' && (
          <section className="eqy-v5-page eqy-admin-page">
            <div className="eqy-account-hero">
              <div>
                <div className="eqy-v5-kicker">ADMIN PANEL</div>
                <h2>EQY Admin<br />Command Center</h2>
                <p>Manage users, licenses and HWID reset requests directly from the site. This panel is protected by your Render ADMIN_SECRET.</p>
                <div className="eqy-account-badges">
                  <span>{adminToken ? 'Admin Authenticated' : 'Locked'}</span>
                  <span>HWID Approval</span>
                  <span>License Control</span>
                </div>
              </div>
              <div className="eqy-account-orb">
                <span>ADMIN</span>
                <strong>{adminToken ? 'ON' : 'LOCK'}</strong>
                <em>{adminData ? `${adminData.hwidRequests.filter((r) => r.status === 'pending').length} pending` : 'Secure access'}</em>
              </div>
            </div>

            {!adminToken ? (
              <div className="eqy-v5-auth-wrap">
                <section className="eqy-v5-auth">
                  <div className="eqy-v5-kicker">ADMIN SECRET</div>
                  <h2>Unlock panel</h2>
                  <p>Enter the same password you set in Render as ADMIN_SECRET.</p>
                  <input type="password" value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)} placeholder="ADMIN_SECRET" />
                  <button disabled={adminBusy} onClick={() => void adminLogin()} className="eqy-v5-primary">Enter Admin</button>
                </section>
              </div>
            ) : (
              <>
                <div className="eqy-dashboard-buttons eqy-admin-toolbar">
                  <button disabled={adminBusy} onClick={() => void loadAdmin()} className="eqy-v5-primary">Refresh</button>
                  <button onClick={adminLogout} className="eqy-v5-ghost">Logout Admin</button>
                  <button onClick={() => setPage('dashboard')} className="eqy-v5-ghost">Back to Account</button>
                </div>

                <div className="eqy-account-grid eqy-admin-stats">
                  <div className="eqy-account-card"><div className="eqy-card-head"><span>Users</span><em>Total</em></div><h3>{adminData?.users.length || 0}</h3><p>Registered EQY accounts.</p></div>
                  <div className="eqy-account-card"><div className="eqy-card-head"><span>Licenses</span><em>Total</em></div><h3>{adminData?.licenses.length || 0}</h3><p>Generated and manually created keys.</p></div>
                  <div className="eqy-account-card"><div className="eqy-card-head"><span>HWID Requests</span><em>Pending</em></div><h3>{adminData?.hwidRequests.filter((r) => r.status === 'pending').length || 0}</h3><p>Requests waiting for approval.</p></div>
                </div>

                <div className="eqy-account-wide">
                  <div className="eqy-account-card">
                    <div className="eqy-card-head"><span>HWID Reset Requests</span><em>Approve / Decline</em></div>
                    <div className="eqy-admin-list wide">
                      {adminData?.hwidRequests.length ? adminData.hwidRequests.map((req) => (
                        <div key={req.id}>
                          <strong>{req.email || 'Unknown user'} • {req.status.toUpperCase()}</strong>
                          <span>License: {req.license_key || 'N/A'} • Plan: {req.plan_id || 'N/A'}</span>
                          <span>Reason: {req.reason || 'No reason provided.'}</span>
                          <span>Created: {formatDate(req.created_at)}{req.reviewed_at ? ` • Reviewed: ${formatDate(req.reviewed_at)}` : ''}</span>
                          {req.status === 'pending' && (
                            <section>
                              <button disabled={adminBusy} onClick={() => void adminAction(`/api/admin/hwid-requests/${req.id}/approve`)} className="eqy-v5-primary">Approve + Reset HWID</button>
                              <button disabled={adminBusy} onClick={() => void adminAction(`/api/admin/hwid-requests/${req.id}/decline`)} className="eqy-v5-ghost">Decline</button>
                            </section>
                          )}
                        </div>
                      )) : <p>No HWID requests yet.</p>}
                    </div>
                  </div>

                  <div className="eqy-account-card">
                    <div className="eqy-card-head"><span>Create License</span><em>Manual</em></div>
                    <h3>Generate key</h3>
                    <p>Create a license manually and optionally link it to an existing user email.</p>
                    <div className="eqy-password-panel">
                      <input value={adminCreateEmail} onChange={(e) => setAdminCreateEmail(e.target.value)} placeholder="User email optional" />
                      <select value={adminCreatePremium ? 'premium' : 'standard'} onChange={(e) => setAdminCreatePremium(e.target.value === 'premium')}>
                        <option value="standard">Standard / Non premium</option>
                        <option value="premium">Premium</option>
                      </select>
                      <input
                        value={adminCreateDays}
                        onChange={(e) => setAdminCreateDays(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Days, empty = lifetime"
                        inputMode="numeric"
                      />
                      <p className="eqy-admin-helper">Choose Standard or Premium, then set how many days the license lasts. Leave days empty for lifetime.</p>
                      <button disabled={adminBusy} onClick={() => void adminCreateLicense()} className="eqy-v5-primary">Create License</button>
                    </div>
                  </div>
                </div>

                <div className="eqy-account-wide">
                  <div className="eqy-account-card">
                    <div className="eqy-card-head"><span>Licenses</span><em>{adminData?.licenses.length || 0}</em></div>
                    <div className="eqy-admin-list wide">
                      {adminData?.licenses.map((lic) => (
                        <div key={lic.id}>
                          <strong>{lic.key}</strong>
                          <span>{lic.email || 'Unlinked'} • {lic.plan_id} • {lic.status} • {lic.premium ? 'Premium' : 'Standard'}</span>
                          <span>HWID: {lic.hwid || 'Not bound'} • Expires: {formatDate(lic.expires_at)}</span>
                          <section>
                            <button disabled={adminBusy} onClick={() => void adminAction(`/api/admin/licenses/${lic.id}/reset-hwid`)} className="eqy-v5-ghost">Reset HWID</button>
                            <button disabled={adminBusy} onClick={() => void adminAction(`/api/admin/licenses/${lic.id}/revoke`)} className="eqy-v5-ghost">Revoke</button>
                          </section>
                        </div>
                      )) || <p>No licenses found.</p>}
                    </div>
                  </div>

                  <div className="eqy-account-card">
                    <div className="eqy-card-head"><span>Users</span><em>{adminData?.users.length || 0}</em></div>
                    <div className="eqy-admin-list">
                      {adminData?.users.map((u) => (
                        <div key={u.id}>
                          <strong>{u.email}</strong>
                          <span>ID: {u.id} • Licenses: {u.license_count || 0} • Joined: {formatDate(u.created_at)}</span>
                        </div>
                      )) || <p>No users found.</p>}
                    </div>
                  </div>
                </div>
              </>
            )}
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

      {licenseRequiredPopup && (
        <div className="eqy-v5-modal">
          <div><div className="eqy-v5-kicker">LICENSE REQUIRED</div><h2>Active license needed</h2><p>You need an active EQY license to access protected downloads. Buy a plan or activate an existing license from your dashboard.</p><section><button onClick={() => { setLicenseRequiredPopup(false); setPage('pricing') }} className="eqy-v5-primary">View Plans</button><button onClick={() => setLicenseRequiredPopup(false)} className="eqy-v5-ghost">Close</button></section></div>
        </div>
      )}

      {hwidPopup && (
        <div className="eqy-v5-modal">
          <div><div className="eqy-v5-kicker">HWID RESET</div><h2>Request device reset</h2><p>This sends a reset request for your current license. Use it only when you changed PC or reinstalled Windows.</p><div className="eqy-password-panel"><textarea value={hwidReason} onChange={(e) => setHwidReason(e.target.value)} placeholder="Reason, for example: changed PC, reinstalled Windows, upgraded motherboard..." /></div><section><button onClick={() => void requestHwidReset()} className="eqy-v5-primary">Send Request</button><button onClick={() => setHwidPopup(false)} className="eqy-v5-ghost">Close</button></section></div>
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
