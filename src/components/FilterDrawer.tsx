import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  open: boolean
  title: string
  active?: boolean
  onClose: () => void
  onClear?: () => void
  children: ReactNode
}

export function FilterDrawer({ open, title, active, onClose, onClear, children }: Props) {
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
    <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="filter-drawer-title">
      <button type="button" className="drawer__backdrop" aria-label={t('close')} onClick={onClose} />
      <div className="drawer__panel">
        <div className="drawer__handle" aria-hidden />
        <header className="drawer__header">
          <div>
            <p className="drawer__eyebrow">{t('filters')}</p>
            <h2 id="filter-drawer-title" className="drawer__title">
              {title}
            </h2>
          </div>
          <button type="button" className="drawer__close" onClick={onClose}>
            {t('close')}
          </button>
        </header>

        <div className="drawer__body drawer__form">
          {children}
          <div className="action-row">
            {active && onClear ? (
              <button type="button" className="btn btn--ghost" onClick={onClear}>
                {t('clearFilters')}
              </button>
            ) : null}
            <button type="button" className="btn btn--primary" onClick={onClose}>
              {t('done')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
