'use client'

import dynamic from 'next/dynamic'
import type { DevelopmentProject } from '../actions'

const ProjectsMap = dynamic(() => import('./projects-map'), {
  ssr: false,
  loading: () => <div className="flex h-[min(70vh,720px)] min-h-[420px] items-center justify-center text-sm text-slate-400">جارٍ تحميل الخريطة...</div>,
})

export default function ProjectsMapLoader({ projects }: { projects: DevelopmentProject[] }) {
  return <ProjectsMap projects={projects} />
}