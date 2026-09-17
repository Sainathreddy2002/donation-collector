import { useEffect, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { IconCalendar, IconMapPin, IconNote, IconPlus, IconRupee, IconSave } from './Icons'

export type CampaignFormState = {
  title: string
  description: string
  location: string
  targetAmount: string
  eventDate: string
}

type Props = {
  open: boolean
  isEditing: boolean
  form: CampaignFormState
  saving: boolean
  error: string | null
  onChange: (next: CampaignFormState) => void
  onSubmit: (e: FormEvent) => void
  onClose: () => void
}

export function CampaignFormDrawer({
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
    <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="campaign-form-title">
      <button type="button" className="drawer__backdrop" aria-label={t('close')} onClick={onClose} />
      <div className="drawer__panel">
        <div className="drawer__handle" aria-hidden />
        <header className="drawer__header">
          <div>
            <p className="drawer__eyebrow">{t('appName')}</p>
            <h2 id="campaign-form-title" className="drawer__title">
              {isEditing ? t('editCampaign') : t('createCampaign')}
            </h2>
          </div>
          <button type="button" className="drawer__close" onClick={onClose}>
            {t('close')}
          </button>
        </header>

        <form className="drawer__body drawer__form" onSubmit={onSubmit}>
          <label className="field">
            <span className="field__label">
              <IconNote size={16} />
              {t('campaignTitle')}
            </span>
            <input
              value={form.title}
              onChange={(e) => onChange({ ...form, title: e.target.value })}
              placeholder={t('campaignTitlePlaceholder')}
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span className="field__label">
              <IconNote size={16} />
              {t('description')}
            </span>
            <textarea
              value={form.description}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
              placeholder={t('descriptionPlaceholder')}
              rows={3}
            />
          </label>
          <label className="field">
            <span className="field__label">
              <IconMapPin size={16} />
              {t('location')}
            </span>
            <input
              value={form.location}
              onChange={(e) => onChange({ ...form, location: e.target.value })}
              placeholder={t('locationPlaceholder')}
            />
          </label>
          <div className="field-grid">
            <label className="field">
              <span className="field__label">
                <IconRupee size={16} />
                {t('targetAmount')}
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={form.targetAmount}
                onChange={(e) => onChange({ ...form, targetAmount: e.target.value })}
                placeholder={t('targetAmountPlaceholder')}
              />
            </label>
            <label className="field">
              <span className="field__label">
                <IconCalendar size={16} />
                {t('eventDate')}
              </span>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => onChange({ ...form, eventDate: e.target.value })}
              />
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="action-row">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {isEditing ? <IconSave size={18} /> : <IconPlus size={18} />}
              {saving ? t('loading') : isEditing ? t('save') : t('create')}
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
