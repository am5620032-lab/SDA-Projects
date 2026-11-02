import { notFound, redirect } from 'next/navigation'
import { getHrEmployeeId } from '@/app/actions/hr-session'
import { getClearanceCertificate } from '../../actions'
import ClearancePrintButton from '../../print-button'

export default async function ClearancePrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const employeeId = await getHrEmployeeId()
  if (!employeeId) redirect('/hr/login')
  const { id } = await params
  const result = await getClearanceCertificate(id)
  if ('error' in result) notFound()

  return (
    <main dir="rtl" className="mx-auto min-h-screen max-w-4xl bg-white p-8 text-gray-900 print:max-w-none print:p-0">
      <div className="mb-8 flex items-center justify-between border-b-2 border-gray-800 pb-5">
        <div>
          <p className="font-bold">دولة ليبيا</p>
          <h1 className="mt-2 text-xl font-black">جهاز تنمية وتطوير الجنوب</h1>
          <p className="mt-1 text-sm">إدارة الشؤون الإدارية والموارد البشرية</p>
        </div>
        <p className="text-sm">التاريخ: {result.clearance.request_date}</p>
      </div>
      <h2 className="my-12 text-center text-2xl font-black underline underline-offset-8">شهادة إخلاء طرف</h2>
      <p className="text-lg leading-10">
        تشهد إدارة الشؤون الإدارية والموارد البشرية بأن الموظف/ <strong>{result.clearance.employee_name}</strong>،
        والذي انتهت خدمته بالحالة (<strong>{result.employee_status === 'resigned' ? 'استقالة' : 'انتهاء خدمة'}</strong>)،
        قد أتم إجراءات إخلاء الطرف، وتم التحقق من إعادة العهد المسجلة باسمه.
      </p>
      <p className="mt-6 text-sm text-gray-600">رقم المعاملة: {result.clearance.id}</p>
      <div className="mt-24 grid grid-cols-2 gap-10 text-center">
        <div><p className="font-bold">المراجعة</p><p className="mt-12 border-t pt-2">الاسم والتوقيع</p></div>
        <div><p className="font-bold">مدير الشؤون الإدارية والموارد البشرية</p><p className="mt-12 border-t pt-2">الاسم والتوقيع والختم</p></div>
      </div>
      <div className="mt-10 flex justify-center"><ClearancePrintButton /></div>
    </main>
  )
}
