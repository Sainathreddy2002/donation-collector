import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../components/AppShell'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import type { Campaign } from '../types/database'

function makeInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

function formatDate(value: string | null) {
  if (!value) return null
  try {
    return new Date(value + 'T00:00:00').toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return value
  }
}

export function HomePage() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    void loadCampaigns()
  }, [user])

  async function loadCampaigns() {
    setLoading(true)
    setError(null)
    const { data: memberships, error: memErr } = await supabase
      .from('campaign_members')
      .select('campaign_id')
      .eq('user_id', user!.id)

    if (memErr) {
      setError(t('errorGeneric'))
      setLoading(false)
      return
    }

    const ids = (memberships ?? []).map((m) => m.campaign_id)
    if (ids.length === 0) {
      setCampaigns([])
      setLoading(false)
      return
    }

    const { data, error: campErr } = await supabase
      .from('campaigns')
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: false })

    if (campErr) setError(t('errorGeneric'))
    else setCampaigns(data ?? [])
    setLoading(false)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!user || !title.trim()) return
    setSaving(true)
    setError(null)

    const target = targetAmount.trim() ? Number(targetAmount) : null
    if (targetAmount.trim() && (!Number.isFinite(target) || (target ?? 0) < 0)) {
      setError(t('emptyAmount'))
      setSaving(false)
      return
    }

    const code = makeInviteCode()
    const { data: campaign, error: createErr } = await supabase
      .from('campaigns')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        target_amount: target,
        event_date: eventDate || null,
        invite_code: code,
        created_by: user.id,
      })
      .select()
      .single()

    if (createErr || !campaign) {
      setError(t('errorGeneric'))
      setSaving(false)
      return
    }

    const { error: memErr } = await supabase.from('campaign_members').insert({
      campaign_id: campaign.id,
      user_id: user.id,
      role: 'owner',
    })

    setSaving(false)
    if (memErr) {
      setError(t('errorGeneric'))
      return
    }

    navigate(`/campaigns/${campaign.id}`)
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setSaving(true)
    setError(null)

    const { data, error: joinErr } = await supabase.rpc('join_campaign_by_code', {
      p_code: inviteCode.trim(),
    })

    setSaving(false)
    if (joinErr || !data) {
      setError(t('invalidCode'))
      return
    }

    const campaign = Array.isArray(data) ? data[0] : data
    navigate(`/campaigns/${campaign.id}`)
  }

  const name = profile?.display_name ?? user?.email?.split('@')[0] ?? ''

  return (
    <AppShell>
      <section className="hero-card">
        <p className="hero-card__eyebrow">{t('appName')}</p>
        <h1 className="hero-card__title">
          {t('welcomeBack')}
          {name ? `, ${name}` : ''}
        </h1>
        <p className="hero-card__sub">{t('homeSubtitle')}</p>
        <div className="action-row">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setMode(mode === 'create' ? 'idle' : 'create')}
          >
            {t('createCampaign')}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setMode(mode === 'join' ? 'idle' : 'join')}
          >
            {t('joinCampaign')}
          </button>
        </div>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      {mode === 'create' ? (
        <form className="panel panel--lift" onSubmit={(e) => void handleCreate(e)}>
          <h2 className="panel__title">{t('createCampaign')}</h2>
          <label className="field">
            <span>{t('campaignTitle')}</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('campaignTitlePlaceholder')}
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span>{t('description')}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              rows={3}
            />
          </label>
          <label className="field">
            <span>{t('location')}</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('locationPlaceholder')}
            />
          </label>
          <div className="field-grid">
            <label className="field">
              <span>{t('targetAmount')}</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder={t('targetAmountPlaceholder')}
              />
            </label>
            <label className="field">
              <span>{t('eventDate')}</span>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </label>
          </div>
          <div className="action-row">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? t('loading') : t('create')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setMode('idle')}>
              {t('cancel')}
            </button>
          </div>
        </form>
      ) : null}

      {mode === 'join' ? (
        <form className="panel panel--lift" onSubmit={(e) => void handleJoin(e)}>
          <h2 className="panel__title">{t('joinCampaign')}</h2>
          <label className="field">
            <span>{t('inviteCode')}</span>
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              required
              autoFocus
              autoCapitalize="characters"
              maxLength={8}
            />
          </label>
          <p className="hint">{t('inviteCodeHint')}</p>
          <div className="action-row">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? t('loading') : t('join')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setMode('idle')}>
              {t('cancel')}
            </button>
          </div>
        </form>
      ) : null}

      <div className="section-head">
        <h2>{t('myCampaigns')}</h2>
      </div>

      {loading ? (
        <p className="muted">{t('loading')}</p>
      ) : campaigns.length === 0 ? (
        <div className="empty">
          <p className="empty__title">{t('noCampaigns')}</p>
          <p className="empty__hint">{t('noCampaignsHint')}</p>
        </div>
      ) : (
        <ul className="campaign-list">
          {campaigns.map((c) => (
            <li key={c.id}>
              <Link to={`/campaigns/${c.id}`} className="campaign-card">
                <div className="campaign-card__top">
                  <span className="campaign-card__title">{c.title}</span>
                  <span className="campaign-card__chevron" aria-hidden>
                    ›
                  </span>
                </div>
                {c.description ? <span className="campaign-card__desc">{c.description}</span> : null}
                <div className="campaign-card__meta">
                  {c.location ? <span>{c.location}</span> : null}
                  {c.event_date ? <span>{formatDate(c.event_date)}</span> : null}
                  {c.target_amount != null ? (
                    <span>
                      {t('goal')}: ₹{Number(c.target_amount).toLocaleString('en-IN')}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  )
}
