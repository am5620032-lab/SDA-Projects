'use client'

import { useEffect, useState } from 'react'
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  Globe,
  LogOut,
  Moon,
  Search,
  Shield,
  Sun,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { logoutFromPlatform } from '@/app/actions/logout'

interface UserProfile {
  fullName: string
  role: string
  department?: string
}

export default function Header() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile>({
    fullName: 'المستخدم',
    role: 'موظف',
    department: 'جهاز تنمية وتطوير الجنوب',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single()

        if (data) {
          const roleMap: Record<string, string> = {
            president: 'رئيس الجهاز',
            vice_president: 'نائب رئيس الجهاز',
            admin_manager: 'مدير الإدارة',
            dept_head: 'رئيس قسم',
            employee: 'موظف مختص',
            it_manager: 'مدير تقنية المعلومات',
            auditor: 'مسؤول التدقيق',
            admin: 'مدير النظام',
          }

          setProfile({
            fullName: data.full_name || user.email || 'مستخدم النظام',
            role: roleMap[data.role] || data.role,
            department: 'جهاز تنمية وتطوير الجنوب',
          })
        }
      } catch (err) {
        console.error('Failed to load user profile in header:', err)
      }
    }

    void fetchUser()
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    // Route to projects database with search filter
    router.push(`/dashboard/projects/database?search=${encodeURIComponent(searchQuery.trim())}`)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 backdrop-blur-md md:px-6">
      {/* Search Input */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث شامل في المنظومة (المشروعات، العقود، الأراضي...)..."
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2 pr-10 pl-4 text-xs text-white placeholder-slate-400 transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </form>
      </div>

      {/* Actions & User Info */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* Date Display */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-400 border-l border-white/10 pl-4">
          <CalendarDays size={16} className="text-emerald-400" />
          <span>{new Intl.DateTimeFormat('ar-LY', { dateStyle: 'full' }).format(new Date())}</span>
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 transition-all hover:bg-white/10 focus:outline-none"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-sm">
              {profile.fullName.charAt(0)}
            </div>
            <div className="hidden sm:block text-right text-xs">
              <p className="font-bold text-white">{profile.fullName}</p>
              <p className="text-[10px] text-emerald-400">{profile.role}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute left-0 mt-2 w-56 rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-2xl backdrop-blur-xl">
              <div className="px-3 py-2 border-b border-white/10 text-xs">
                <p className="font-bold text-white">{profile.fullName}</p>
                <p className="text-[11px] text-emerald-400 mt-0.5">{profile.role}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{profile.department}</p>
              </div>
              <div className="py-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  <Shield size={15} className="text-emerald-400" />
                  إعدادات الحساب والأمان
                </Link>
                <form action={logoutFromPlatform}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10"
                  >
                    <LogOut size={15} />
                    تسجيل الخروج
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
