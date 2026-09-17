import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { CampaignPage } from './pages/CampaignPage'
import { ProfilePage } from './pages/ProfilePage'
import { JoinPage } from './pages/JoinPage'

function safeNextPath(raw: string | null) {
  if (!raw) return null
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="boot">
        <div className="boot__dot" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function LoginRoute() {
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next'))

  if (loading) {
    return (
      <div className="boot">
        <div className="boot__dot" />
      </div>
    )
  }

  if (user) return <Navigate to={next || '/'} replace />
  return <LoginPage />
}

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="boot">
        <div className="boot__dot" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/join/:code" element={<JoinPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <HomePage />
          </Protected>
        }
      />
      <Route
        path="/campaigns/:id"
        element={
          <Protected>
            <CampaignPage />
          </Protected>
        }
      />
      <Route
        path="/profile"
        element={
          <Protected>
            <ProfilePage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
