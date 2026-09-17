import { supabase } from './supabase'
import type { Campaign, DonationHistoryWithEditor, DonationWithRecorder } from '../types/database'

function makeInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export async function fetchUserCampaigns(userId: string): Promise<Campaign[]> {
  const { data: memberships, error: memErr } = await supabase
    .from('campaign_members')
    .select('campaign_id')
    .eq('user_id', userId)

  if (memErr) throw memErr

  const ids = (memberships ?? []).map((m) => m.campaign_id)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export type CreateCampaignInput = {
  title: string
  description?: string | null
  location?: string | null
  target_amount?: number | null
  event_date?: string | null
  userId: string
}

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const code = makeInviteCode()
  const { data: campaign, error: createErr } = await supabase
    .from('campaigns')
    .insert({
      title: input.title,
      description: input.description ?? null,
      location: input.location ?? null,
      target_amount: input.target_amount ?? null,
      event_date: input.event_date ?? null,
      invite_code: code,
      created_by: input.userId,
    })
    .select()
    .single()

  if (createErr || !campaign) throw createErr ?? new Error('create failed')

  const { error: memErr } = await supabase.from('campaign_members').insert({
    campaign_id: campaign.id,
    user_id: input.userId,
    role: 'owner',
  })

  if (memErr) throw memErr
  return campaign
}

export type UpdateCampaignInput = {
  id: string
  title: string
  description?: string | null
  location?: string | null
  target_amount?: number | null
  event_date?: string | null
}

export async function updateCampaign(input: UpdateCampaignInput): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .update({
      title: input.title,
      description: input.description ?? null,
      location: input.location ?? null,
      target_amount: input.target_amount ?? null,
      event_date: input.event_date ?? null,
    })
    .eq('id', input.id)
    .select()
    .single()

  if (error || !data) throw error ?? new Error('update failed')
  return data
}

export async function joinCampaignByCode(code: string): Promise<Campaign> {
  const { data, error } = await supabase.rpc('join_campaign_by_code', {
    p_code: code.trim(),
  })

  if (error || !data) throw error ?? new Error('join failed')
  return (Array.isArray(data) ? data[0] : data) as Campaign
}

export type CampaignBundle = {
  campaign: Campaign
  donations: DonationWithRecorder[]
  historyByDonation: Record<string, DonationHistoryWithEditor[]>
}

export async function fetchCampaignBundle(campaignId: string): Promise<CampaignBundle> {
  const [{ data: camp, error: campErr }, { data: dons, error: donErr }, { data: hist, error: histErr }] =
    await Promise.all([
      supabase.from('campaigns').select('*').eq('id', campaignId).single(),
      supabase
        .from('donations')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false }),
      supabase
        .from('donation_history')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false }),
    ])

  if (campErr || !camp) throw campErr ?? new Error('campaign not found')
  if (donErr) throw donErr

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

  const historyByDonation: Record<string, DonationHistoryWithEditor[]> = {}
  for (const row of hist ?? []) {
    const item: DonationHistoryWithEditor = {
      ...row,
      editor: row.changed_by
        ? { display_name: profileMap.get(row.changed_by)?.display_name ?? null }
        : null,
    }
    if (!historyByDonation[row.donation_id]) historyByDonation[row.donation_id] = []
    historyByDonation[row.donation_id].push(item)
  }

  if (histErr) {
    console.warn('donation_history unavailable', histErr.message)
  }

  return {
    campaign: camp,
    donations: (dons ?? []).map((d) => ({
      ...d,
      recorder: profileMap.get(d.recorded_by) ?? null,
      deleter: d.deleted_by
        ? { display_name: profileMap.get(d.deleted_by)?.display_name ?? null }
        : null,
    })),
    historyByDonation,
  }
}

export async function createDonation(input: {
  campaign_id: string
  donor_name: string
  amount: number
  notes: string | null
  recorded_by: string
}) {
  const { error } = await supabase.from('donations').insert(input)
  if (error) throw error
}

export async function updateDonation(input: {
  id: string
  donor_name: string
  amount: number
  notes: string | null
}) {
  const { error } = await supabase
    .from('donations')
    .update({
      donor_name: input.donor_name,
      amount: input.amount,
      notes: input.notes,
    })
    .eq('id', input.id)
  if (error) throw error
}

export async function softDeleteDonation(id: string, userId: string) {
  const { error } = await supabase
    .from('donations')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
    })
    .eq('id', id)
    .is('deleted_at', null)
  if (error) throw error
}
