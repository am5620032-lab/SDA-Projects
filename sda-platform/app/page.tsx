 import Link from 'next/link'

export default function Home() {
  return (
    <main dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8 font-sans">
      <div className="bg-white p-10 rounded-2xl shadow-xl text-center max-w-2xl w-full border-t-8 border-[#157A3F]">
        
        <div className="mb-6 flex justify-center">
          <div className="h-32 w-32 bg-white rounded-full flex items-center justify-center border-4 border-[#157A3F] shadow-md overflow-hidden relative">
            {/* هنا سنضع الشعار لاحقاً */}
            <span className="text-[#157A3F] text-3xl font-bold">SDA</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-[#157A3F] mb-2 whitespace-nowrap">
          جهاز تنمية وتطوير الجنوب
        </h1>
        <p className="text-[#F4B41A] font-semibold mb-8">
          Southern Development Authority
        </p>

        <Link href="/login" className="block bg-[#157A3F] hover:bg-[#0f5c2e] text-white font-bold py-3 px-8 rounded-lg w-full transition-all duration-300 text-center">
          تسجيل الدخول
        </Link>
      </div>
    </main>
  );
}