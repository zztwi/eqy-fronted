import { useEffect, useMemo, useState } from 'react'

type PageId = 'home' | 'pricing' | 'download' | 'login' | 'dashboard' | 'admin' | 'changelog'

type User = {
  id: number
  email: string
  created_at?: string
}

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
  email?: string | null
}

type HwidRequest = {
  id: number
  reason: string
  status: string
  admin_note?: string | null
  reviewed_at?: string | null
  created_at: string
  key: string
  plan_id: string
  email?: string
  license_id?: number
  hwid?: string | null
}

type AdminOverview = {
  users: number
  licenses: number
  pendingHwidRequests: number
  paidRevenue: number
}

type AdminUser = {
  id: number
  email: string
  created_at: string
  licenses_count: number
  active_licenses: number
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const standardPlans = [
  { id: 'standard_7d', name: 'BASIC', duration: '7D', price: '5€', desc: 'Short standard access.', icon: '◇', features: ['Core tweaks', 'Game presets', 'Signed updates'] },
  { id: 'standard_30d', name: 'STANDARD', duration: '30D', price: '12€', desc: 'Monthly standard license.', icon: '⌁', features: ['All standard tweaks', 'Download access', 'Support ticket'] },
  { id: 'standard_60d', name: 'EXTENDED', duration: '60D', price: '19€', desc: 'Extended standard access.', icon: '✦', features: ['HWID lock', 'Restore prompts', 'Update checks'] },
  { id: 'standard_90d', name: 'PRO', duration: '90D', price: '24€', desc: 'Best standard value.', icon: '✧', features: ['Long access', 'Priority queue', 'Device lock'] },
  { id: 'standard_lifetime', name: 'LIFETIME', duration: 'LIFETIME', price: '45€', desc: 'Permanent standard license.', icon: '◆', features: ['Lifetime standard', 'Future standard updates', 'Discord support'] },
]

const premiumPlans = [
  { id: 'premium_14d', name: '14D PREMIUM', price: '8€', desc: 'Unlock premium tweaks for 14 days.', badge: 'START' },
  { id: 'premium_30d', name: '30D PREMIUM', price: '14€', desc: 'Monthly premium optimization access.', badge: 'POPULAR' },
  { id: 'premium_lifetime', name: 'LIFETIME PREMIUM', price: '50€', desc: 'Permanent premium tweak access.', badge: 'ELITE' },
]

const benefits = [
  ['FPS OPTIMIZATION', 'Performance presets for smoother gameplay.'],
  ['LATENCY REDUCTION', 'Network and input-delay focused tuning.'],
  ['PREMIUM MODULES', 'Advanced profiles for premium members.'],
  ['SIGNED UPDATES', 'Update metadata prepared for Tauri updater.'],
  ['PROTECTED DOWNLOADS', 'Installers gated behind active licenses.'],
  ['HWID SECURITY', 'License binding with manual/admin reset review.'],
]

function fmtDate(value?: string | null) {
  if (!value) return 'Lifetime'
  return new Date(value).toLocaleDateString()
}

function shortKey(value: string) {
  if (!value) return 'None'
  if (value.length <= 22) return value
  return `${value.slice(0, 14)}...${value.slice(-6)}`
}

function App() {
  const [page, setPage] = useState<PageId>('home')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [licenseKey, setLicenseKey] = useState('')
  const [token, setToken] = useState(localStorage.getItem('eqy_token') || '')
  const [user, setUser] = useState<User | null>(null)
  const [licenses, setLicenses] = useState<License[]>([])
  const [hwidRequests, setHwidRequests] = useState<HwidRequest[]>([])
  const [message, setMessage] = useState('')
  const [loginRequiredPopup, setLoginRequiredPopup] = useState(false)
  const [licenseRequiredPopup, setLicenseRequiredPopup] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [hwidModal, setHwidModal] = useState(false)
  const [hwidReason, setHwidReason] = useState('')
  const [selectedLicenseKey, setSelectedLicenseKey] = useState('')

  const [adminSecret, setAdminSecret] = useState(localStorage.getItem('eqy_admin_secret') || '')
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null)
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [adminLicenses, setAdminLicenses] = useState<License[]>([])
  const [adminRequests, setAdminRequests] = useState<HwidRequest[]>([])
  const [manualEmail, setManualEmail] = useState('')
  const [manualPlan, setManualPlan] = useState('manual_lifetime')
  const [manualDays, setManualDays] = useState('')
  const [manualPremium, setManualPremium] = useState(true)

  const isLoggedIn = Boolean(token && user)
  const activeLicense = licenses.find((license) => license.is_active || license.status === 'active')
  const premiumUnlocked = licenses.some((license) => license.premium && (license.is_active || license.status === 'active'))
  const pendingRequest = hwidRequests.find((request) => request.status === 'pending')

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token])

  const adminHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    'X-Admin-Secret': adminSecret,
  }), [adminSecret])

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

  const protectedDownload = async (kind: 'exe' | 'msi') => {
    requireLoginAction(async () => {
      try {
        const res = await fetch(`${API_URL}/api/download/${kind}?token=${encodeURIComponent(token)}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          if (String(data.error || '').toLowerCase().includes('license')) {
            setLicenseRequiredPopup(true)
            return
          }
          throw new Error(data.error || 'Download failed.')
        }

        window.location.href = `${API_URL}/api/download/${kind}?token=${encodeURIComponent(token)}`
      } catch (e) {
        setMessage((e as Error).message)
      }
    })
  }

  const activateLicense = async () => {
    try {
      const data = await api('/api/license/activate', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ key: licenseKey }),
      })
      setMessage(data.message || 'License activated.')
      setLicenseKey('')
      await loadMe()
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  const updatePassword = async () => {
    try {
      if (newPassword !== newPasswordConfirm) throw new Error('New passwords do not match.')
      const data = await api('/api/auth/change-password', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setMessage(data.message || 'Password updated.')
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  const submitHwidRequest = async () => {
    try {
      const key = selectedLicenseKey || licenses[0]?.key
      if (!key) throw new Error('You need a license first.')
      const data = await api('/api/license/hwid-reset-request', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ key, reason: hwidReason }),
      })
      setMessage(data.message || 'HWID reset request sent.')
      setHwidModal(false)
      setHwidReason('')
      await loadMe()
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  const loadAdmin = async () => {
    try {
      localStorage.setItem('eqy_admin_secret', adminSecret)
      const [overview, users, licensesData, requests] = await Promise.all([
        api('/api/admin/overview', { headers: adminHeaders }),
        api('/api/admin/users', { headers: adminHeaders }),
        api('/api/admin/licenses', { headers: adminHeaders }),
        api('/api/admin/hwid-requests', { headers: adminHeaders }),
      ])
      setAdminOverview(overview)
      setAdminUsers(users.users || [])
      setAdminLicenses(licensesData.licenses || [])
      setAdminRequests(requests.requests || [])
      setMessage('Admin panel loaded.')
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  const adminAction = async (path: string, body: Record<string, unknown> = {}) => {
    try {
      const data = await api(path, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(body),
      })
      setMessage(data.message || 'Admin action completed.')
      await loadAdmin()
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  const adminPatch = async (path: string) => {
    try {
      await api(path, { method: 'PATCH', headers: adminHeaders })
      setMessage('License updated.')
      await loadAdmin()
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  const createManualLicense = async () => {
    try {
      const data = await api('/api/admin/licenses', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          email: manualEmail,
          planId: manualPlan,
          days: manualDays ? Number(manualDays) : null,
          premium: manualPremium,
          status: 'active',
        }),
      })
      setMessage(`Manual license created: ${data.license.key}`)
      await loadAdmin()
    } catch (e) {
      setMessage((e as Error).message)
    }
  }

  const openDiscord = () => window.open('https://discord.gg/h488P4Qezd', '_blank', 'noopener,noreferrer')

  const nav = [
    ['home', 'Home'],
    ['pricing', 'Pricing'],
    ['download', 'Download'],
    ['login', isLoggedIn ? 'Account' : 'Login'],
    ['changelog', 'Updates'],
  ] as const

  const passwordScore = newPassword.length >= 12 ? 'strong' : newPassword.length >= 8 ? 'good' : ''

  return (
    <div className="eqy-v5-root">
      <div className="eqy-v5-bg" />
      <div className="eqy-v5-stars" />
      <div className="eqy-v5-vignette" />

      <header className="eqy-v5-nav">
        <button onClick={() => setPage('home')} className="eqy-v5-brand">
          <img src="/eqy-logo.svg" alt="EQY" />
          <div><strong>EQY</strong><span>TWEAK OS</span></div>
        </button>

        <nav>
          {nav.map(([id, label]) => (
            <button key={id} onClick={() => setPage(id)} className={page === id ? 'active' : ''}>{label}</button>
          ))}
        </nav>

        <div className="eqy-v5-nav-actions">
          <button onClick={() => setPage(isLoggedIn ? 'dashboard' : 'login')} className="eqy-v5-cta">
            {isLoggedIn ? 'Dashboard' : 'Login'}
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
                <span className="eqy-v5-kicker">LIVE CHECKOUT • REAL LICENSES • PROTECTED DOWNLOADS</span>
                <h1>Your PC,<span> tuned like elite hardware.</span></h1>
                <p>EQY Tweak is a premium optimization platform with real accounts, PayPal checkout, automatic license generation, HWID protection and protected downloads.</p>
                <div className="eqy-v5-actions">
                  <button onClick={() => setPage('pricing')} className="eqy-v5-primary">Explore plans</button>
                  <button onClick={() => void protectedDownload('exe')} className="eqy-v5-ghost">Download app</button>
                </div>
                <div className="eqy-v5-feature-row">
                  <span><i>✓</i> PayPal live</span>
                  <span><i>✓</i> License system</span>
                  <span><i>✓</i> HWID lock</span>
                </div>
              </div>
            </div>

            <div className="eqy-v5-stats">
              <div><span>♙</span><strong>50K+</strong><p>Active users</p></div>
              <div><span>⊕</span><strong>98%</strong><p>Satisfaction</p></div>
              <div><span>⚙</span><strong>24/7</strong><p>Protected API</p></div>
              <div><span>◆</span><strong>LIVE</strong><p>Checkout</p></div>
            </div>
          </section>
        )}

        {page === 'pricing' && (
          <section className="eqy-v5-page">
            <div className="eqy-v5-section-title">
              <span>LICENSE STORE</span>
              <h2>Standard licenses</h2>
              <p>Choose the license duration. Login is required before PayPal checkout.</p>
            </div>

            <div className="eqy-v5-plan-grid">
              {standardPlans.map((plan, index) => (
                <article key={plan.id} className={`eqy-v5-plan ${index === 3 ? 'featured' : ''}`}>
                  {index === 3 && <div className="eqy-v5-popular">VALUE</div>}
                  <div className="eqy-v5-plan-head">
                    <div>
                      <span className="eqy-v5-plan-icon">{plan.icon}</span>
                      <h3>{plan.name}</h3>
                      <p>{plan.desc}</p>
                    </div>
                    <strong>{plan.price}</strong>
                  </div>
                  <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                  <button onClick={() => void startCheckout(plan.id)} className="eqy-v5-primary">Buy standard</button>
                </article>
              ))}
            </div>

            <div className="eqy-v5-premium-block">
              <div className="eqy-v5-section-title left">
                <span>PREMIUM SUBSCRIPTION</span>
                <h2>Unlock the premium tweak layer.</h2>
                <p>Premium plans unlock advanced profiles, priority updates and exclusive modules.</p>
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
              <span className="eqy-v5-kicker">DOWNLOAD CENTER</span>
              <h2>Install the desktop app.</h2>
              <p>Downloads are protected. You need an active license to access the installers.</p>
              <div className="eqy-v5-actions">
                <button onClick={() => void protectedDownload('exe')} className="eqy-v5-primary">Download EXE</button>
                <button onClick={() => void protectedDownload('msi')} className="eqy-v5-ghost">Download MSI</button>
              </div>
            </div>
            <div className="eqy-v5-info-card">
              {[['Version', '0.1.1'], ['Platform', 'Windows x64'], ['Installer', 'EXE + MSI'], ['Protection', 'License required']].map(([a, b]) => (
                <div key={a}><span>{a}</span><strong>{b}</strong></div>
              ))}
            </div>
          </section>
        )}

        {page === 'login' && (
          <section className="eqy-v5-page eqy-v5-auth-wrap">
            <div className="eqy-v5-auth">
              <span className="eqy-v5-kicker">ACCESS PORTAL</span>
              <h2>{isLoggedIn ? 'Account' : 'Login or register'}</h2>
              {isLoggedIn ? (
                <>
                  <p>Logged in as {user?.email}</p>
                  <button onClick={() => setPage('dashboard')} className="eqy-v5-primary">Open Dashboard</button>
                  <button onClick={logout} className="eqy-v5-ghost">Logout</button>
                  <button onClick={() => setPage('admin')} className="eqy-v5-outline">Admin panel</button>
                </>
              ) : (
                <>
                  <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button onClick={() => void login()} className="eqy-v5-primary">Login</button>
                  <button onClick={() => void register()} className="eqy-v5-ghost">Register</button>
                  <button onClick={() => setPage('admin')} className="eqy-v5-outline">Open admin panel</button>
                </>
              )}
            </div>
          </section>
        )}

        {page === 'dashboard' && (
          <section className="eqy-v5-page eqy-account-page">
            <div className="eqy-account-hero">
              <div>
                <span className="eqy-v5-kicker">EQY ACCOUNT</span>
                <h2>Welcome back,<br />{user?.email?.split('@')[0] || 'member'}</h2>
                <p>Manage your license, protected downloads, account security and HWID reset requests from one premium dashboard.</p>
                <div className="eqy-account-badges">
                  <span>{activeLicense ? 'Verified license' : 'No active license'}</span>
                  <span>{premiumUnlocked ? 'Premium unlocked' : 'Standard access'}</span>
                  <span>{pendingRequest ? 'HWID pending' : 'HWID protected'}</span>
                </div>
              </div>
              <div className="eqy-account-orb">
                <span>ACCESS</span>
                <strong>{activeLicense ? 'ON' : 'OFF'}</strong>
                <em>{premiumUnlocked ? 'Premium' : activeLicense ? 'Standard' : 'Locked'}</em>
              </div>
            </div>

            <div className="eqy-account-grid">
              <div className="eqy-account-card">
                <div className="eqy-card-head"><span>License overview</span><em>{activeLicense ? 'Active' : 'Locked'}</em></div>
                <h3>{activeLicense ? activeLicense.plan_id : 'No active license'}</h3>
                <p>{activeLicense ? `Expires: ${fmtDate(activeLicense.expires_at)}` : 'Buy a plan or activate an existing license key.'}</p>
                <div className="eqy-license-meter"><i style={{ width: activeLicense ? '100%' : '18%' }} /></div>
                <div className="eqy-license-stats">
                  <div><span>Licenses</span><strong>{licenses.length}</strong></div>
                  <div><span>HWID</span><strong>{activeLicense?.hwid ? 'Bound' : 'Not bound'}</strong></div>
                  <div><span>Premium</span><strong>{premiumUnlocked ? 'Unlocked' : 'Locked'}</strong></div>
                  <div><span>Status</span><strong>{activeLicense ? 'Ready' : 'Inactive'}</strong></div>
                </div>
              </div>

              <div className="eqy-account-card">
                <div className="eqy-card-head"><span>Activate license</span><em>Manual</em></div>
                <h3>Link a key</h3>
                <p>Paste a license key to attach it to this account.</p>
                <div className="eqy-input-row">
                  <input placeholder="EQY-..." value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} />
                  <button onClick={() => void activateLicense()} className="eqy-v5-primary">Activate</button>
                </div>
              </div>

              <div className="eqy-account-card">
                <div className="eqy-card-head"><span>Downloads</span><em>Protected</em></div>
                <h3>EQY Tweak 0.1.1</h3>
                <p>Download access requires an active license.</p>
                <div className="eqy-dashboard-buttons">
                  <button onClick={() => void protectedDownload('exe')} className="eqy-v5-primary">Download EXE</button>
                  <button onClick={() => void protectedDownload('msi')} className="eqy-v5-ghost">Download MSI</button>
                </div>
              </div>
            </div>

            <div className="eqy-account-wide">
              <div className="eqy-account-card">
                <div className="eqy-card-head"><span>Your licenses</span><em>{licenses.length}</em></div>
                <div className="eqy-v5-license-list pro">
                  {licenses.length ? licenses.map((license) => (
                    <div key={license.key}>
                      <strong>{license.key}</strong>
                      <span>{license.plan_id} • {license.status} • {fmtDate(license.expires_at)} • HWID: {license.hwid ? 'Bound' : 'Not bound'}</span>
                    </div>
                  )) : <p>No licenses yet. Buy a plan to generate one automatically.</p>}
                </div>
                <div className="eqy-dashboard-buttons">
                  <button
                    onClick={() => {
                      setSelectedLicenseKey(licenses[0]?.key || '')
                      setHwidModal(true)
                    }}
                    className="eqy-v5-primary"
                    disabled={!licenses.length}
                  >
                    Request HWID Reset
                  </button>
                </div>

                {!!hwidRequests.length && (
                  <div className="eqy-mini-list">
                    <h4>HWID reset requests</h4>
                    {hwidRequests.map((request) => (
                      <div key={request.id}>
                        <strong>{request.status.toUpperCase()} • {shortKey(request.key)}</strong>
                        <span>{request.reason || 'No reason'} {request.admin_note ? `• Admin: ${request.admin_note}` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="eqy-account-card">
                <div className="eqy-card-head"><span>Security</span><em>Password</em></div>
                <h3>Change password</h3>
                <p>Update your account password securely.</p>
                <div className="eqy-password-panel">
                  <input placeholder="Current password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                  <input placeholder="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <input placeholder="Confirm new password" type="password" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} />
                  <div className={`eqy-strength ${passwordScore}`}><i /></div>
                  <button onClick={() => void updatePassword()} className="eqy-v5-primary">Update password</button>
                </div>
              </div>
            </div>

            <div className="eqy-account-card" style={{ marginTop: 18 }}>
              <div className="eqy-card-head"><span>Member benefits</span><em>{premiumUnlocked ? 'Premium' : 'Standard'}</em></div>
              <div className="eqy-benefit-grid">
                {benefits.map(([title, desc], index) => (
                  <div key={title} className={index > 2 && !premiumUnlocked ? 'locked' : ''}>
                    <span>{index > 2 ? 'PREMIUM' : 'CORE'}</span>
                    <strong>{title}</strong>
                    <p>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {page === 'admin' && (
          <section className="eqy-v5-page eqy-admin-page">
            <div className="eqy-v5-section-title left">
              <span>ADMIN CONTROL</span>
              <h2>EQY admin panel</h2>
              <p>Manage users, licenses and HWID reset approvals. Protected by ADMIN_SECRET.</p>
            </div>

            <div className="eqy-account-card">
              <div className="eqy-card-head"><span>Admin access</span><em>Secret required</em></div>
              <div className="eqy-input-row">
                <input placeholder="ADMIN_SECRET" type="password" value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)} />
                <button onClick={() => void loadAdmin()} className="eqy-v5-primary">Load panel</button>
              </div>
            </div>

            {adminOverview && (
              <>
                <div className="eqy-v5-dashboard eqy-admin-stats">
                  <div><span>Users</span><strong>{adminOverview.users}</strong></div>
                  <div><span>Licenses</span><strong>{adminOverview.licenses}</strong></div>
                  <div><span>Pending HWID</span><strong>{adminOverview.pendingHwidRequests}</strong></div>
                  <div><span>Revenue</span><strong>€{Number(adminOverview.paidRevenue || 0).toFixed(2)}</strong></div>
                </div>

                <div className="eqy-account-grid">
                  <div className="eqy-account-card">
                    <div className="eqy-card-head"><span>Create license</span><em>Manual</em></div>
                    <div className="eqy-password-panel">
                      <input placeholder="User email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} />
                      <input placeholder="Plan ID e.g. manual_lifetime" value={manualPlan} onChange={(e) => setManualPlan(e.target.value)} />
                      <input placeholder="Days empty = lifetime" value={manualDays} onChange={(e) => setManualDays(e.target.value)} />
                      <label className="eqy-admin-check">
                        <input type="checkbox" checked={manualPremium} onChange={(e) => setManualPremium(e.target.checked)} />
                        Premium license
                      </label>
                      <button onClick={() => void createManualLicense()} className="eqy-v5-primary">Create license</button>
                    </div>
                  </div>

                  <div className="eqy-account-card">
                    <div className="eqy-card-head"><span>Users</span><em>{adminUsers.length}</em></div>
                    <div className="eqy-admin-list">
                      {adminUsers.slice(0, 8).map((item) => (
                        <div key={item.id}>
                          <strong>{item.email}</strong>
                          <span>{item.active_licenses} active / {item.licenses_count} total licenses</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="eqy-account-card" style={{ marginTop: 18 }}>
                  <div className="eqy-card-head"><span>HWID reset requests</span><em>{adminRequests.length}</em></div>
                  <div className="eqy-admin-list wide">
                    {adminRequests.map((request) => (
                      <div key={request.id}>
                        <strong>{request.status.toUpperCase()} • {request.email} • {shortKey(request.key)}</strong>
                        <span>{request.reason || 'No reason'} • Current HWID: {request.hwid || 'none'}</span>
                        {request.status === 'pending' && (
                          <section>
                            <button onClick={() => void adminAction(`/api/admin/hwid-requests/${request.id}/approve`, { note: 'Approved from admin panel.' })} className="eqy-v5-primary">Approve + reset HWID</button>
                            <button onClick={() => void adminAction(`/api/admin/hwid-requests/${request.id}/decline`, { note: 'Declined from admin panel.' })} className="eqy-v5-ghost">Decline</button>
                          </section>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="eqy-account-card" style={{ marginTop: 18 }}>
                  <div className="eqy-card-head"><span>Licenses</span><em>{adminLicenses.length}</em></div>
                  <div className="eqy-admin-list wide">
                    {adminLicenses.map((license) => (
                      <div key={license.id || license.key}>
                        <strong>{license.email || 'No user'} • {shortKey(license.key)}</strong>
                        <span>{license.plan_id} • {license.status} • {fmtDate(license.expires_at)} • HWID: {license.hwid || 'none'}</span>
                        <section>
                          <button onClick={() => void adminPatch(`/api/admin/licenses/${license.id}/reset-hwid`)} className="eqy-v5-primary">Reset HWID</button>
                          <button onClick={() => void adminPatch(`/api/admin/licenses/${license.id}/revoke`)} className="eqy-v5-ghost">Revoke</button>
                        </section>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {page === 'changelog' && (
          <section className="eqy-v5-page">
            <div className="eqy-v5-section-title left"><span>UPDATES</span><h2>Changelog</h2></div>
            {[
              '0.3.0 — admin panel, HWID approval workflow, manual license creation',
              '0.2.0 — real login, PayPal checkout, license generation, protected downloads',
              '0.1.1 — updater signing, admin startup, restore fixes',
            ].map((item) => (
              <div key={item} className="eqy-v5-log">{item}</div>
            ))}
          </section>
        )}
      </main>

      {loginRequiredPopup && (
        <div className="eqy-v5-modal">
          <div>
            <span className="eqy-v5-kicker">LOGIN REQUIRED</span>
            <h2>You must login first</h2>
            <p>Before downloading, buying or opening protected actions, login or create an account.</p>
            <section><button onClick={() => { setLoginRequiredPopup(false); setPage('login') }} className="eqy-v5-primary">Login</button><button onClick={() => setLoginRequiredPopup(false)} className="eqy-v5-ghost">Close</button></section>
          </div>
        </div>
      )}

      {licenseRequiredPopup && (
        <div className="eqy-v5-modal">
          <div>
            <span className="eqy-v5-kicker">LICENSE REQUIRED</span>
            <h2>Active license needed</h2>
            <p>You need an active EQY license to access protected downloads.</p>
            <section><button onClick={() => { setLicenseRequiredPopup(false); setPage('pricing') }} className="eqy-v5-primary">View plans</button><button onClick={() => setLicenseRequiredPopup(false)} className="eqy-v5-ghost">Close</button></section>
          </div>
        </div>
      )}

      {hwidModal && (
        <div className="eqy-v5-modal">
          <div>
            <span className="eqy-v5-kicker">HWID RESET REQUEST</span>
            <h2>Submit reset request</h2>
            <p>Your request will appear in the admin panel for approval. If approved, your current HWID will be cleared.</p>
            <div className="eqy-password-panel">
              <select value={selectedLicenseKey || licenses[0]?.key || ''} onChange={(e) => setSelectedLicenseKey(e.target.value)}>
                {licenses.map((license) => <option key={license.key} value={license.key}>{license.key}</option>)}
              </select>
              <textarea placeholder="Reason, e.g. I changed motherboard / formatted Windows" value={hwidReason} onChange={(e) => setHwidReason(e.target.value)} />
            </div>
            <section><button onClick={() => void submitHwidRequest()} className="eqy-v5-primary">Submit request</button><button onClick={() => setHwidModal(false)} className="eqy-v5-ghost">Close</button></section>
          </div>
        </div>
      )}

      <footer className="eqy-v5-footer">
        <span>© 2026 EQY Tweak</span>
        <button onClick={() => setPage('admin')}>Admin</button>
      </footer>
    </div>
  )
}

export default App
