import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkAdminAuth } from '@/lib/adminAuth'
import { computeResults, computeBadges } from '@/lib/utils'

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { session_id } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'session_id requis' }, { status: 400 })

  const db = supabaseAdmin()

  const { data: session } = await db.from('sessions').select('*').eq('id', session_id).single()
  if (!session || session.status === 'revealed')
    return NextResponse.json({ error: 'Session invalide ou déjà révélée' }, { status: 400 })

  const [{ data: entries }, { data: votes }] = await Promise.all([
    db.from('entries').select('*').eq('session_id', session_id),
    db.from('votes').select('*').eq('session_id', session_id),
  ])

  if (!entries || !votes) return NextResponse.json({ error: 'Données manquantes' }, { status: 500 })

  const results = computeResults(entries, votes)

  // Upsert all-time scores
  for (const result of results) {
    const name = result.entry.editor_name
    const isWinner = result.rank === 1

    const { data: existing } = await db.from('scores').select('*').eq('editor_name', name).single()

    if (existing) {
      const newWins = existing.wins + (isWinner ? 1 : 0)
      const newGold = existing.gold_count + result.gold_votes
      const badges = computeBadges(newWins, newGold)
      await db.from('scores').update({
        total_points: existing.total_points + result.total_points,
        gold_count: newGold,
        silver_count: existing.silver_count + result.silver_votes,
        bronze_count: existing.bronze_count + result.bronze_votes,
        wins: newWins,
        badges,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      const newWins = isWinner ? 1 : 0
      const badges = computeBadges(newWins, result.gold_votes)
      await db.from('scores').insert({
        editor_name: name,
        total_points: result.total_points,
        gold_count: result.gold_votes,
        silver_count: result.silver_votes,
        bronze_count: result.bronze_votes,
        wins: newWins,
        badges,
      })
    }
  }

  // Mark session as revealed
  await db.from('sessions').update({
    status: 'revealed',
    revealed_at: new Date().toISOString(),
  }).eq('id', session_id)

  return NextResponse.json({ ok: true, results })
}
