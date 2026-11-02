import { redirect } from 'next/navigation'
import { getAuthenticatedActor } from '@/app/actions/server-auth'
import { getDecisionForPrint } from '../../actions'
import PrintButton from './print-button'

const decisionLabels: Record<string, string> = {
  appointment: 'تعيين',
  promotion: 'ترقية',
  job_title: 'تغيير المسمى الوظيفي',
  transfer: 'نقل',
  delegation: 'ندب',
  secondment: 'إعارة',
  allowance: 'علاوة',
  termination: 'إنهاء خدمة',
}

export default async function PrintDecisionPage({ params }: { params: Promise<{ id: string }> }) {
  const actorResult = await getAuthenticatedActor()
  if ('error' in actorResult) redirect('/login')
  if (!['it_manager', 'admin_manager'].includes(actorResult.actor.role)) redirect('/dashboard/employees')

  const { id } = await params
  const result = await getDecisionForPrint(id)
  if ('error' in result) return <main dir="rtl" className="p-10 text-center text-red-700">{result.error}</main>

  const { decision, employee } = result
  return (
    <main dir="rtl" className="mx-auto min-h-screen max-w-4xl bg-white p-8 text-gray-900 print:max-w-none print:p-0">
      <div className="mb-6 flex justify-end gap-3 print:hidden">
        <PrintButton />
        <a href="/dashboard/employees/decisions" className="rounded-lg bg-gray-100 px-5 py-2 font-bold">العودة</a>
      </div>
      <article className="min-h-[270mm] border-2 border-gray-800 p-10 print:min-h-0">
        <header className="border-b-2 border-gray-800 pb-6 text-center">
          <p className="font-bold">دولة ليبيا</p>
          <h1 className="mt-2 text-xl font-black">الجهاز الوطني للتنمية</h1>
          <p className="mt-1 text-sm">إدارة الموارد البشرية</p>
          <div className="mt-6 flex justify-between text-sm">
            <span>رقم القرار: {decision.decision_number}</span>
            <span>التاريخ: {decision.decision_date}</span>
          </div>
        </header>
        <h2 className="my-10 text-center text-2xl font-black">قرار {decisionLabels[decision.decision_type] ?? 'إداري'}</h2>
        <section className="space-y-5 text-lg leading-10">
          <p>بعد الاطلاع على التشريعات واللوائح المنظمة للعمل، وبناءً على مقتضيات مصلحة العمل،</p>
          <p>يُقرر ما يلي:</p>
          <p><strong>مادة (1):</strong> {decision.details}</p>
          <p><strong>الموظف:</strong> {employee.full_name}</p>
          <p><strong>الرقم الوظيفي:</strong> {employee.id}</p>
          {decision.old_value && <p><strong>القيمة السابقة:</strong> {decision.old_value}</p>}
          {decision.new_value && <p><strong>القيمة المعتمدة:</strong> {decision.new_value}</p>}
          <p><strong>مادة (2):</strong> يُعمل بهذا القرار من تاريخ صدوره، وعلى الجهات المختصة تنفيذه.</p>
        </section>
        <footer className="mt-24 grid grid-cols-2 gap-10 text-center">
          <div><p className="font-bold">إدارة الموارد البشرية</p><p className="mt-16">التوقيع: __________________</p></div>
          <div><p className="font-bold">رئيس الجهاز</p><p className="mt-16">التوقيع والختم: ___________</p></div>
        </footer>
      </article>
    </main>
  )
}
