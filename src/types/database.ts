export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          phone: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          id: string
          title: string
          description: string | null
          location: string | null
          target_amount: number | null
          event_date: string | null
          invite_code: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          location?: string | null
          target_amount?: number | null
          event_date?: string | null
          invite_code: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          location?: string | null
          target_amount?: number | null
          event_date?: string | null
          invite_code?: string
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      campaign_members: {
        Row: {
          campaign_id: string
          user_id: string
          role: 'owner' | 'member'
          joined_at: string
        }
        Insert: {
          campaign_id: string
          user_id: string
          role?: 'owner' | 'member'
          joined_at?: string
        }
        Update: {
          campaign_id?: string
          user_id?: string
          role?: 'owner' | 'member'
          joined_at?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          id: string
          campaign_id: string
          donor_name: string
          amount: number
          notes: string | null
          recorded_by: string
          updated_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          donor_name: string
          amount: number
          notes?: string | null
          recorded_by: string
          updated_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          donor_name?: string
          amount?: number
          notes?: string | null
          recorded_by?: string
          updated_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      donation_history: {
        Row: {
          id: string
          donation_id: string
          campaign_id: string
          action: 'created' | 'updated' | 'deleted'
          donor_name: string
          amount: number
          notes: string | null
          previous_donor_name: string | null
          previous_amount: number | null
          previous_notes: string | null
          changed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          donation_id: string
          campaign_id: string
          action: 'created' | 'updated' | 'deleted'
          donor_name: string
          amount: number
          notes?: string | null
          previous_donor_name?: string | null
          previous_amount?: number | null
          previous_notes?: string | null
          changed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          donation_id?: string
          campaign_id?: string
          action?: 'created' | 'updated' | 'deleted'
          donor_name?: string
          amount?: number
          notes?: string | null
          previous_donor_name?: string | null
          previous_amount?: number | null
          previous_notes?: string | null
          changed_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      join_campaign_by_code: {
        Args: { p_code: string }
        Returns: {
          id: string
          title: string
          description: string | null
          location: string | null
          target_amount: number | null
          event_date: string | null
          invite_code: string
          created_by: string
          created_at: string
        }
      }
      generate_invite_code: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type Donation = Database['public']['Tables']['donations']['Row']
export type DonationHistory = Database['public']['Tables']['donation_history']['Row']

export type DonationWithRecorder = Donation & {
  recorder: Pick<Profile, 'display_name' | 'avatar_url'> | null
  deleter: Pick<Profile, 'display_name'> | null
}

export type DonationHistoryWithEditor = DonationHistory & {
  editor: Pick<Profile, 'display_name'> | null
}
