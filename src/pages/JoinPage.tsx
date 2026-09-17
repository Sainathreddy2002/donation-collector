import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

export function JoinPage() {
  const { code = '' } = useParams<{ code: string }>()
  const { user, loading } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const cleanCode = code.trim().toUpperCase()
  const nextPath = `/join/${encodeURIComponent(cleanCode)}`

  useEffect(() => {
    if (loading || !user || !cleanCode) return

    let cancelled = false

    async function join() {
      const { data, error: joinErr } = await supabase.rpc('join_campaign_by_code', {
        p_code: cleanCode,
      })

      if (cancelled) return

      if (joinErr || !data) {
        setError(t('invalidCode'))
        return
      }

      const campaign = Array.isArray(data) ? data[0] : data
      navigate(`/campaigns/${campaign.id}`, { replace: true })
    }

    void join()

    return () => {
      cancelled = true
    }
  }, [loading, user, cleanCode, navigate, t])

  if (!cleanCode) {
    return <Navigate to="/" replace />
  }

  if (loading) {
    return (
      <div className="boot">
        <div className="boot__dot" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} replace />
  }

  if (error) {
    return (
      <div className="join-error">
        <p className="form-error">{error}</p>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
          {t('navHome')}
        </button>
      </div>
    )
  }

  return (
    <div className="boot">
      <div className="boot__dot" />
      <p className="muted" style={{ marginTop: '1rem' }}>
        {t('joiningGroup')}
      </p>
    </div>
  )
}
