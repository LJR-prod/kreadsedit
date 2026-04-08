'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getVoter, hasVoted, markVoted, ytThumb } from '@/lib/utils'
import type { Entry, Session } from '@/lib/types'

type Medal = 'gold' | 'silver' | 'bronze'
const MEDALS: Medal[] = ['gold', 'silver', 'bronze']
const EMOJI: Record<Medal, string> = { gold: '🥇', silver: '🥈', bronze: '🥉' }
const PTS: Record<Medal, number> = { gold: 3, silver: 2, bronze: 1 }
const LABEL: Record<Medal, string> = { gold: 'Or · 3 pts', silver: 'Argent · 2 pts', bronze: 'Bronze · 1 pt' }
const SLOT_STYLE: Record<Medal, { border: string; bg: string }> = {
  gold:   { border: 'var(--gold)',   bg: '#fff9e6' },
  silver: { border: 'var(--silver)', bg: '#f0f4f7' },
  bronze: { border: 'var(--bronze)', bg: '#fdf3e7' },
}

function VoteContent() {
  const router = useRouter()
  const params = useSearchParams()
  const sessionId = params.get('s')

  const [session, setSession] = useState<Session | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [picks, setPicks] = useState<Record<Medal, string | null>>({ gold: null, silver: null, bronze: null })
  const [voter, setVoterState] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const name = getVoter()
    if (!name || !sessionId) { router.push('/'); return }
    setVoterState(name)
    if (hasVoted(sessionId)) setDone(true)
    load()
  }, [sessionId]) // eslint-disable-line

  async function load() {
    if (!sessionId) return
    const [{ data: sess }, { data: ents }] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', sessionId).single(),
      supabase.from('entries').select('*').eq('session_id', sessionId).order('display_number'),
    ])
    if (!sess || sess.status !== 'open') { router.push('/'); return }
    setSession(sess)
    setEntries(ents || [])
    setLoading(false)
  }

  function clickEntry(id: string) {
    const cur = MEDALS.find(m => picks[m] === id)
    if (cur) { setPicks(p => ({ ...p, [cur]: null })); return }
    const free = MEDALS.find(m => !picks[m])
    if (!free) return
    setPicks(p => ({ ...p, [free]: id }))
  }

  const filled = MEDALS.filter(m => picks[m]).length

  async function submit() {
    if (filled < 3 || !session) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          voter_name: voter,
          gold_entry_id: picks.gold,
          silver_entry_id: picks.silver,
          bronze_entry_id: picks.bronze,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      markVoted(session.id)
      setDone(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur'
      alert(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loader />
  if (done) return <Confirmed picks={picks} entries={entries} onBack={() => router.push('/ceremony')} />

  return (
    <div style={{ paddingBottom: 0 }}>
      {/* Topbar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'var(--border)' }}>
        <span style={{ fontSize:14, fontWeight:500 }}>Kreads Edit</span>
        <div className="font-display" style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', background:'var(--ink)', color:'var(--cream)', padding:'5px 12px', borderRadius:4 }}>
          {voter}
        </div>
      </div>

      {/* Progress */}
      <div style={{ padding:'12px 20px', borderBottom:'var(--border)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'Barlow Condensed', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#888', marginBottom:6 }}>
          <span>Mon podium</span><span>{filled} / 3</span>
        </div>
        <div style={{ height:5, background:'#0d0d0d20', borderRadius:3 }}>
          <div style={{ height:'100%', background:'var(--turq)', borderRadius:3, width:`${(filled/3)*100}%`, transition:'width 0.3s' }} />
        </div>
      </div>

      {/* Podium slots */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, padding:'16px 20px', borderBottom:'var(--border)' }}>
        {MEDALS.map(medal => {
          const entryId = picks[medal]
          const entry = entryId ? entries.find(e => e.id === entryId) : null
          return (
            <div key={medal} onClick={() => entry && setPicks(p => ({ ...p, [medal]: null }))}
              style={{
                border: entry ? `2px solid ${SLOT_STYLE[medal].border}` : '2px dashed #0d0d0d40',
                background: entry ? SLOT_STYLE[medal].bg : 'transparent',
                borderRadius:'var(--radius)', padding:'12px 8px', textAlign:'center',
                minHeight:82, display:'flex', flexDirection:'column', alignItems:'center',
                justifyContent:'center', gap:4, cursor: entry ? 'pointer' : 'default', transition:'all 0.15s',
              }}>
              <span style={{ fontSize:20 }}>{EMOJI[medal]}</span>
              <span className="font-display" style={{ fontSize:9, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888' }}>{LABEL[medal]}</span>
              {entry && <span className="font-display" style={{ fontSize:13, fontWeight:900, textTransform:'uppercase' }}>#{entry.display_number}</span>}
            </div>
          )
        })}
      </div>

      {/* Videos list */}
      <div className="font-display" style={{ fontSize:11, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', padding:'14px 20px 6px' }}>
        Les montages du mois
      </div>

      <div style={{ paddingBottom:88 }}>
        {entries.map(entry => {
          const medal = MEDALS.find(m => picks[m] === entry.id) || null
          const thumb = ytThumb(entry.youtube_url)
          return (
            <div key={entry.id} onClick={() => clickEntry(entry.id)}
              style={{
                display:'flex', alignItems:'center', gap:12, padding:'13px 20px',
                borderBottom:'1px solid #0d0d0d14', cursor:'pointer',
                background: medal ? SLOT_STYLE[medal].bg : 'transparent',
                borderLeft: medal ? `4px solid ${SLOT_STYLE[medal].border}` : '4px solid transparent',
                transition:'background 0.12s',
              }}>
              <div style={{ width:64, height:40, borderRadius:6, background:'var(--ink)', border:'1.5px solid var(--ink)', flexShrink:0, overflow:'hidden' }}>
                {thumb
                  ? <img src={thumb} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#00d4c8"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                }
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div className="font-display" style={{ fontSize:15, fontWeight:900, textTransform:'uppercase' }}>
                  Montage #{entry.display_number}
                </div>
                <div style={{ fontSize:12, color:'#888' }}>Vidéo anonyme</div>
              </div>
              <span style={{ fontSize:22, flexShrink:0 }}>{medal ? EMOJI[medal] : ''}</span>
            </div>
          )
        })}
      </div>

      {/* Submit bar */}
      <div style={{ position:'sticky', bottom:0, background:'var(--cream)', borderTop:'var(--border)', padding:'14px 20px' }}>
        <button className="btn-ink" disabled={filled < 3 || submitting} onClick={submit}>
          {submitting ? 'Envoi en cours...' : 'Valider mon podium →'}
        </button>
      </div>
    </div>
  )
}

function Confirmed({ picks, entries, onBack }: { picks: Record<Medal, string | null>; entries: Entry[]; onBack: () => void }) {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'var(--border)' }}>
        <span style={{ fontSize:14, fontWeight:500 }}>Kreads Edit</span>
      </div>
      <div style={{ padding:'40px 20px', textAlign:'center' }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background:'var(--turq)', border:'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:28 }}>✓</div>
        <div className="font-display" style={{ fontSize:30, fontWeight:900, textTransform:'uppercase', marginBottom:6 }}>Vote enregistré !</div>
        <p style={{ fontSize:13, color:'#666', marginBottom:24 }}>Résultats dévoilés en cérémonie fin de mois</p>
        <div className="k-card" style={{ textAlign:'left', padding:'16px 20px' }}>
          <div className="font-display" style={{ fontSize:10, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888', marginBottom:10 }}>Ton podium</div>
          {MEDALS.map(medal => {
            const entry = picks[medal] ? entries.find(e => e.id === picks[medal]) : null
            if (!entry) return null
            return (
              <div key={medal} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #0d0d0d10' }}>
                <span style={{ fontSize:18 }}>{EMOJI[medal]}</span>
                <span className="font-display" style={{ fontSize:14, fontWeight:900, textTransform:'uppercase', flex:1 }}>Montage #{entry.display_number}</span>
                <span className="font-display" style={{ fontSize:11, fontWeight:700, color:'#888' }}>{PTS[medal]} pts</span>
              </div>
            )
          })}
        </div>
        <button className="btn-ghost" style={{ marginTop:16 }} onClick={onBack}>Voir la dernière cérémonie</button>
      </div>
    </div>
  )
}

function Loader() {
  return <div className="font-display" style={{ padding:'40px 20px', textAlign:'center', fontSize:13, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888' }}>Chargement...</div>
}

export default function VotePage() {
  return <Suspense fallback={<Loader />}><VoteContent /></Suspense>
}
