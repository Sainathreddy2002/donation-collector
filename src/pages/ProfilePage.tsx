import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../components/AppShell'
import { LanguageToggle } from '../components/LanguageToggle'
import { IconLogout, IconPhone, IconSave, IconUser } from '../components/Icons'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

export function ProfilePage() {
  const { t } = useTranslation()
  const { user, profile, avatarUrl, signOut, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '')
    setPhone(profile?.phone ?? '')
  }, [profile])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    setMessage(null)

    const { error: updErr } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName.trim() || null,
      phone: phone.trim() || null,
      avatar_url: avatarUrl,
    })

    setSaving(false)
    if (updErr) {
      setError(t('errorGeneric'))
      return
    }
    await refreshProfile()
    setMessage(t('profileSaved'))
  }

  return (
    <AppShell title={t('profile')}>
      <div className="profile-hero">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="profile-hero__avatar"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="profile-hero__avatar profile-hero__avatar--fallback">
            {(displayName || user?.email || '?').slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="profile-hero__name">{displayName || profile?.display_name || t('profile')}</p>
          <p className="profile-hero__email">{user?.email}</p>
        </div>
      </div>

      <form className="panel panel--lift" onSubmit={(e) => void handleSave(e)}>
        <label className="field">
          <span className="field__label">
            <IconUser size={16} />
            {t('displayName')}
          </span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('displayNamePlaceholder')}
          />
        </label>
        <label className="field">
          <span className="field__label">
            <IconPhone size={16} />
            {t('phone')}
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('phonePlaceholder')}
            inputMode="tel"
          />
        </label>

        <div className="field">
          <span>{t('language')}</span>
          <LanguageToggle />
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="form-success">{message}</p> : null}

        <button type="submit" className="btn btn--primary btn--block" disabled={saving}>
          <IconSave size={18} />
          {saving ? t('loading') : t('save')}
        </button>
      </form>

      <button type="button" className="btn btn--danger btn--block" onClick={() => void signOut()}>
        <IconLogout size={18} />
        {t('signOut')}
      </button>
    </AppShell>
  )
}
