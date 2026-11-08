import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "منصة الجنوب الرقمية للتنمية والاستثمار | South Digital Development Platform",
  description: "المنظومة الحكومية المؤسسية الرقمية الموحدة - جهاز تنمية وتطوير الجنوب",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
