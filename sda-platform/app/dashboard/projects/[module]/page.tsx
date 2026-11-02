import { notFound, redirect } from 'next/navigation'

export default async function LegacyProjectModulePage({
  params,
}: {
  params: Promise<{ module: string }>
}) {
  const { module } = await params
  if (module === 'database') redirect('/dashboard/projects')
  notFound()
}
