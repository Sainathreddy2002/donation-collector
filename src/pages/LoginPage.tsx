import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthProvider'
import { LanguageToggle } from '../components/LanguageToggle'
import { IconLogo } from '../components/Icons'
import { appUrl } from '../lib/urls'

function safeNextPath(raw: string | null) {
  if (!raw) return null
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}

export function LoginPage() {
  const { t } = useTranslation()
  const { user, loading, signInWithGoogle } = useAuth()
  const [params] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const next = safeNextPath(params.get('next'))

  async function handleSignIn() {
    setBusy(true)
    setError(null)
    try {
      const redirectTo = next ? appUrl(next) : appUrl('/')
      await signInWithGoogle(redirectTo)
    } catch {
      setError(t('errorGeneric'))
      setBusy(false)
    }
  }

  if (!loading && user) {
    return <Navigate to={next || '/'} replace />
  }

  return (
    <div className="login">
      <div className="login__glow" aria-hidden />
      <div className="login__panel">
        <div className="login__lang">
          <LanguageToggle />
        </div>
        <div className="login__brand-row">
          <IconLogo size={36} />
          <p className="login__brand">{t('appName')}</p>
        </div>
        <p className="login__tagline">{t('tagline')}</p>
        {next ? <p className="hint">{t('joinAfterLogin')}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        <button
          type="button"
          className="btn btn--primary btn--xl"
          disabled={busy}
          onClick={() => void handleSignIn()}
        >
          {busy ? t('loading') : t('signInGoogle')}
        </button>
      </div>
    </div>
  )
}
