import { useEffect, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

type FormState = {
  donor_name: string
  amount: string
  notes: string
}

type Props = {
  open: boolean
  isEditing: boolean
  form: FormState
  saving: boolean
  error: string | null
  onChange: (next: FormState) => void
  onSubmit: (e: FormEvent) => void
  onClose: () => void
}

export function DonationFormDrawer({
  open,
  isEditing,
  form,
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
    <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="donation-form-title">
      <button type="button" className="drawer__backdrop" aria-label={t('close')} onClick={onClose} />
      <div className="drawer__panel">
        <div className="drawer__handle" aria-hidden />
        <header className="drawer__header">
          <div>
            <p className="drawer__eyebrow">{t('appName')}</p>
            <h2 id="donation-form-title" className="drawer__title">
              {isEditing ? t('edit') : t('addDonation')}
            </h2>
          </div>
          <button type="button" className="drawer__close" onClick={onClose}>
            {t('close')}
          </button>
        </header>

        <form className="drawer__body drawer__form" onSubmit={onSubmit}>
          <label className="field">
            <span>{t('donorName')}</span>
            <input
              value={form.donor_name}
              onChange={(e) => onChange({ ...form, donor_name: e.target.value })}
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span>{t('amount')}</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => onChange({ ...form, amount: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>{t('notes')}</span>
            <input
              value={form.notes}
              onChange={(e) => onChange({ ...form, notes: e.target.value })}
              placeholder={t('notesPlaceholder')}
            />
          </label>
          <p className="hint">{t('recorderHint')}</p>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="action-row">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? t('loading') : t('save')}
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
