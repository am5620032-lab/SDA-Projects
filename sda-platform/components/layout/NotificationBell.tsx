'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getMyNotifications, markAllAsRead, markAsRead } from '@/app/actions/notifications'
import type { EmployeeNotification } from '@/app/actions/notifications'

export default function NotificationBell({
  initialNotifications,
}: {
  initialNotifications: EmployeeNotification[]
}) {
  const router = useRouter()
  const [notifications, setNotifications] = useState(initialNotifications)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const result = await getMyNotifications()
    if ('error' in result) {
      setError(result.error)
      return
    }
    setError('')
    setNotifications(result.notifications)
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => { void refresh() }, 60_000)
    return () => window.clearInterval(intervalId)
  }, [refresh])

  const unreadCount = notifications.filter((notification) => !notification.is_read).length
  const openNotification = async (notification: EmployeeNotification) => {
    if (!notification.is_read) {
      const result = await markAsRead(notification.id)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setNotifications((current) => current.map((item) => item.id === notification.id
        ? { ...item, is_read: true }
        : item))
    }
    setOpen(false)
    if (notification.link) router.push(notification.link)
  }

  const readAll = async () => {
    const result = await markAllAsRead()
    if ('error' in result) {
      setError(result.error)
      return
    }
    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })))
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current)
          if (!open) void refresh()
        }}
        aria-label={`الإشعارات غير المقروءة: ${unreadCount}`}
        aria-expanded={open}
        className="relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
      >
        <Bell size={18} aria-hidden="true" />
        <span>الإشعارات</span>
        {unreadCount > 0 && (
          <span className="mr-auto min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-xs font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-white shadow-xl" aria-label="قائمة الإشعارات">
          <header className="flex items-center justify-between border-b p-3">
            <h2 className="font-bold text-gray-800">آخر الإشعارات</h2>
            {unreadCount > 0 && (
              <button type="button" onClick={() => void readAll()} className="inline-flex items-center gap-1 text-xs font-semibold text-[#157A3F] hover:underline">
                <CheckCheck size={14} aria-hidden="true" /> قراءة الكل
              </button>
            )}
          </header>
          {error && <p role="alert" className="p-3 text-xs text-red-700">{error}</p>}
          {notifications.length === 0 ? (
            <p className="p-5 text-center text-sm text-gray-500">لا توجد إشعارات.</p>
          ) : (
            <ul className="max-h-96 divide-y overflow-y-auto">
              {notifications.slice(0, 5).map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => void openNotification(notification)}
                    className={`w-full px-4 py-3 text-right transition hover:bg-gray-50 ${notification.is_read ? 'bg-white' : 'bg-emerald-50/60'}`}
                  >
                    <span className="flex items-start gap-2">
                      {!notification.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" />}
                      <span>
                        <span className="block text-sm font-bold text-gray-800">{notification.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-gray-600">{notification.message}</span>
                        <time className="mt-1 block text-[11px] text-gray-400" dateTime={notification.created_at}>
                          {new Intl.DateTimeFormat('ar-LY', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(notification.created_at))}
                        </time>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
