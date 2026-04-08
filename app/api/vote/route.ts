import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { session_id, voter_name, gold_entry_id, silver_entry_id, bronze_entry_id } = await req.json()

    if (!session_id || !voter_name || !gold_entry_id || !silver_entry_id || !bronze_entry_id) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const db = supabaseAdmin()

    // Check session is open
    const { data: session } = await db.from('sessions').select('status').eq('id', session_id).single()
    if (!session || session.status !== 'open') {
      return NextResponse.json({ error: 'Session fermée' }, { status: 403 })
    }

    // Check voter hasn't voted yet
    const { data: existing } = await db.from('votes')
      .select('id').eq('session_id', session_id).eq('voter_name', voter_name).single()
    if (existing) {
      return NextResponse.json({ error: 'Déjà voté' }, { status: 409 })
    }

    // Validate entries belong to this session
    const ids = [gold_entry_id, silver_entry_id, bronze_entry_id]
    const { data: entries } = await db.from('entries').select('id').eq('session_id', session_id).in('id', ids)
    if (!entries || entries.length !== 3) {
      return NextResponse.json({ error: 'Entrées invalides' }, { status: 400 })
    }

    // Ensure all 3 picks are distinct
    if (new Set(ids).size !== 3) {
      return NextResponse.json({ error: 'Picks en double' }, { status: 400 })
    }

    const { error } = await db.from('votes').insert({
      session_id, voter_name: voter_name.trim(),
      gold_entry_id, silver_entry_id, bronze_entry_id,
    })

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
