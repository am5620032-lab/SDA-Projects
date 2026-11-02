'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/utils/supabase/config'

export async function logoutFromPlatform() {
  const cookieStore = await cookies()
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options)
        }
      },
    },
  })

  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(`تعذر تسجيل الخروج من المنصة: ${error.message}`)

  cookieStore.delete('archive_access_token')
  cookieStore.delete('hr_access_token')
  redirect('/login')
}
