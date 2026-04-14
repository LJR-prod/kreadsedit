'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getVoter, hasVoted, markVoted } from '@/lib/utils'
import type { Entry, Session } from '@/lib/types'

type Medal = 'gold' | 'silver' | 'bronze'
const MEDALS: Medal[] = ['gold', 'silver', 'bronze']
const EMOJI: Record<Medal, string> = { gold: '🥇', silver: '🥈', bronze: '🥉' }
const PTS: Record<Medal, number> = { gold: 3, silver: 2, bronze: 1 }
const SLOT_STYLE: Record<Medal, { border: string; bg: string; label: string }> = {
  gold:   { border: '#c9a000', bg: '#fffbee', label: 'Or · 3 pts' },
  silver: { border: '#7a8fa0', bg: '#f2f5f7', label: 'Argent · 2 pts' },
  bronze: { border: '#a0622a', bg: '#fdf5ee', label: 'Bronze · 1 pt' },
}

// ── Video Modal with native HTML5 player ──────────────────
function VideoModal({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', h)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', h) }
  }, [onClose])

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.92)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:960, background:'#111', borderRadius:16, overflow:'hidden', border:'2px solid #333' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'1px solid #333' }}>
          <span className="font-display" style={{ fontSize:15, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.06em', color:'white' }}>
            Montage #{entry.display_number}
          </span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#aaa', fontSize:22, cursor:'pointer', lineHeight:1, padding:'0 4px' }}>✕</button>
        </div>
        {/* Native HTML5 video player */}
        <video
          controls
          autoPlay
          playsInline
          style={{ width:'100%', display:'block', background:'#000', maxHeight:'70vh' }}
        >
          <source src={entry.youtube_url} type="video/mp4" />
          Votre navigateur ne supporte pas la lecture vidéo.
        </video>
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
    load(name)
  }, [sessionId]) // eslint-disable-line

  async function load(voterName?: string) {
    if (!sessionId) return
    const name = voterName || getVoter()
    const [{ data: sess }, { data: ents }, { data: existingVote }] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', sessionId).single(),
      supabase.from('entries').select('*').eq('session_id', sessionId).order('display_number'),
      // Check in DB if this person already voted (source of truth, ignores localStorage)
      supabase.from('votes').select('id').eq('session_id', sessionId).eq('voter_name', name || '').maybeSingle(),
    ])
    if (!sess || sess.status !== 'open') { router.push('/'); return }
    setSession(sess); setEntries(ents || [])
    if (existingVote) {
      markVoted(sessionId)
      setDone(true)
    } else {
      // Vote was deleted by admin — clear localStorage so user can vote again
      if (typeof window !== 'undefined') {
        localStorage.removeItem('kreb_voted_' + sessionId)
      }
    }
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id, voter_name: voter, gold_entry_id: picks.gold, silver_entry_id: picks.silver, bronze_entry_id: picks.bronze }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      markVoted(session.id); setDone(true)
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Erreur') }
    finally { setSubmitting(false) }
  }

  if (loading) return <Loader />
  if (done) return <Confirmed picks={picks} entries={entries} onBack={() => router.push('/ceremony')} />

  return (
    <div style={{ minHeight:'100vh', background:'var(--cream)', display:'flex', flexDirection:'column' }}>
      {watching && <VideoModal entry={watching} onClose={() => setWatching(null)} />}

      {/* Topbar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 40px', borderBottom:'var(--border)', flexShrink:0 }}>
        <span style={{ fontSize:14, fontWeight:500 }}>Kreads Edit</span>
        <div className="font-display" style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', background:'var(--ink)', color:'var(--cream)', padding:'5px 14px', borderRadius:4 }}>
          {voter}
        </div>
      </div>

      <div style={{ flex:1, maxWidth:1000, width:'100%', margin:'0 auto', padding:'0 40px 120px', boxSizing:'border-box' }}>

        {/* Progress */}
        <div style={{ padding:'18px 0', borderBottom:'var(--border)', marginBottom:28 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span className="font-display" style={{ fontSize:11, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888' }}>Mon podium</span>
            <span className="font-display" style={{ fontSize:11, fontWeight:900, letterSpacing:'0.08em', textTransform:'uppercase', color: filled === 3 ? 'var(--turq)' : '#888' }}>{filled} / 3</span>
          </div>
          <div style={{ height:6, background:'#0d0d0d14', borderRadius:4 }}>
            <div style={{ height:'100%', background:'var(--turq)', borderRadius:4, width:`${(filled/3)*100}%`, transition:'width 0.35s ease' }} />
          </div>
        </div>

        {/* Podium slots */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:36 }}>
          {MEDALS.map(medal => {
            const entryId = picks[medal]
            const entry = entryId ? entries.find(e => e.id === entryId) : null
            const s = SLOT_STYLE[medal]
            return (
              <div key={medal} onClick={() => entry && setPicks(p => ({ ...p, [medal]: null }))}
                style={{
                  border: entry ? `2px solid ${s.border}` : '2px dashed #0d0d0d28',
                  background: entry ? s.bg : 'white', borderRadius:14,
                  padding:'20px 16px', textAlign:'center',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                  cursor: entry ? 'pointer' : 'default', transition:'all 0.2s', minHeight:120,
                }}>
                <span style={{ fontSize:32 }}>{EMOJI[medal]}</span>
                <span className="font-display" style={{ fontSize:10, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', color: entry ? s.border : '#aaa' }}>{s.label}</span>
                {entry
                  ? <><span className="font-display" style={{ fontSize:18, fontWeight:900, textTransform:'uppercase' }}>#{entry.display_number}</span><span style={{ fontSize:11, color:'#999' }}>Cliquer pour retirer</span></>
                  : <span style={{ fontSize:12, color:'#bbb' }}>Sélectionner une vidéo</span>
                }
              </div>
            )
          })}
        </div>

        {/* Warning monteurs */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 18px', background:'#fff9e6', border:'2px solid #c9a000', borderRadius:12, marginBottom:20 }}>
          <span style={{ fontSize:20, flexShrink:0 }}>⚠️</span>
          <div>
            <div className="font-display" style={{ fontSize:13, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.06em', color:'#c9a000', marginBottom:2 }}>
              Règle d&apos;honneur
            </div>
            <p style={{ fontSize:13, color:'#555', lineHeight:1.5 }}>
              Si tu reconnais ta propre vidéo, tu n&apos;as pas le droit de la mettre dans ton podium. Le vote est anonyme — respecte les règles du jeu.
            </p>
          </div>
        </div>

        {/* Section title */}
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
          <div className="font-display" style={{ fontSize:13, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase' }}>Les montages du mois</div>
          <div style={{ flex:1, height:2, background:'#0d0d0d14', borderRadius:1 }} />
          <span className="font-display" style={{ fontSize:11, fontWeight:700, color:'#aaa', letterSpacing:'0.06em', textTransform:'uppercase' }}>▶ regarder · carte pour voter</span>
        </div>

        {/* Videos grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:20 }}>
          {entries.map(entry => {
            const medal = MEDALS.find(m => picks[m] === entry.id) || null
            const s = medal ? SLOT_STYLE[medal] : null
            return (
              <div key={entry.id} style={{
                background:'white', borderRadius:14, overflow:'hidden',
                border: s ? `2px solid ${s.border}` : 'var(--border)',
                boxShadow: s ? `0 0 0 4px ${s.border}22` : '0 2px 8px rgba(0,0,0,0.06)',
                transition:'all 0.2s',
              }}>
                {/* Video preview — click to watch */}
                <div onClick={() => setWatching(entry)} style={{ position:'relative', paddingTop:'56.25%', background:'#0d0d0d', cursor:'pointer', overflow:'hidden' }}>
                  {/* Native video thumbnail */}
                  <video
                    src={entry.youtube_url}
                    style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
                    preload="metadata"
                    muted
                    playsInline
                  />
                  {/* Play overlay */}
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.28)' }}>
                    <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(255,255,255,0.95)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(0,0,0,0.25)' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--ink)"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                  {medal && (
                    <div style={{ position:'absolute', top:12, right:12, fontSize:28, filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}>{EMOJI[medal]}</div>
                  )}
                  <div style={{ position:'absolute', bottom:10, left:12 }}>
                    <span className="font-display" style={{ fontSize:10, fontWeight:900, letterSpacing:'0.08em', textTransform:'uppercase', background:'rgba(0,0,0,0.6)', color:'white', padding:'3px 8px', borderRadius:4 }}>Regarder</span>
                  </div>
                </div>

                {/* Footer vote */}
                <div onClick={() => clickEntry(entry.id)} style={{ padding:'16px 18px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', background: s ? s.bg : 'white', transition:'background 0.2s' }}>
                  <div style={{ flex:1 }}>
                    <div className="font-display" style={{ fontSize:19, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.01em', lineHeight:1 }}>
                      Montage #{entry.display_number}
                    </div>
                    <div style={{ fontSize:12, color: medal ? s!.border : '#aaa', marginTop:4, fontWeight:500 }}>
                      {medal ? `Sélectionné — ${EMOJI[medal]}` : '+ Ajouter à mon podium'}
                    </div>
                  </div>
                  <div style={{
                    width:40, height:40, borderRadius:'50%', flexShrink:0,
                    border: `2px solid ${medal ? s!.border : 'var(--ink)'}`,
                    background: medal ? s!.border : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s',
                  }}>
                    {medal
                      ? <span style={{ fontSize:18 }}>{EMOJI[medal]}</span>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    }
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Submit bar */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100, background:'var(--cream)', borderTop:'var(--border)', padding:'16px 40px' }}>
        <div style={{ maxWidth:1000, margin:'0 auto', display:'flex', alignItems:'center', gap:20 }}>
          <div style={{ flex:1 }}>
            {filled < 3
              ? <p style={{ fontSize:13, color:'#aaa' }}>Sélectionne encore <strong style={{ color:'var(--ink)' }}>{3 - filled} vidéo{3 - filled > 1 ? 's' : ''}</strong> pour compléter ton podium</p>
              : <p style={{ fontSize:13, color:'var(--turq)', fontWeight:700 }}>✓ Podium complet — prêt à voter !</p>
            }
          </div>
          <button onClick={submit} disabled={filled < 3 || submitting}
            style={{
              padding:'14px 36px', fontFamily:'Barlow Condensed', fontSize:15, fontWeight:900,
              letterSpacing:'0.08em', textTransform:'uppercase',
              background: filled === 3 ? 'var(--ink)' : '#0d0d0d40',
              color:'var(--cream)', border:'var(--border)', borderRadius:'var(--radius)',
              cursor: filled === 3 ? 'pointer' : 'not-allowed', whiteSpace:'nowrap', transition:'background 0.2s',
            }}>
            {submitting ? 'Envoi...' : 'Valider mon podium →'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Confirmed({ picks, entries, onBack }: { picks: Record<Medal, string | null>; entries: Entry[]; onBack: () => void }) {
  return (
    <div style={{ minHeight:'100vh', background:'var(--cream)' }}>
      <div style={{ display:'flex', alignItems:'center', padding:'16px 40px', borderBottom:'var(--border)' }}>
        <span style={{ fontSize:14, fontWeight:500 }}>Kreads Edit</span>
      </div>
      <div style={{ maxWidth:560, margin:'0 auto', padding:'64px 40px', textAlign:'center' }}>
        <div style={{ width:88, height:88, borderRadius:'50%', background:'var(--turq)', border:'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 28px', fontSize:36 }}>✓</div>
        <div className="font-display" style={{ fontSize:48, fontWeight:900, textTransform:'uppercase', letterSpacing:'-0.02em', lineHeight:0.9, marginBottom:10 }}>Vote<br />enregistré !</div>
        <p style={{ fontSize:14, color:'#888', marginBottom:32 }}>Résultats dévoilés en cérémonie fin de mois.</p>
        <div style={{ background:'white', border:'var(--border)', borderRadius:14, padding:'20px 24px', textAlign:'left', marginBottom:20 }}>
          <div className="font-display" style={{ fontSize:10, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', color:'#aaa', marginBottom:14 }}>Ton podium</div>
          {MEDALS.map(medal => {
            const entry = picks[medal] ? entries.find(e => e.id === picks[medal]) : null
            if (!entry) return null
            return (
              <div key={medal} style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 0', borderBottom:'1px solid #0d0d0d0e' }}>
                <span style={{ fontSize:22 }}>{EMOJI[medal]}</span>
                <span className="font-display" style={{ fontSize:17, fontWeight:900, textTransform:'uppercase', flex:1 }}>Montage #{entry.display_number}</span>
                <span className="font-display" style={{ fontSize:12, fontWeight:700, color:'#aaa' }}>{PTS[medal]} pts</span>
              </div>
            )
          })}
        </div>
        <button className="btn-ghost" onClick={onBack}>Voir la dernière cérémonie</button>
      </div>
    </div>
  )
}

function Loader() {
  return (
    <div style={{ minHeight:'100vh', background:'var(--cream)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span className="font-display" style={{ fontSize:13, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888' }}>Chargement...</span>
    </div>
  )
}

export default function VotePage() {
  return <Suspense fallback={<Loader />}><VoteContent /></Suspense>
}
