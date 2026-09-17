import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { DonationHistoryWithEditor, DonationWithRecorder } from '../types/database'

type Props = {
  donation: DonationWithRecorder | null
  history: DonationHistoryWithEditor[]
  onClose: () => void
  formatDateTime: (value: string) => string
  formatMoney: (value: number) => string
  actionLabel: (action: string) => string
}

export function HistoryDrawer({
  donation,
  history,
  onClose,
  formatDateTime,
  formatMoney,
  actionLabel,
}: Props) {
  const { t } = useTranslation()
  const open = !!donation

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

  if (!donation) return null

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="history-drawer-title">
      <button type="button" className="drawer__backdrop" aria-label={t('close')} onClick={onClose} />
      <div className="drawer__panel">
        <div className="drawer__handle" aria-hidden />
        <header className="drawer__header">
          <div>
            <p className="drawer__eyebrow">{t('history')}</p>
            <h2 id="history-drawer-title" className="drawer__title">
              {donation.donor_name}
            </h2>
            <p className="drawer__amount">
              {formatMoney(Number(donation.amount))}
            </p>
          </div>
          <button type="button" className="drawer__close" onClick={onClose}>
            {t('close')}
          </button>
        </header>

        <div className="drawer__body">
          {history.length === 0 ? (
            <p className="history-panel__empty">{t('historyEmpty')}</p>
          ) : (
            <ol className="history-list">
              {history.map((h) => (
                <li key={h.id} className={`history-item history-item--${h.action}`}>
                  <div className="history-item__dot" aria-hidden />
                  <div className="history-item__content">
                    <p className="history-item__title">
                      <strong>{actionLabel(h.action)}</strong>{' '}
                      {t('historyBy', {
                        name: h.editor?.display_name || t('unknownRecorder'),
                      })}
                    </p>
                    <p className="history-item__time">{formatDateTime(h.created_at)}</p>
                    {h.action === 'updated' ? (
                      <div className="history-item__changes">
                        {h.previous_amount != null &&
                        Number(h.previous_amount) !== Number(h.amount) ? (
                          <span>
                            {t('historyChangedAmount', {
                              from: formatMoney(Number(h.previous_amount)),
                              to: formatMoney(Number(h.amount)),
                            })}
                          </span>
                        ) : null}
                        {h.previous_donor_name && h.previous_donor_name !== h.donor_name ? (
                          <span>
                            {t('historyChangedName', {
                              from: h.previous_donor_name,
                              to: h.donor_name,
                            })}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
