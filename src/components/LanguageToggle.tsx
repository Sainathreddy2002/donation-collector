import { useTranslation } from 'react-i18next'

export function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const isTe = i18n.language.startsWith('te')

  return (
    <div className="lang-toggle" role="group" aria-label={t('language')}>
      <button
        type="button"
        className={!isTe ? 'lang-toggle__btn is-active' : 'lang-toggle__btn'}
        onClick={() => void i18n.changeLanguage('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={isTe ? 'lang-toggle__btn is-active' : 'lang-toggle__btn'}
        onClick={() => void i18n.changeLanguage('te')}
      >
        తెలుగు
      </button>
    </div>
  )
}
