'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getVoter, hasVoted, markVoted, ytThumb, ytId } from '@/lib/utils'
import type { Entry, Session } from '@/lib/types'

type Medal = 'gold' | 'silver' | 'bronze'
const MEDALS: Medal[] = ['gold', 'silver', 'bronze']
const EMOJI: Record<Medal, string> = { gold: '🥇', silver: '🥈', bronze: '🥉' }
const PTS: Record<Medal, number> = { gold: 3, silver: 2, bronze: 1 }
const LABEL: Record<Medal, string> = { gold: 'Or · 3 pts', silver: 'Argent · 2 pts', bronze: 'Bronze · 1 pt' }
const SLOT_STYLE: Record<Medal, { border: string; bg: string }> = {
  gold:   { border: '#c9a000', bg: '#fff9e6' },
  silver: { border: '#7a8fa0', bg: '#f0f4f7' },
  bronze: { border: '#a0622a', bg: '#fdf3e7' },
}

function VideoModal({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const id = ytId(entry.youtube_url)
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="video-modal-backdrop" onClick={onClose}>
      <div className="video-modal-inner" onClick={e => e.stopPropagation()}>
        <div className="video-modal-header">
          <span className="video-modal-title">Montage #{entry.display_number}</span>
          <button className="video-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="video-modal-iframe-wrap">
          {id
            ? <iframe
                src={`https://www.youtube.com/embed/${id}?autoplay=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            : <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'#888', fontSize:14 }}>URL invalide</div>
          }
        </div>
      </div>
    </div>
  )
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
  const [watching, setWatching] = useState<Entry | null>(null)

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
          session_id: session.id, voter_name: voter,
          gold_entry_id: picks.gold, silver_entry_id: picks.silver, bronze_entry_id: picks.bronze,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      markVoted(session.id)
      setDone(true)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loader />
  if (done) return <Confirmed picks={picks} entries={entries} onBack={() => router.push('/ceremony')} />

  return (
    <div style={{ minHeight:'100vh', background:'var(--cream)' }}>
      {watching && <VideoModal entry={watching} onClose={() => setWatching(null)} />}

      {/* Topbar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 24px', borderBottom:'var(--border)' }}>
        <span style={{ fontSize:14, fontWeight:500 }}>Kreads Edit</span>
        <div className="font-display" style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', background:'var(--ink)', color:'var(--cream)', padding:'5px 12px', borderRadius:4 }}>
          {voter}
        </div>
      </div>

      {/* Progress */}
      <div style={{ padding:'12px 24px', borderBottom:'var(--border)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'Barlow Condensed', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#888', marginBottom:6 }}>
          <span>Mon podium</span><span>{filled} / 3</span>
        </div>
        <div style={{ height:5, background:'#0d0d0d20', borderRadius:3 }}>
          <div style={{ height:'100%', background:'var(--turq)', borderRadius:3, width:`${(filled/3)*100}%`, transition:'width 0.3s' }} />
        </div>
      </div>

      {/* Podium slots */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, padding:'16px 24px', borderBottom:'var(--border)', maxWidth:500 }}>
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

      {/* Hint */}
      <div className="font-display" style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#888', padding:'14px 24px 8px' }}>
        ▶ pour regarder · cliquer la carte pour voter
      </div>

      {/* Videos grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:14, padding:'0 24px 110px' }}>
        {entries.map(entry => {
          const medal = MEDALS.find(m => picks[m] === entry.id) || null
          const thumb = ytThumb(entry.youtube_url)
          return (
            <div key={entry.id} style={{
              background: medal ? SLOT_STYLE[medal].bg : 'white',
              border: medal ? `2px solid ${SLOT_STYLE[medal].border}` : 'var(--border)',
              borderRadius:'var(--radius)', overflow:'hidden', transition:'all 0.12s',
            }}>
              {/* Thumbnail — click to watch */}
              <div onClick={() => setWatching(entry)}
                style={{ position:'relative', paddingTop:'56.25%', background:'#111', cursor:'pointer' }}>
                {thumb && <img src={thumb} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />}
                {/* Play button */}
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.3)' }}>
                  <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(255,255,255,0.92)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--ink)"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
                {medal && (
                  <div style={{ position:'absolute', top:8, right:8, fontSize:24, filter:'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }}>{EMOJI[medal]}</div>
                )}
              </div>

              {/* Card footer — click to vote */}
              <div onClick={() => clickEntry(entry.id)} style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                <div style={{ flex:1 }}>
                  <div className="font-display" style={{ fontSize:16, fontWeight:900, textTransform:'uppercase' }}>
                    Montage #{entry.display_number}
                  </div>
                  <div style={{ fontSize:12, color:'#888', marginTop:1 }}>
                    {medal ? `Sélectionné ${EMOJI[medal]}` : 'Cliquer pour voter'}
                  </div>
                </div>
                <div style={{
                  width:34, height:34, borderRadius:'50%', border:'1.5px solid var(--ink)', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: medal ? 'var(--ink)' : 'transparent',
                }}>
                  {medal
                    ? <span style={{ fontSize:16 }}>{EMOJI[medal]}</span>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  }
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Submit bar */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'var(--cream)', borderTop:'var(--border)', padding:'14px 24px', zIndex:50 }}>
        <div style={{ maxWidth:700, margin:'0 auto' }}>
          <button className="btn-ink" disabled={filled < 3 || submitting} onClick={submit}>
            {submitting ? 'Envoi en cours...' : 'Valider mon podium →'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Confirmed({ picks, entries, onBack }: { picks: Record<Medal, string | null>; entries: Entry[]; onBack: () => void }) {
  return (
    <div style={{ minHeight:'100vh', background:'var(--cream)' }}>
      <div style={{ display:'flex', alignItems:'center', padding:'16px 24px', borderBottom:'var(--border)' }}>
        <span style={{ fontSize:14, fontWeight:500 }}>Kreads Edit</span>
      </div>
      <div style={{ maxWidth:480, margin:'0 auto', padding:'40px 24px', textAlign:'center' }}>
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
  return (
    <div style={{ minHeight:'100vh', background:'var(--cream)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="font-display" style={{ fontSize:13, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888' }}>Chargement...</div>
    </div>
  )
}

export default function VotePage() {
  return <Suspense fallback={<Loader />}><VoteContent /></Suspense>
}
