import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/utils/supabase/config'

export interface AuthenticatedActor {
  id: string
  email: string | null
  fullName: string
  role: string
}

interface AdminDatabase {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; role: string }
        Insert: { id: string; full_name?: string | null; role: string }
        Update: { id?: string; full_name?: string | null; role?: string }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          actor_name: string | null
          actor_email: string | null
          action: 'add' | 'update' | 'delete'
          details: string
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_email?: string | null
          action: 'add' | 'update' | 'delete'
          details: string
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_email?: string | null
          action?: 'add' | 'update' | 'delete'
          details?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type ActorResult = { actor: AuthenticatedActor } | { error: string }
export type AdminClientResult = { client: SupabaseClient<AdminDatabase> } | { error: string }

export async function getAuthenticatedActor(): Promise<ActorResult> {
  const cookieStore = await cookies()
  const sessionClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options)
        }
      },
    },
  })

  const { data: { user }, error: authError } = await sessionClient.auth.getUser()
  if (authError) return { error: `تعذر التحقق من جلسة المستخدم: ${authError.message}` }
  if (!user) return { error: 'يجب تسجيل الدخول لإتمام هذه العملية.' }

  const { data: profile, error: profileError } = await sessionClient
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return { error: `تعذر التحقق من صلاحية المستخدم${profileError ? `: ${profileError.message}` : '.'}` }
  }

  return {
    actor: {
      id: user.id,
      email: user.email ?? null,
      fullName: profile.full_name ?? user.user_metadata?.full_name ?? '',
      role: profile.role,
    },
  }
}

export function createSupabaseAdminClient(): AdminClientResult {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return { error: 'إعداد مفتاح خدمة Supabase مفقود على الخادم.' }

  return {
    client: createClient<AdminDatabase>(SUPABASE_URL, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  }
}
