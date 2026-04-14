import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/adminAuth'

// GET /api/admin/session — list all sessions with entry + vote counts
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const db = supabaseAdmin()
  const { data: sessions } = await db.from('sessions').select('*').order('created_at', { ascending: false })

  return NextResponse.json({ sessions: sessions || [] })
}

// POST /api/admin/session — create a new session
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { label, month } = await req.json()
  if (!label || !month) return NextResponse.json({ error: 'label et month requis' }, { status: 400 })

  const db = supabaseAdmin()
  const { data, error } = await db.from('sessions').insert({ label, month, status: 'open' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ session: data })
}

// PATCH /api/admin/session — update status (close or reveal)
export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id, status } = await req.json()
  if (!id || !['closed', 'revealed'].includes(status))
    return NextResponse.json({ error: 'id et status valides requis' }, { status: 400 })

  const db = supabaseAdmin()
  const update: Record<string, unknown> = { status }
  if (status === 'closed') update.closed_at = new Date().toISOString()
  if (status === 'revealed') update.revealed_at = new Date().toISOString()

  const { error } = await db.from('sessions').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
