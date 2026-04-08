'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { computeResults } from '@/lib/utils'
import type { Session, Entry, Vote, SessionResult } from '@/lib/types'

const RANK_MEDAL = ['', '🥇', '🥈', '🥉']
const RANK_LABEL = ['', 'Or — Vainqueur du mois', 'Argent', 'Bronze']
const RANK_STYLE: Record<number, { bg: string; borderLeft: string }> = {
  1: { bg: '#fff9e6', borderLeft: '6px solid #c9a000' },
  2: { bg: '#f0f4f7', borderLeft: '6px solid #7a8fa0' },
  3: { bg: '#fdf3e7', borderLeft: '6px solid #a0622a' },
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
    for (let rank = total; rank >= 1; rank--) {
      setTimeout(() => setRevealed(prev => [...prev, rank]), (total - rank + 1) * 1300)
    }
  }

  const top3 = results.slice(0, 3)
  const totalVoters = results.reduce((acc, r) => Math.max(acc, r.gold_votes + r.silver_votes + r.bronze_votes), 0)

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--cream)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span className="font-display" style={{ fontSize:13, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888' }}>Chargement...</span>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--cream)' }}>
      {/* Kreads stripes */}
      <div style={{ height:6, background:'var(--ink)' }} />
      <div style={{ height:6, background:'var(--turq)' }} />

      {/* Header centré */}
      <div style={{ maxWidth:860, margin:'0 auto', padding:'36px 32px 28px', textAlign:'center', borderBottom:'var(--border)' }}>
        <div className="font-display" style={{ fontSize:11, fontWeight:900, letterSpacing:'0.15em', textTransform:'uppercase', color:'#888', marginBottom:8 }}>
          Résultats officiels
        </div>
        <div className="font-display" style={{ fontSize:'clamp(40px, 6vw, 72px)', fontWeight:900, textTransform:'uppercase', letterSpacing:'-0.02em', lineHeight:0.92 }}>
          Kreads<br />Edit Battle
        </div>
        {session && (
          <p style={{ fontSize:14, color:'#666', marginTop:10 }}>
            {session.label} · {totalVoters} votants · {results.length} montages
          </p>
        )}
      </div>

      {!session ? (
        <div style={{ maxWidth:520, margin:'0 auto', padding:'60px 32px', textAlign:'center' }}>
          <div className="font-display" style={{ fontSize:36, fontWeight:900, textTransform:'uppercase', marginBottom:12 }}>Pas encore de résultats</div>
          <p style={{ fontSize:14, color:'#666', marginBottom:24 }}>La cérémonie aura lieu à la fin de la session.</p>
          <button className="btn-ghost" style={{ maxWidth:280, margin:'0 auto' }} onClick={() => router.push('/')}>Retour au vote</button>
        </div>
      ) : (
        <>
          {/* Podium — centré */}
          <div style={{ maxWidth:860, margin:'0 auto' }}>
            {[...top3].reverse().map(result => {
              const rank = result.rank
              const isRevealed = revealed.includes(rank)
              const style = RANK_STYLE[rank] || { bg: 'transparent', borderLeft: '6px solid #ccc' }
              return (
                <div key={result.entry.id} style={{
                  display:'flex', alignItems:'center', gap:20, padding:'24px 32px',
                  borderBottom:'var(--border)',
                  background: isRevealed ? style.bg : 'var(--cream)',
                  borderLeft: isRevealed ? style.borderLeft : '6px solid transparent',
                  opacity: started ? (isRevealed ? 1 : 0.1) : 1,
                  transform: isRevealed ? 'translateY(0)' : started ? 'translateY(4px)' : 'none',
                  transition: 'all 0.55s ease',
                }}>
                  <span style={{ fontSize:48, flexShrink:0 }}>{RANK_MEDAL[rank]}</span>
                  <div style={{ flex:1 }}>
                    <div className="font-display" style={{ fontSize:11, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888', marginBottom:4 }}>
                      {RANK_LABEL[rank]}
                    </div>
                    <div className="font-display" style={{ fontSize:22, fontWeight:900, textTransform:'uppercase' }}>
                      Montage #{result.entry.display_number}
                    </div>
                    <div style={{ fontSize:13, color:'#888', marginTop:2 }}>
                      {result.total_points} pts · {result.gold_votes + result.silver_votes + result.bronze_votes} votes
                    </div>
                  </div>
                  <div className="font-display" style={{
                    fontSize: rank === 1 ? 32 : 24, fontWeight:900, textTransform:'uppercase',
                    color: rank === 1 ? '#c9a000' : 'var(--ink)', flexShrink:0,
                    filter: (isRevealed || !started) ? 'blur(0)' : 'blur(12px)',
                    transition: 'filter 0.5s ease 0.2s',
                  }}>
                    {result.entry.editor_name}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Classement complet */}
          {results.length > 3 && (!started || revealed.length >= Math.min(top3.length, 3)) && (
            <div style={{ maxWidth:860, margin:'0 auto', padding:'20px 32px' }}>
              <div className="font-display" style={{ fontSize:11, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888', marginBottom:14 }}>
                Classement complet
              </div>
              {results.slice(3).map(r => (
                <div key={r.entry.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #0d0d0d12' }}>
                  <span className="font-display" style={{ fontSize:14, fontWeight:700, color:'#888', width:24 }}>#{r.rank}</span>
                  <span className="font-display" style={{ fontSize:15, fontWeight:700, flex:1, textTransform:'uppercase' }}>{r.entry.editor_name}</span>
                  <span className="font-display" style={{ fontSize:13, fontWeight:700, color:'#888' }}>{r.total_points} pts</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div style={{ maxWidth:860, margin:'0 auto', padding:'28px 32px', textAlign:'center' }}>
            {!started ? (
              <button className="btn-turq" onClick={triggerReveal}>Déclencher la révélation →</button>
            ) : revealed.length < Math.min(top3.length, 3) ? (
              <div className="font-display" style={{ fontSize:13, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#888' }}>
                Révélation en cours...
              </div>
            ) : (
              <button className="btn-ghost" style={{ maxWidth:300, margin:'0 auto' }} onClick={() => router.push('/')}>
                Retour à l&apos;accueil
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
