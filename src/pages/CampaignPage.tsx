import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../components/AppShell'
import { IconEdit, IconHistory, IconTrash } from '../components/Icons'
import { HistoryDrawer } from '../components/HistoryDrawer'
import { DonationFormDrawer } from '../components/DonationFormDrawer'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import type { Campaign, DonationHistoryWithEditor, DonationWithRecorder } from '../types/database'
import { appUrl } from '../lib/urls'

type SortKey = 'newest' | 'amount_desc' | 'amount_asc' | 'name'

const emptyForm = { donor_name: '', amount: '', notes: '' }

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

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function formatMoney(value: number) {
  return `₹${Number(value).toLocaleString('en-IN')}`
}

export function CampaignPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const { user } = useAuth()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [donations, setDonations] = useState<DonationWithRecorder[]>([])
  const [historyByDonation, setHistoryByDonation] = useState<
    Record<string, DonationHistoryWithEditor[]>
  >({})
  const [historyDonation, setHistoryDonation] = useState<DonationWithRecorder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('amount_desc')
  const [copied, setCopied] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<DonationWithRecorder | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const isCreator = !!user && !!campaign && campaign.created_by === user.id

  useEffect(() => {
    if (!id) return
    void loadAll()
  }, [id])

  async function loadAll() {
    setLoading(true)
    setError(null)

    const [{ data: camp, error: campErr }, { data: dons, error: donErr }, { data: hist, error: histErr }] =
      await Promise.all([
        supabase.from('campaigns').select('*').eq('id', id!).single(),
        supabase
          .from('donations')
          .select('*')
          .eq('campaign_id', id!)
          .order('created_at', { ascending: false }),
        supabase
          .from('donation_history')
          .select('*')
          .eq('campaign_id', id!)
          .order('created_at', { ascending: false }),
      ])

    if (campErr || donErr) {
      setError(t('errorGeneric'))
      setCampaign(camp)
      setDonations([])
      setLoading(false)
      return
    }

    const recorderIds = [...new Set((dons ?? []).map((d) => d.recorded_by))]
    const deleterIds = [...new Set((dons ?? []).map((d) => d.deleted_by).filter(Boolean))] as string[]
    const editorIds = [...new Set((hist ?? []).map((h) => h.changed_by).filter(Boolean))] as string[]
    const profileIds = [...new Set([...recorderIds, ...deleterIds, ...editorIds])]

    let profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>()
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', profileIds)
      profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]),
      )
    }

    const grouped: Record<string, DonationHistoryWithEditor[]> = {}
    for (const row of hist ?? []) {
      const item: DonationHistoryWithEditor = {
        ...row,
        editor: row.changed_by
          ? { display_name: profileMap.get(row.changed_by)?.display_name ?? null }
          : null,
      }
      if (!grouped[row.donation_id]) grouped[row.donation_id] = []
      grouped[row.donation_id].push(item)
    }

    if (histErr) {
      console.warn('donation_history unavailable', histErr.message)
    }

    setCampaign(camp)
    setDonations(
      (dons ?? []).map((d) => ({
        ...d,
        recorder: profileMap.get(d.recorded_by) ?? null,
        deleter: d.deleted_by
          ? { display_name: profileMap.get(d.deleted_by)?.display_name ?? null }
          : null,
      })),
    )
    setHistoryByDonation(grouped)
    setLoading(false)
  }

  const activeDonations = useMemo(
    () => donations.filter((d) => !d.deleted_at),
    [donations],
  )

  const deletedDonations = useMemo(
    () => donations.filter((d) => !!d.deleted_at),
    [donations],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = activeDonations
    if (q) {
      list = list.filter(
        (d) =>
          d.donor_name.toLowerCase().includes(q) ||
          (d.recorder?.display_name ?? '').toLowerCase().includes(q),
      )
    }

    const sorted = [...list]
    if (sort === 'amount_desc') sorted.sort((a, b) => Number(b.amount) - Number(a.amount))
    else if (sort === 'amount_asc') sorted.sort((a, b) => Number(a.amount) - Number(b.amount))
    else if (sort === 'name') sorted.sort((a, b) => a.donor_name.localeCompare(b.donor_name))
    else sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    return sorted
  }, [activeDonations, query, sort])

  const total = useMemo(
    () => activeDonations.reduce((sum, d) => sum + Number(d.amount), 0),
    [activeDonations],
  )

  const progress = useMemo(() => {
    const goal = campaign?.target_amount != null ? Number(campaign.target_amount) : null
    if (!goal || goal <= 0) return null
    return Math.min(100, Math.round((total / goal) * 100))
  }, [campaign?.target_amount, total])

  async function copyInviteLink() {
    if (!campaign) return
    const link = appUrl(`/join/${campaign.invite_code}`)
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(d: DonationWithRecorder) {
    setEditing(d)
    setForm({
      donor_name: d.donor_name,
      amount: String(d.amount),
      notes: d.notes ?? '',
    })
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!user || !id) return

    const name = form.donor_name.trim()
    const amount = Number(form.amount)
    if (!name) {
      setFormError(t('emptyName'))
      return
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setFormError(t('emptyAmount'))
      return
    }

    setSaving(true)
    setFormError(null)

    if (editing) {
      const { error: updErr } = await supabase
        .from('donations')
        .update({
          donor_name: name,
          amount,
          notes: form.notes.trim() || null,
        })
        .eq('id', editing.id)

      setSaving(false)
      if (updErr) {
        setFormError(t('errorGeneric'))
        return
      }
    } else {
      const { error: insErr } = await supabase.from('donations').insert({
        campaign_id: id,
        donor_name: name,
        amount,
        notes: form.notes.trim() || null,
        recorded_by: user.id,
      })

      setSaving(false)
      if (insErr) {
        setFormError(t('errorGeneric'))
        return
      }
    }

    closeForm()
    await loadAll()
  }

  async function handleSoftDelete(d: DonationWithRecorder) {
    if (!user || !window.confirm(t('confirmDelete'))) return
    const { error: delErr } = await supabase
      .from('donations')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', d.id)
      .is('deleted_at', null)

    if (delErr) setError(t('errorGeneric'))
    else await loadAll()
  }

  function actionLabel(action: string) {
    if (action === 'created') return t('historyCreated')
    if (action === 'updated') return t('historyUpdated')
    return t('historyDeleted')
  }

  function renderDonationCard(d: DonationWithRecorder, opts: { deleted?: boolean } = {}) {
    const history = historyByDonation[d.id] ?? []
    const wasEdited = history.some((h) => h.action === 'updated')
    const deleted = !!opts.deleted

    return (
      <li key={d.id} className={deleted ? 'donation-card donation-card--deleted' : 'donation-card'}>
        <div className="donation-card__body">
          <div className="donation-card__top">
            <div className="donation-card__identity">
              <div>
                <div className="donation-card__name-row">
                  <span className="donation-card__name">{d.donor_name}</span>
                  {deleted ? <span className="donation-card__badge donation-card__badge--deleted">{t('deletedBadge')}</span> : null}
                  {!deleted && wasEdited ? <span className="donation-card__badge">{t('editedBadge')}</span> : null}
                </div>
                {d.notes ? <p className="donation-card__notes">{d.notes}</p> : null}
              </div>
            </div>
            <span className="donation-card__amount">{formatMoney(Number(d.amount))}</span>
          </div>

          <div className="donation-card__meta">
            <span>
              {t('recordedBy')}{' '}
              <strong>{d.recorder?.display_name || t('unknownRecorder')}</strong>
            </span>
            <span>{formatDateTime(d.created_at)}</span>
            {deleted && d.deleted_at ? (
              <span>
                {t('deletedBy')}{' '}
                <strong>{d.deleter?.display_name || t('unknownRecorder')}</strong>
                {' · '}
                {formatDateTime(d.deleted_at)}
              </span>
            ) : null}
          </div>

          <div className="donation-card__actions">
            {!deleted ? (
              <>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => openEdit(d)}
                  aria-label={t('edit')}
                  title={t('edit')}
                >
                  <IconEdit />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setHistoryDonation(d)}
                  aria-label={t('history')}
                  title={t('history')}
                >
                  <IconHistory />
                  {history.length > 0 ? <span className="icon-btn__count">{history.length}</span> : null}
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => void handleSoftDelete(d)}
                  aria-label={t('delete')}
                  title={t('delete')}
                >
                  <IconTrash />
                </button>
              </>
            ) : (
              <button
                type="button"
                className="icon-btn"
                onClick={() => setHistoryDonation(d)}
                aria-label={t('history')}
                title={t('history')}
              >
                <IconHistory />
                {history.length > 0 ? <span className="icon-btn__count">{history.length}</span> : null}
              </button>
            )}
          </div>
        </div>
      </li>
    )
  }

  if (loading) {
    return (
      <AppShell showBack hideNav>
        <p className="muted">{t('loading')}</p>
      </AppShell>
    )
  }

  if (!campaign) {
    return (
      <AppShell showBack hideNav>
        <p className="form-error">{t('errorGeneric')}</p>
      </AppShell>
    )
  }

  return (
    <AppShell showBack hideNav title={campaign.title}>
      <div className="campaign-meta">
        {campaign.description ? <p className="campaign-desc">{campaign.description}</p> : null}
        <div className="meta-chips">
          {campaign.location ? <span className="meta-chip">{campaign.location}</span> : null}
          {campaign.event_date ? (
            <span className="meta-chip">{formatDate(campaign.event_date)}</span>
          ) : null}
        </div>
      </div>

      <div className="invite-banner">
        <div className="invite-banner__text">
          <p className="invite-banner__label">{t('shareLink')}</p>
          <p className="invite-banner__code">{campaign.invite_code}</p>
          <p className="invite-banner__hint">{t('shareLinkHint')}</p>
        </div>
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => void copyInviteLink()}>
          {copied ? t('copied') : t('copyLink')}
        </button>
      </div>

      <div className="stats stats--single">
        <div className="stat stat--hero">
          <span className="stat__label">{t('totalCollected')}</span>
          <span className="stat__value">{formatMoney(total)}</span>
          {campaign.target_amount != null ? (
            <>
              <div className="progress">
                <div className="progress__bar" style={{ width: `${progress ?? 0}%` }} />
              </div>
              <p className="stat__sub">
                {t('ofGoal', { goal: Number(campaign.target_amount).toLocaleString('en-IN') })} ·{' '}
                {progress ?? 0}%
              </p>
            </>
          ) : (
            <p className="stat__sub">
              {activeDonations.length} {t('donationsCount')}
            </p>
          )}
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchDonations')}
          type="search"
        />
        <div className="sort-row" role="group" aria-label={t('sortBy')}>
          {(
            [
              ['amount_desc', t('sortAmountHigh')],
              ['amount_asc', t('sortAmountLow')],
              ['newest', t('sortNewest')],
              ['name', t('sortName')],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={sort === key ? 'chip is-active' : 'chip'}
              onClick={() => setSort(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {filtered.length === 0 ? (
        <div className="empty">
          <p className="empty__title">{t('noDonations')}</p>
          <p className="empty__hint">{t('noDonationsHint')}</p>
        </div>
      ) : (
        <ul className="donation-list">{filtered.map((d) => renderDonationCard(d))}</ul>
      )}

      {isCreator && deletedDonations.length > 0 ? (
        <section className="deleted-section">
          <div className="section-head">
            <h2>{t('deletedDonations')}</h2>
            <p className="hint">{t('deletedDonationsHint')}</p>
          </div>
          <ul className="donation-list">
            {deletedDonations.map((d) => renderDonationCard(d, { deleted: true }))}
          </ul>
        </section>
      ) : null}

      <div className="fab-bar">
        <button type="button" className="btn btn--primary btn--block btn--xl" onClick={openCreate}>
          {t('addDonation')}
        </button>
      </div>

      <DonationFormDrawer
        open={showForm}
        isEditing={!!editing}
        form={form}
        saving={saving}
        error={formError}
        onChange={setForm}
        onSubmit={(e) => void handleSave(e)}
        onClose={closeForm}
      />

      <HistoryDrawer
        donation={historyDonation}
        history={historyDonation ? historyByDonation[historyDonation.id] ?? [] : []}
        onClose={() => setHistoryDonation(null)}
        formatDateTime={formatDateTime}
        formatMoney={formatMoney}
        actionLabel={actionLabel}
      />
    </AppShell>
  )
}
