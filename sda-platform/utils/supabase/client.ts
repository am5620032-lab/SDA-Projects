 import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    'https://wwkqubtedygxwmjhhoza.supabase.co',
    'sb_publishable_ifIVn5dWU46YAL8u_9Tyew_T5B8CtRu'
  )
}