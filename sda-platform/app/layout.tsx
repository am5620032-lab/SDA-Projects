import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "منصة جهاز تنمية وتطوير الجنوب",
  description: "النظام الإداري المتكامل",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}