import { useEffect, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconKey, IconUsers } from './Icons'

type Props = {
  open: boolean
  inviteCode: string
  saving: boolean
  error: string | null
  onChange: (code: string) => void
  onSubmit: (e: FormEvent) => void
  onClose: () => void
}

export function JoinCampaignDrawer({
  open,
  inviteCode,
  saving,
  error,
  onChange,
  onSubmit,
  onClose,
}: Props) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="join-campaign-title">
      <button type="button" className="drawer__backdrop" aria-label={t('close')} onClick={onClose} />
      <div className="drawer__panel">
        <div className="drawer__handle" aria-hidden />
        <header className="drawer__header">
          <div>
            <p className="drawer__eyebrow">{t('appName')}</p>
            <h2 id="join-campaign-title" className="drawer__title">
              {t('joinCampaign')}
            </h2>
          </div>
          <button type="button" className="drawer__close" onClick={onClose}>
            {t('close')}
          </button>
        </header>

        <form className="drawer__body drawer__form" onSubmit={onSubmit}>
          <label className="field">
            <span className="field__label">
              <IconKey size={16} />
              {t('inviteCode')}
            </span>
            <input
              value={inviteCode}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              placeholder="ABC123"
              required
              autoFocus
              autoCapitalize="characters"
              maxLength={8}
            />
          </label>
          <p className="hint">{t('inviteCodeHint')}</p>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="action-row">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              <IconUsers size={18} />
              {saving ? t('loading') : t('join')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
