import { redirect } from 'next/navigation'
import { createSupabaseAdminClient, getAuthenticatedActor } from '@/app/actions/server-auth'
import SettingsForm from './settings-form'

export default async function SettingsPage() {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) redirect('/dashboard')

  const adminResult = createSupabaseAdminClient()
  if ('error' in adminResult) throw new Error(adminResult.error)

  const { data: settings, error } = await adminResult.client
    .from('system_settings')
    .select('id, system_name, system_logo_url, contact_email, contact_phone, address')
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`تعذر جلب إعدادات النظام: ${error.message}`)
  if (!settings) throw new Error('لم يتم العثور على إعدادات النظام. شغّل ترحيل final_admin_upgrade.sql أولاً.')

  return (
    <SettingsForm
      settings={{
        id: settings.id,
        system_name: settings.system_name,
        system_logo_url: settings.system_logo_url ?? '',
        contact_email: settings.contact_email ?? '',
        contact_phone: settings.contact_phone ?? '',
        address: settings.address ?? '',
      }}
    />
  )
}
