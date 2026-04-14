import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/adminAuth'

// POST — add entry to session
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { session_id, editor_name, youtube_url } = await req.json()
  if (!session_id || !editor_name || !youtube_url)
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })

  const db = supabaseAdmin()

  // Check session is open
  const { data: sess } = await db.from('sessions').select('status').eq('id', session_id).single()
  if (!sess || sess.status !== 'open')
    return NextResponse.json({ error: 'Session non ouverte' }, { status: 403 })

  // Get next display_number
  const { data: existing } = await db.from('entries').select('display_number').eq('session_id', session_id).order('display_number', { ascending: false }).limit(1)
  const nextNum = existing && existing.length > 0 ? existing[0].display_number + 1 : 1

  const { data, error } = await db.from('entries').insert({
    session_id,
    editor_name: editor_name.trim(),
    youtube_url: youtube_url.trim(),
    display_number: nextNum,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

// DELETE — remove entry
export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const db = supabaseAdmin()
  const { error } = await db.from('entries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
