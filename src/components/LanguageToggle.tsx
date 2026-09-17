import { useTranslation } from 'react-i18next'

const langs = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हिं' },
  { code: 'te', label: 'తె' },
] as const

export function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const current = i18n.language.startsWith('hi')
    ? 'hi'
    : i18n.language.startsWith('te')
      ? 'te'
      : 'en'

  return (
    <div className="lang-toggle" role="group" aria-label={t('language')}>
      {langs.map((lang) => (
        <button
          key={lang.code}
          type="button"
          className={current === lang.code ? 'lang-toggle__btn is-active' : 'lang-toggle__btn'}
          onClick={() => void i18n.changeLanguage(lang.code)}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
