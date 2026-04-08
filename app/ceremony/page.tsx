'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { computeResults } from '@/lib/utils'
import type { Session, Entry, Vote, SessionResult } from '@/lib/types'

const RANK_MEDAL = ['', '🥇', '🥈', '🥉']
const RANK_LABEL = ['', 'Or — Vainqueur du mois', 'Argent', 'Bronze']
const RANK_STYLE: Record<number, { bg: string; borderLeft: string }> = {
  1: { bg: '#fff9e6', borderLeft: '6px solid var(--gold)' },
  2: { bg: '#f0f4f7', borderLeft: '6px solid var(--silver)' },
  3: { bg: '#fdf3e7', borderLeft: '6px solid var(--bronze)' },
}

export default function CeremonyPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [results, setResults] = useState<SessionResult[]>([])
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState<number[]>([])
  const [started, setStarted] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: sess } = await supabase
      .from('sessions').select('*').eq('status', 'revealed')
      .order('revealed_at', { ascending: false }).limit(1).single()

    if (!sess) { setLoading(false); return }
    setSession(sess)

    const [{ data: entries }, { data: votes }] = await Promise.all([
      supabase.from('entries').select('*').eq('session_id', sess.id),
      supabase.from('votes').select('*').eq('session_id', sess.id),
    ])

    if (entries && votes) setResults(computeResults(entries as Entry[], votes as Vote[]))
    setLoading(false)
  }

  function triggerReveal() {
    setStarted(true)
    setRevealed([])
    const total = Math.min(results.length, 3)
    // Reveal: bronze first, then silver, then gold
    for (let rank = total; rank >= 1; rank--) {
      const delay = (total - rank + 1) * 1300
      setTimeout(() => setRevealed(prev => [...prev, rank]), delay)
    }
  }

  const top3 = results.slice(0, 3)
  const totalVoters = results.reduce((acc, r) => Math.max(acc, r.gold_votes + r.silver_votes + r.bronze_votes), 0)

  if (loading) return <Loader />

  return (
    <div>
      {/* Kreads signature stripes */}
      <div style={{ height:6, background:'var(--ink)' }} />
      <div style={{ height:6, background:'var(--turq)' }} />

      {/* Header */}
      <div style={{ padding:'28px 20px 20px', textAlign:'center', borderBottom:'var(--border)' }}>
        <div className="font-display" style={{ fontSize:11, fontWeight:900, letterSpacing:'0.15em', textTransform:'uppercase', color:'#888', marginBottom:6 }}>
          Résultats officiels
        </div>
        <div className="font-display" style={{ fontSize:42, fontWeight:900, textTransform:'uppercase', letterSpacing:'-0.02em', lineHeight:0.95 }}>
          Kreads<br />Edit Battle
        </div>
        {session && (
          <p style={{ fontSize:13, color:'#666', marginTop:8 }}>
            {session.label} · {totalVoters} votants · {results.length} montages
          </p>
        )}
      </div>

      {!session ? (
        <div style={{ padding:'40px 20px', textAlign:'center' }}>
          <div className="font-display" style={{ fontSize:32, fontWeight:900, textTransform:'uppercase', marginBottom:12 }}>
            Pas encore de résultats
          </div>
          <p style={{ fontSize:14, color:'#666', marginBottom:24 }}>La cérémonie aura lieu à la fin de la session.</p>
          <button className="btn-ghost" style={{ maxWidth:280, margin:'0 auto' }} onClick={() => router.push('/')}>
            Retour au vote
          </button>
        </div>
      ) : (
        <>
          {/* Reveal cards — shown in order bronze → silver → gold */}
          <div>
            {[...top3].reverse().map((result) => {
              const rank = result.rank
              const isRevealed = revealed.includes(rank)
              const style = RANK_STYLE[rank] || { bg: 'transparent', borderLeft: '6px solid #ccc' }

              return (
                <div key={result.entry.id} style={{
                  display:'flex', alignItems:'center', gap:16, padding:'20px',
                  borderBottom:'var(--border)',
                  background: isRevealed ? style.bg : 'var(--cream)',
                  borderLeft: isRevealed ? style.borderLeft : '6px solid transparent',
                  opacity: started ? (isRevealed ? 1 : 0.12) : 1,
                  transform: isRevealed ? 'translateY(0)' : started ? 'translateY(4px)' : 'none',
                  transition:'all 0.55s ease',
                }}>
                  <span style={{ fontSize:36, flexShrink:0 }}>{RANK_MEDAL[rank]}</span>
                  <div style={{ flex:1 }}>
                    <div className="font-display" style={{ fontSize:10, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888', marginBottom:2 }}>
                      {RANK_LABEL[rank]}
                    </div>
                    <div className="font-display" style={{ fontSize:17, fontWeight:900, textTransform:'uppercase' }}>
                      Montage #{result.entry.display_number}
                    </div>
                    <div style={{ fontSize:12, color:'#888', marginTop:1 }}>
                      {result.total_points} pts · {result.gold_votes + result.silver_votes + result.bronze_votes} votes
                    </div>
                  </div>
                  {/* Author — blurred until revealed */}
                  <div className="font-display" style={{
                    fontSize: rank === 1 ? 24 : 19, fontWeight:900, textTransform:'uppercase',
                    color: rank === 1 ? 'var(--gold)' : 'var(--ink)',
                    flexShrink:0,
                    filter: (isRevealed || !started) ? 'blur(0)' : 'blur(10px)',
                    transition:'filter 0.5s ease 0.15s',
                  }}>
                    {result.entry.editor_name}
                  </div>
                </div>
              )
            })}
          </div>

          {/* All results (below top 3) */}
          {results.length > 3 && (started ? revealed.length >= Math.min(top3.length, 3) : true) && (
            <div style={{ padding:'16px 20px' }}>
              <div className="font-display" style={{ fontSize:11, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888', marginBottom:12 }}>
                Classement complet
              </div>
              {results.slice(3).map(r => (
                <div key={r.entry.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #0d0d0d12' }}>
                  <span className="font-display" style={{ fontSize:13, fontWeight:700, color:'#888', width:20 }}>#{r.rank}</span>
                  <span className="font-display" style={{ fontSize:14, fontWeight:700, flex:1, textTransform:'uppercase' }}>
                    {r.entry.editor_name}
                  </span>
                  <span className="font-display" style={{ fontSize:12, fontWeight:700, color:'#888' }}>{r.total_points} pts</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div style={{ padding:'24px 20px', textAlign:'center' }}>
            {!started ? (
              <button className="btn-turq" onClick={triggerReveal}>
                Déclencher la révélation →
              </button>
            ) : revealed.length < Math.min(top3.length, 3) ? (
              <div className="font-display" style={{ fontSize:13, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#888' }}>
                Révélation en cours...
              </div>
            ) : (
              <button className="btn-ghost" style={{ maxWidth:280, margin:'0 auto' }} onClick={() => router.push('/')}>
                Retour à l&apos;accueil
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Loader() {
  return <div className="font-display" style={{ padding:'40px 20px', textAlign:'center', fontSize:13, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888' }}>Chargement...</div>
}
