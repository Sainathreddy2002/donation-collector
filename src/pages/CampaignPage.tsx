import { useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '../components/AppShell'
import {
  IconCalendar,
  IconCheck,
  IconCopy,
  IconEdit,
  IconFilter,
  IconHistory,
  IconLink,
  IconMapPin,
  IconPlus,
  IconRupee,
  IconSearch,
  IconTrash,
  IconUser,
} from '../components/Icons'
import { FilterDrawer } from '../components/FilterDrawer'
import { HistoryDrawer } from '../components/HistoryDrawer'
import { DonationFormDrawer } from '../components/DonationFormDrawer'
import {
  CampaignFormDrawer,
  type CampaignFormState,
} from '../components/CampaignFormDrawer'
import { useAuth } from '../auth/AuthProvider'
import {
  createDonation,
  fetchCampaignBundle,
  softDeleteDonation,
  updateCampaign,
  updateDonation,
} from '../lib/api'
import { queryKeys } from '../lib/query'
import type { DonationWithRecorder } from '../types/database'
import { appUrl } from '../lib/urls'

type SortKey = 'newest' | 'amount_desc' | 'amount_asc' | 'name'

const emptyForm = { donor_name: '', amount: '', notes: '' }

const emptyCampaignForm: CampaignFormState = {
  title: '',
  description: '',
  location: '',
  targetAmount: '',
  eventDate: '',
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
  const queryClient = useQueryClient()

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('amount_desc')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<DonationWithRecorder | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [editCampaignOpen, setEditCampaignOpen] = useState(false)
  const [campaignForm, setCampaignForm] = useState<CampaignFormState>(emptyCampaignForm)
  const [campaignFormError, setCampaignFormError] = useState<string | null>(null)
  const [historyDonation, setHistoryDonation] = useState<DonationWithRecorder | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const bundleQuery = useQuery({
    queryKey: queryKeys.campaign(id ?? ''),
    queryFn: () => fetchCampaignBundle(id!),
    enabled: !!id,
  })

  const campaign = bundleQuery.data?.campaign ?? null
  const donations = bundleQuery.data?.donations ?? []
  const historyByDonation = bundleQuery.data?.historyByDonation ?? {}

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error('missing user')
      const name = form.donor_name.trim()
      const amount = Number(form.amount)
      if (!name) throw new Error('emptyName')
      if (!Number.isFinite(amount) || amount < 0) throw new Error('emptyAmount')

      if (editing) {
        await updateDonation({
          id: editing.id,
          donor_name: name,
          amount,
          notes: form.notes.trim() || null,
        })
      } else {
        await createDonation({
          campaign_id: id,
          donor_name: name,
          amount,
          notes: form.notes.trim() || null,
          recorded_by: user.id,
        })
      }
    },
    onSuccess: async () => {
      closeForm()
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaign(id!) })
    },
    onError: (err: Error) => {
      if (err.message === 'emptyName') setFormError(t('emptyName'))
      else if (err.message === 'emptyAmount') setFormError(t('emptyAmount'))
      else setFormError(t('errorGeneric'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (donationId: string) => softDeleteDonation(donationId, user!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaign(id!) })
    },
    onError: () => setActionError(t('errorGeneric')),
  })

  const updateCampaignMutation = useMutation({
    mutationFn: updateCampaign,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.campaign(id!) }),
        user?.id
          ? queryClient.invalidateQueries({ queryKey: queryKeys.campaigns(user.id) })
          : Promise.resolve(),
      ])
      closeEditCampaign()
    },
    onError: () => setCampaignFormError(t('errorGeneric')),
  })

  const isCreator = !!user && !!campaign && campaign.created_by === user.id

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

  function openEditCampaign() {
    if (!campaign) return
    setCampaignForm({
      title: campaign.title,
      description: campaign.description ?? '',
      location: campaign.location ?? '',
      targetAmount: campaign.target_amount != null ? String(campaign.target_amount) : '',
      eventDate: campaign.event_date ?? '',
    })
    setCampaignFormError(null)
    setEditCampaignOpen(true)
  }

  function closeEditCampaign() {
    setEditCampaignOpen(false)
    setCampaignForm(emptyCampaignForm)
    setCampaignFormError(null)
  }

  function handleSaveCampaign(e: FormEvent) {
    e.preventDefault()
    if (!campaign || !campaignForm.title.trim()) return
    setCampaignFormError(null)

    const target = campaignForm.targetAmount.trim() ? Number(campaignForm.targetAmount) : null
    if (
      campaignForm.targetAmount.trim() &&
      (!Number.isFinite(target) || (target ?? 0) < 0)
    ) {
      setCampaignFormError(t('emptyAmount'))
      return
    }

    updateCampaignMutation.mutate({
      id: campaign.id,
      title: campaignForm.title.trim(),
      description: campaignForm.description.trim() || null,
      location: campaignForm.location.trim() || null,
      target_amount: target,
      event_date: campaignForm.eventDate || null,
    })
  }

  function handleSave(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    saveMutation.mutate()
  }

  function handleSoftDelete(d: DonationWithRecorder) {
    if (!user || !window.confirm(t('confirmDelete'))) return
    deleteMutation.mutate(d.id)
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
                  {deleted ? (
                    <span className="donation-card__badge donation-card__badge--deleted">
                      {t('deletedBadge')}
                    </span>
                  ) : null}
                  {!deleted && wasEdited ? (
                    <span className="donation-card__badge">{t('editedBadge')}</span>
                  ) : null}
                </div>
                {d.notes ? <p className="donation-card__notes">{d.notes}</p> : null}
              </div>
            </div>
            <span className="donation-card__amount">{formatMoney(Number(d.amount))}</span>
          </div>

          <div className="donation-card__meta">
            <span className="meta-with-icon">
              <IconUser size={14} />
              {t('recordedBy')} <strong>{d.recorder?.display_name || t('unknownRecorder')}</strong>
            </span>
            <span className="meta-with-icon">
              <IconCalendar size={14} />
              {formatDateTime(d.created_at)}
            </span>
            {deleted && d.deleted_at ? (
              <span className="meta-with-icon">
                <IconTrash size={14} />
                {t('deletedBy')} <strong>{d.deleter?.display_name || t('unknownRecorder')}</strong>
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
                  aria-label={t('editDonation')}
                  title={t('editDonation')}
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
                  onClick={() => handleSoftDelete(d)}
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

  if (bundleQuery.isLoading) {
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

  const error = actionError || (bundleQuery.isError ? t('errorGeneric') : null)

  return (
    <AppShell showBack hideNav title={campaign.title}>
      <div className="campaign-meta">
        {campaign.description ? <p className="campaign-desc">{campaign.description}</p> : null}
        <div className="meta-chips">
          {campaign.location ? (
            <span className="meta-chip">
              <IconMapPin size={14} />
              {campaign.location}
            </span>
          ) : null}
          {campaign.event_date ? (
            <span className="meta-chip">
              <IconCalendar size={14} />
              {formatDate(campaign.event_date)}
            </span>
          ) : null}
        </div>
        {isCreator ? (
          <button type="button" className="btn btn--secondary btn--sm" onClick={openEditCampaign}>
            <IconEdit size={16} />
            {t('editCampaign')}
          </button>
        ) : null}
      </div>

      <div className="invite-banner">
        <div className="invite-banner__text">
          <p className="invite-banner__label">
            <IconLink size={16} />
            {t('shareLink')}
          </p>
          <p className="invite-banner__code">{campaign.invite_code}</p>
          <p className="invite-banner__hint">{t('shareLinkHint')}</p>
        </div>
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => void copyInviteLink()}>
          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          {copied ? t('copied') : t('copyLink')}
        </button>
      </div>

      <div className="stats stats--single">
        <div className="stat stat--hero">
          <span className="stat__label">
            <IconRupee size={16} />
            {t('totalCollected')}
          </span>
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

      <div className="search-toolbar">
        <div className="search-wrap">
          <IconSearch className="search-wrap__icon" size={18} />
          <input
            className="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchDonations')}
            type="search"
          />
        </div>
        <button
          type="button"
          className={sort !== 'amount_desc' ? 'icon-btn icon-btn--active' : 'icon-btn'}
          onClick={() => setFiltersOpen(true)}
          aria-label={t('openFilters')}
          title={t('openFilters')}
        >
          <IconFilter />
          {sort !== 'amount_desc' ? <span className="icon-btn__dot" aria-hidden /> : null}
        </button>
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
          <IconPlus size={20} />
          {t('addDonation')}
        </button>
      </div>

      <DonationFormDrawer
        open={showForm}
        isEditing={!!editing}
        form={form}
        saving={saveMutation.isPending}
        error={formError}
        onChange={setForm}
        onSubmit={handleSave}
        onClose={closeForm}
      />

      <CampaignFormDrawer
        open={editCampaignOpen}
        isEditing
        form={campaignForm}
        saving={updateCampaignMutation.isPending}
        error={campaignFormError}
        onChange={setCampaignForm}
        onSubmit={handleSaveCampaign}
        onClose={closeEditCampaign}
      />

      <HistoryDrawer
        donation={historyDonation}
        history={historyDonation ? historyByDonation[historyDonation.id] ?? [] : []}
        onClose={() => setHistoryDonation(null)}
        formatDateTime={formatDateTime}
        formatMoney={formatMoney}
        actionLabel={actionLabel}
      />

      <FilterDrawer
        open={filtersOpen}
        title={t('sortBy')}
        active={sort !== 'amount_desc'}
        onClose={() => setFiltersOpen(false)}
        onClear={() => setSort('amount_desc')}
      >
        <p className="sort-label">{t('sortBy')}</p>
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
      </FilterDrawer>
    </AppShell>
  )
}
