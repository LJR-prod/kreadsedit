'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { setVoter, hasVoted } from '@/lib/utils'
import type { Session } from '@/lib/types'

export default function Home() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [fn, setFn] = useState('')
  const [ln, setLn] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.from('sessions').select('*').eq('status', 'open')
      .order('created_at', { ascending: false }).limit(1).single()
      .then(({ data }) => { setSession(data); setLoading(false) })
  }, [])

  function submit() {
    if (!session) return
    const firstName = fn.trim()
    const initial = ln.trim().replace('.', '').toUpperCase()
    if (firstName.length < 2 || initial.length < 1) return
    const name = `${firstName} ${initial}.`
    if (hasVoted(session.id)) { setErr('Tu as déjà voté pour ce mois !'); return }
    setVoter(name)
    router.push(`/vote?s=${session.id}`)
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--cream)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span className="font-display" style={{ fontSize:13, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888' }}>Chargement...</span>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--cream)' }}>

      {/* Topbar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 32px', borderBottom:'var(--border)' }}>
        <span style={{ fontSize:14, fontWeight:500 }}>Kreads Edit</span>
        {session && (
          <div className="font-display" style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', background:'var(--ink)', color:'var(--cream)', padding:'5px 12px', borderRadius:4 }}>
            {session.label}
          </div>
        )}
      </div>

      {!session ? (
        <div style={{ maxWidth:600, margin:'0 auto', padding:'80px 32px', textAlign:'center' }}>
          <div className="font-display" style={{ fontSize:52, fontWeight:900, textTransform:'uppercase', lineHeight:0.92, marginBottom:16 }}>
            Pas de session<br />en cours
          </div>
          <p style={{ fontSize:14, color:'#666', marginBottom:28 }}>La prochaine session ouvrira bientôt.</p>
          <button className="btn-ghost" style={{ maxWidth:320, margin:'0 auto' }} onClick={() => router.push('/ceremony')}>
            Voir la dernière cérémonie
          </button>
        </div>
      ) : (
        <>
          {/* Hero */}
          <div style={{ padding:'64px 32px 48px', textAlign:'center', borderBottom:'var(--border)', position:'relative', overflow:'hidden' }}>
            {/* Watermark */}
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', overflow:'hidden' }}>
              <span className="font-display" style={{ fontSize:'22vw', fontWeight:900, textTransform:'uppercase', color:'#0d0d0d04', lineHeight:1, whiteSpace:'nowrap', userSelect:'none' }}>EDIT</span>
            </div>

            {/* Badge live — nouvelle typo */}
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:28, position:'relative', zIndex:1 }}>
              <span className="live-dot" style={{ background:'var(--turq)' }} />
              <span style={{
                fontFamily:'Barlow', fontSize:13, fontWeight:500, letterSpacing:'0.04em',
                color:'var(--ink)', borderBottom:'1.5px solid var(--turq)', paddingBottom:1,
              }}>
                Session en cours
              </span>
            </div>

            {/* Titre */}
            <div className="font-display" style={{ fontSize:'clamp(42px, 7vw, 88px)', fontWeight:900, textTransform:'uppercase', letterSpacing:'-0.02em', lineHeight:0.9, marginBottom:8, position:'relative', zIndex:1 }}>
              Qui a réalisé<br />le meilleur<br />
              <span style={{ color:'var(--turq)' }}>montage ?</span>
            </div>

            <div style={{ width:56, height:5, background:'var(--ink)', borderRadius:3, margin:'20px auto', position:'relative', zIndex:1 }} />

            {/* Description enrichie */}
            <div style={{ position:'relative', zIndex:1, maxWidth:480, margin:'0 auto' }}>
              <p style={{ fontSize:15, color:'#555', lineHeight:1.7, marginBottom:16 }}>
                Chaque mois, les monteurs de la team soumettent leur meilleur travail.<br />
                <strong style={{ color:'var(--ink)' }}>Ton rôle :</strong> regarder anonymement et choisir ton podium.
              </p>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:20, flexWrap:'wrap' }}>
                {[['🥇', 'Or', '3 pts'], ['🥈', 'Argent', '2 pts'], ['🥉', 'Bronze', '1 pt']].map(([emoji, label, pts]) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:18 }}>{emoji}</span>
                    <div>
                      <span className="font-display" style={{ fontSize:12, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
                      <span style={{ fontSize:11, color:'#888', marginLeft:4 }}>{pts}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div style={{ maxWidth:520, margin:'0 auto', padding:'40px 32px' }}>
            <label className="font-display" style={{ display:'block', fontSize:11, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888', marginBottom:10 }}>
              Ton prénom + initiale du nom
            </label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 90px', gap:10, marginBottom:16 }}>
              <input className="k-field" placeholder="Prénom" value={fn}
                onChange={e => { setFn(e.target.value); setErr('') }}
                onKeyDown={e => e.key === 'Enter' && submit()} />
              <input className="k-field" placeholder="B." value={ln} maxLength={2}
                onChange={e => { setLn(e.target.value); setErr('') }}
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
            {err && <p style={{ fontSize:13, color:'#c0392b', marginBottom:12 }}>{err}</p>}
            <button className="btn-ink" disabled={fn.trim().length < 2 || ln.trim().length < 1} onClick={submit}>
              Accéder au vote →
            </button>
            <button className="btn-ghost" style={{ marginTop:10 }} onClick={() => router.push('/ceremony')}>
              Voir la dernière cérémonie
            </button>
          </div>
        </>
      )}
    </div>
  )
}
