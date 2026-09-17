import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '../components/AppShell'
import {
  CampaignFormDrawer,
  type CampaignFormState,
} from '../components/CampaignFormDrawer'
import { FilterDrawer } from '../components/FilterDrawer'
import { JoinCampaignDrawer } from '../components/JoinCampaignDrawer'
import {
  IconCalendar,
  IconFilter,
  IconMapPin,
  IconPlus,
  IconRupee,
  IconSearch,
  IconUsers,
} from '../components/Icons'
import { useAuth } from '../auth/AuthProvider'
import { createCampaign, fetchUserCampaigns, joinCampaignByCode } from '../lib/api'
import { queryKeys } from '../lib/query'
import type { Campaign } from '../types/database'

type DateFilter = 'all' | 'upcoming' | 'past' | 'no_date'

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

function todayYmd() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function HomePage() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [campaignForm, setCampaignForm] = useState<CampaignFormState>(emptyCampaignForm)
  const [inviteCode, setInviteCode] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const campaignsQuery = useQuery({
    queryKey: queryKeys.campaigns(user?.id ?? ''),
    queryFn: () => fetchUserCampaigns(user!.id),
    enabled: !!user?.id,
  })

  const campaigns = campaignsQuery.data ?? []

  const createMutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaigns(user!.id) })
      closeCreate()
      navigate(`/campaigns/${campaign.id}`)
    },
    onError: () => setFormError(t('errorGeneric')),
  })

  const joinMutation = useMutation({
    mutationFn: (code: string) => joinCampaignByCode(code),
    onSuccess: async (campaign) => {
      if (user?.id) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.campaigns(user.id) })
      }
      closeJoin()
      navigate(`/campaigns/${campaign.id}`)
    },
    onError: () => setFormError(t('invalidCode')),
  })

  const filteredCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase()
    const today = todayYmd()

    return campaigns.filter((c) => {
      if (q) {
        const hay = `${c.title} ${c.description ?? ''} ${c.location ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }

      const event = c.event_date

      if (dateFilter === 'upcoming') {
        if (!event || event < today) return false
      } else if (dateFilter === 'past') {
        if (!event || event >= today) return false
      } else if (dateFilter === 'no_date') {
        if (event) return false
      }

      if (dateFrom && (!event || event < dateFrom)) return false
      if (dateTo && (!event || event > dateTo)) return false

      return true
    })
  }, [campaigns, search, dateFilter, dateFrom, dateTo])

  const dateFiltersActive = dateFilter !== 'all' || !!dateFrom || !!dateTo

  function clearDateFilters() {
    setDateFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  function clearAllFilters() {
    setSearch('')
    clearDateFilters()
  }

  function openCreate() {
    setCampaignForm(emptyCampaignForm)
    setFormError(null)
    setJoinOpen(false)
    setCreateOpen(true)
  }

  function closeCreate() {
    setCreateOpen(false)
    setCampaignForm(emptyCampaignForm)
    setFormError(null)
  }

  function openJoin() {
    setInviteCode('')
    setFormError(null)
    setCreateOpen(false)
    setJoinOpen(true)
  }

  function closeJoin() {
    setJoinOpen(false)
    setInviteCode('')
    setFormError(null)
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!user || !campaignForm.title.trim()) return
    setFormError(null)

    const target = campaignForm.targetAmount.trim() ? Number(campaignForm.targetAmount) : null
    if (
      campaignForm.targetAmount.trim() &&
      (!Number.isFinite(target) || (target ?? 0) < 0)
    ) {
      setFormError(t('emptyAmount'))
      return
    }

    createMutation.mutate({
      title: campaignForm.title.trim(),
      description: campaignForm.description.trim() || null,
      location: campaignForm.location.trim() || null,
      target_amount: target,
      event_date: campaignForm.eventDate || null,
      userId: user.id,
    })
  }

  function handleJoin(e: FormEvent) {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setFormError(null)
    joinMutation.mutate(inviteCode.trim())
  }

  const name = profile?.display_name ?? user?.email?.split('@')[0] ?? ''
  const listError = campaignsQuery.isError ? t('errorGeneric') : null
  const loading = campaignsQuery.isLoading

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
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            <IconPlus size={18} />
            {t('createCampaign')}
          </button>
          <button type="button" className="btn btn--secondary" onClick={openJoin}>
            <IconUsers size={18} />
            {t('joinCampaign')}
          </button>
        </div>
      </section>

      {listError ? <p className="form-error">{listError}</p> : null}

      <div className="section-head">
        <h2>{t('myCampaigns')}</h2>
      </div>

      {!loading && campaigns.length > 0 ? (
        <div className="search-toolbar">
          <div className="search-wrap">
            <IconSearch className="search-wrap__icon" size={18} />
            <input
              className="search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchGroups')}
            />
          </div>
          <button
            type="button"
            className={dateFiltersActive ? 'icon-btn icon-btn--active' : 'icon-btn'}
            onClick={() => setFiltersOpen(true)}
            aria-label={t('openFilters')}
            title={t('openFilters')}
          >
            <IconFilter />
            {dateFiltersActive ? <span className="icon-btn__dot" aria-hidden /> : null}
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="muted">{t('loading')}</p>
      ) : campaigns.length === 0 ? (
        <div className="empty">
          <p className="empty__title">{t('noCampaigns')}</p>
          <p className="empty__hint">{t('noCampaignsHint')}</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="empty">
          <p className="empty__title">{t('noMatchingGroups')}</p>
          <p className="empty__hint">{t('noMatchingGroupsHint')}</p>
          <button type="button" className="btn btn--secondary" onClick={clearAllFilters}>
            {t('clearFilters')}
          </button>
        </div>
      ) : (
        <ul className="campaign-list">
          {filteredCampaigns.map((c: Campaign) => (
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
                  {c.location ? (
                    <span className="meta-with-icon">
                      <IconMapPin size={14} />
                      {c.location}
                    </span>
                  ) : null}
                  {c.event_date ? (
                    <span className="meta-with-icon">
                      <IconCalendar size={14} />
                      {formatDate(c.event_date)}
                    </span>
                  ) : null}
                  {c.target_amount != null ? (
                    <span className="meta-with-icon">
                      <IconRupee size={14} />
                      {t('goal')}: ₹{Number(c.target_amount).toLocaleString('en-IN')}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CampaignFormDrawer
        open={createOpen}
        isEditing={false}
        form={campaignForm}
        saving={createMutation.isPending}
        error={formError}
        onChange={setCampaignForm}
        onSubmit={handleCreate}
        onClose={closeCreate}
      />

      <JoinCampaignDrawer
        open={joinOpen}
        inviteCode={inviteCode}
        saving={joinMutation.isPending}
        error={formError}
        onChange={setInviteCode}
        onSubmit={handleJoin}
        onClose={closeJoin}
      />

      <FilterDrawer
        open={filtersOpen}
        title={t('filterByEventDate')}
        active={dateFiltersActive}
        onClose={() => setFiltersOpen(false)}
        onClear={clearDateFilters}
      >
        <p className="sort-label">{t('filterByEventDate')}</p>
        <div className="sort-row" role="group" aria-label={t('filterByEventDate')}>
          {(
            [
              ['all', t('dateFilterAll')],
              ['upcoming', t('dateFilterUpcoming')],
              ['past', t('dateFilterPast')],
              ['no_date', t('dateFilterNoDate')],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={dateFilter === key ? 'chip is-active' : 'chip'}
              onClick={() => setDateFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="field-grid">
          <label className="field">
            <span className="field__label">
              <IconCalendar size={16} />
              {t('eventDateFrom')}
            </span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">
              <IconCalendar size={16} />
              {t('eventDateTo')}
            </span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
        </div>
      </FilterDrawer>
    </AppShell>
  )
}
