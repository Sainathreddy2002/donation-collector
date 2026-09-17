import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthProvider'
import { LanguageToggle } from './LanguageToggle'
import { IconBack, IconHome, IconLogo, IconUser } from './Icons'

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split('@')[0] || '?'
  return source.slice(0, 1).toUpperCase()
}

export function AppShell({
  children,
  title,
  showBack,
  hideNav,
}: {
  children: ReactNode
  title?: string
  showBack?: boolean
  hideNav?: boolean
}) {
  const { t } = useTranslation()
  const { user, profile, avatarUrl } = useAuth()
  const location = useLocation()
  const onProfile = location.pathname.startsWith('/profile')
  const onHome = location.pathname === '/'

  return (
    <div className={`shell ${hideNav ? '' : 'shell--with-nav'}`}>
      <header className="topbar">
        <div className="topbar__row">
          {showBack ? (
            <Link to="/" className="back-link">
              <IconBack size={18} />
              {t('back')}
            </Link>
          ) : (
            <Link to="/" className="brand">
              <IconLogo size={22} />
              {t('appName')}
            </Link>
          )}
          <div className="topbar__actions">
            <LanguageToggle />
            {user ? (
              <Link to="/profile" className="avatar-link" aria-label={t('profile')}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="avatar avatar--fallback">
                    {initials(profile?.display_name, user.email)}
                  </span>
                )}
              </Link>
            ) : null}
          </div>
        </div>
        {title ? <h1 className="page-title">{title}</h1> : null}
      </header>

      <main className="main">{children}</main>

      {!hideNav && user ? (
        <nav className="bottom-nav" aria-label="Main">
          <Link to="/" className={onHome ? 'bottom-nav__item is-active' : 'bottom-nav__item'}>
            <span className="bottom-nav__icon" aria-hidden>
              <IconHome size={20} />
            </span>
            <span>{t('navHome')}</span>
          </Link>
          <Link
            to="/profile"
            className={onProfile ? 'bottom-nav__item is-active' : 'bottom-nav__item'}
          >
            <span className="bottom-nav__icon" aria-hidden>
              <IconUser size={20} />
            </span>
            <span>{t('profile')}</span>
          </Link>
        </nav>
      ) : null}
    </div>
  )
}
