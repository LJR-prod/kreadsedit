import { NextRequest } from 'next/server'

export function checkAdminAuth(req: NextRequest): boolean {
  const auth = req.headers.get('x-admin-token')
  if (!auth) return false
  try {
    const decoded = Buffer.from(auth, 'base64').toString('utf-8')
    const expected = 'kreads:' + (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '')
    return decoded === expected
  } catch {
    return false
  }
}
