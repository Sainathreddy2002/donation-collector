import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'
import { appUrl } from '../lib/urls'

function googleAvatar(user: User) {
  const meta = user.user_metadata ?? {}
  return (meta.avatar_url || meta.picture || null) as string | null
}

function googleName(user: User) {
  const meta = user.user_metadata ?? {}
  return (meta.full_name || meta.name || null) as string | null
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  avatarUrl: string | null
  loading: boolean
  signInWithGoogle: (redirectTo?: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const syncProfile = useCallback(async (user: User) => {
    const avatar = googleAvatar(user)
    const name = googleName(user)

    const { data: existing } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()

    const next = {
      id: user.id,
      display_name: existing?.display_name || name,
      phone: existing?.phone ?? null,
      avatar_url: avatar || existing?.avatar_url || null,
    }

    const { data } = await supabase.from('profiles').upsert(next).select().maybeSingle()
    setProfile(data ?? { ...next, created_at: existing?.created_at ?? new Date().toISOString() })
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return
    await syncProfile(session.user)
  }, [syncProfile, session?.user])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        void syncProfile(data.session.user)
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (next?.user) {
        void syncProfile(next.user)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [syncProfile])

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || appUrl('/'),
      },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const avatarUrl = profile?.avatar_url || (session?.user ? googleAvatar(session.user) : null)

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      avatarUrl,
      loading,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }),
    [session, profile, avatarUrl, loading, signInWithGoogle, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
