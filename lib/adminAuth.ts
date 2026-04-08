import { NextRequest } from 'next/server'

export function checkAdminAuth(req: NextRequest): boolean {
  const auth = req.headers.get('x-admin-token')
  if (!auth) return false
  try {
    const decoded = atob(auth)
    return decoded.startsWith('kreads:') && decoded.endsWith(process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '')
  } catch {
    return false
  }
}
