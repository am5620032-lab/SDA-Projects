import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/utils/supabase/config'
import UsersClient from './users-client'

export default async function UsersPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components cannot persist refreshed cookies; middleware handles that.
        }
      },
    },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) throw new Error(`تعذر التحقق من جلسة المستخدم: ${authError.message}`)
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) throw new Error(`تعذر التحقق من صلاحية المستخدم: ${profileError.message}`)
  if (profile?.role !== 'it_manager') redirect('/dashboard')

  return <UsersClient currentUserId={user.id} />
}
