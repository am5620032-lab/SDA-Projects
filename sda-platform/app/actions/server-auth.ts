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

export interface AdminDatabase {
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
      departments: {
        Row: {
          id: string
          name: string
          type: string
          parent_id: string | null
          manager_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          parent_id?: string | null
          manager_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          parent_id?: string | null
          manager_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          id: string
          full_name: string
          employee_number: string | null
          national_id: string | null
          work_start_date: string | null
          birth_date: string | null
          birth_place: string | null
          nationality: string | null
          social_status: string | null
          gender: string | null
          qualification: string | null
          major: string | null
          university: string | null
          hire_date: string | null
          job_title: string | null
          department: string | null
          grade: string | null
          category: string | null
          rank: string | null
          last_promotion_date: string | null
          basic_salary: number | null
          variable_salary: number | null
          phone: string | null
          address: string | null
          email: string | null
          employment_status: string | null
          delegation_entity: string | null
          branch: string | null
          job_type: string | null
          notes: string | null
          photo_url: string | null
          delegation_start_date: string | null
          delegation_end_date: string | null
          leave_balance: number | null
          department_id: string | null
          direct_manager_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          employee_number?: string | null
          national_id?: string | null
          birth_place?: string | null
          nationality?: string | null
          social_status?: string | null
          gender?: string | null
          address?: string | null
          email?: string | null
          job_title?: string | null
          department?: string | null
          category?: string | null
          rank?: string | null
          last_promotion_date?: string | null
          delegation_start_date?: string | null
          delegation_end_date?: string | null
          leave_balance?: number | null
          department_id?: string | null
          direct_manager_id?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          employee_number?: string | null
          national_id?: string | null
          work_start_date?: string | null
          birth_date?: string | null
          birth_place?: string | null
          nationality?: string | null
          social_status?: string | null
          gender?: string | null
          qualification?: string | null
          major?: string | null
          university?: string | null
          hire_date?: string | null
          job_title?: string | null
          department?: string | null
          grade?: string | null
          category?: string | null
          rank?: string | null
          last_promotion_date?: string | null
          basic_salary?: number | null
          variable_salary?: number | null
          phone?: string | null
          address?: string | null
          email?: string | null
          employment_status?: string | null
          delegation_entity?: string | null
          branch?: string | null
          job_type?: string | null
          notes?: string | null
          photo_url?: string | null
          delegation_start_date?: string | null
          delegation_end_date?: string | null
          leave_balance?: number | null
          department_id?: string | null
          direct_manager_id?: string | null
        }
        Relationships: []
      }
      module_access: {
        Row: {
          id: string
          employee_id: string
          module_name: 'archive' | 'hr'
          username: string
          password_hash: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          module_name: 'archive' | 'hr'
          username: string
          password_hash: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          module_name?: 'archive' | 'hr'
          username?: string
          password_hash?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      leaves: {
        Row: {
          id: string
          employee_id: string
          leave_type: string
          start_date: string
          end_date: string
          days_count: number
          notes: string | null
          status: string
          manager_id: string | null
          manager_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          leave_type: string
          start_date: string
          end_date: string
          days_count: number
          notes?: string | null
          status?: string
          manager_id?: string | null
          manager_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          leave_type?: string
          start_date?: string
          end_date?: string
          days_count?: number
          notes?: string | null
          status?: string
          manager_id?: string | null
          manager_notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          id: string
          employee_id: string
          asset_name: string
          serial_number: string | null
          status: string
          delivered_date: string
          returned_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          asset_name: string
          serial_number?: string | null
          status?: string
          delivered_date?: string
          returned_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          asset_name?: string
          serial_number?: string | null
          status?: string
          delivered_date?: string
          returned_date?: string | null
          created_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          employee_id: string
          document_type: string
          file_url: string
          file_name: string
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          document_type: string
          file_url: string
          file_name: string
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          document_type?: string
          file_url?: string
          file_name?: string
          created_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          id: string
          employee_id: string
          check_in: string
          check_out: string | null
          status: string | null
          late_minutes: number | null
        }
        Insert: {
          id?: string
          employee_id: string
          check_in: string
          check_out?: string | null
          status?: string | null
          late_minutes?: number | null
        }
        Update: {
          id?: string
          employee_id?: string
          check_in?: string
          check_out?: string | null
          status?: string | null
          late_minutes?: number | null
        }
        Relationships: []
      }
      hr_decisions: {
        Row: {
          id: string
          employee_id: string
          decision_type: string
          decision_number: string
          decision_date: string
          details: string
          old_value: string | null
          new_value: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          decision_type: string
          decision_number: string
          decision_date: string
          details: string
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          decision_type?: string
          decision_number?: string
          decision_date?: string
          details?: string
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
        Relationships: []
      }
      leave_types: {
        Row: { id: string; name: string; max_days_per_year: number }
        Insert: { id?: string; name: string; max_days_per_year: number }
        Update: { id?: string; name?: string; max_days_per_year?: number }
        Relationships: []
      }
      permissions: {
        Row: {
          id: string
          employee_id: string
          date: string
          duration_hours: number
          reason: string
          status: string
          manager_id: string | null
          manager_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          date: string
          duration_hours: number
          reason: string
          status?: string
          manager_id?: string | null
          manager_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          date?: string
          duration_hours?: number
          reason?: string
          status?: string
          manager_id?: string | null
          manager_notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      penalties: {
        Row: {
          id: string
          employee_id: string
          violation_type: string
          description: string
          decision_number: string
          decision_date: string
          penalty_type: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          violation_type: string
          description: string
          decision_number: string
          decision_date: string
          penalty_type: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          violation_type?: string
          description?: string
          decision_number?: string
          decision_date?: string
          penalty_type?: string
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      trainings: {
        Row: {
          id: string
          employee_id: string
          course_name: string
          provider: string | null
          start_date: string
          end_date: string | null
          certificate_url: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          course_name: string
          provider?: string | null
          start_date: string
          end_date?: string | null
          certificate_url?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          course_name?: string
          provider?: string | null
          start_date?: string
          end_date?: string | null
          certificate_url?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          id: string
          employee_id: string
          year: number
          evaluator_id: string | null
          score: number
          notes: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          year: number
          evaluator_id?: string | null
          score: number
          notes?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          year?: number
          evaluator_id?: string | null
          score?: number
          notes?: string | null
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      clearances: {
        Row: {
          id: string
          employee_id: string
          request_date: string
          status: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          request_date?: string
          status?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          request_date?: string
          status?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      correspondences: {
        Row: {
          id: string
          type: string
          reference_number: string
          subject: string
          date: string
          related_employee_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          reference_number: string
          subject: string
          date: string
          related_employee_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          reference_number?: string
          subject?: string
          date?: string
          related_employee_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          employee_id: string
          title: string
          message: string
          link: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          title: string
          message: string
          link?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          title?: string
          message?: string
          link?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      archive_documents: {
        Row: {
          id: string
          document_number: string
          document_name: string
          document_type: string
          classification: string
          employee_id: string | null
          file_url: string
          file_type: string
          status: string
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          document_number: string
          document_name: string
          document_type: string
          classification: string
          employee_id?: string | null
          file_url: string
          file_type: string
          status?: string
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          document_number?: string
          document_name?: string
          document_type?: string
          classification?: string
          employee_id?: string | null
          file_url?: string
          file_type?: string
          status?: string
          uploaded_by?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      next_archive_document_number: {
        Args: { p_document_type: string; p_document_year: number }
        Returns: string
      }
    }
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
