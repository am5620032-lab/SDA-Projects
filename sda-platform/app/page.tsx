 import Link from 'next/link'

export default function Home() {
  return (
    <main dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-8 font-sans">
      <div className="bg-white p-10 rounded-2xl shadow-xl text-center max-w-2xl w-full border-t-4 border-blue-800">
        
        <div className="mb-6 flex justify-center">
          <div className="h-28 w-28 bg-white rounded-full flex items-center justify-center border-4 border-blue-800 shadow-md overflow-hidden relative">
            <span className="text-blue-800 text-3xl font-bold">SDA</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-blue-900 mb-4 whitespace-nowrap">
          جهاز تنمية وتطوير الجنوب
        </h1>

        <p className="text-gray-500 mb-8 text-sm">
          النظام الإداري المتكامل
        </p>

        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mb-8 space-y-2">
          <p className="font-semibold">شؤون الموظفين</p>
          <p className="font-semibold">الأرشيف</p>
        </div>

        <Link href="/login" className="block bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-8 rounded-lg w-full transition-all duration-300 text-center">
          تسجيل الدخول
        </Link>
      </div>
    </main>
  );
}