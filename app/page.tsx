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

  if (loading) return <Loader />

  return (
    <div>
      {/* Topbar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'var(--border)' }}>
        <span style={{ fontSize:14, fontWeight:500 }}>Kreads Edit</span>
        {session && <Pill>{session.label}</Pill>}
      </div>

      {!session ? (
        <div style={{ padding:'60px 20px', textAlign:'center' }}>
          <H1>Pas de session<br />en cours</H1>
          <p style={{ fontSize:14, color:'#666', margin:'12px 0 24px' }}>La prochaine session ouvrira bientôt.</p>
          <button className="btn-ghost" style={{ maxWidth:280, margin:'0 auto' }} onClick={() => router.push('/ceremony')}>
            Voir la dernière cérémonie
          </button>
        </div>
      ) : (
        <>
          {/* Hero */}
          <div style={{ padding:'48px 24px 36px', textAlign:'center', borderBottom:'var(--border)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', overflow:'hidden' }}>
              <span className="font-display" style={{ fontSize:130, fontWeight:900, textTransform:'uppercase', color:'#0d0d0d05', lineHeight:1, whiteSpace:'nowrap', userSelect:'none' }}>EDIT</span>
            </div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontFamily:'Barlow Condensed', fontSize:11, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', background:'var(--turq)', color:'var(--ink)', padding:'5px 12px', borderRadius:4, marginBottom:20, position:'relative', zIndex:1 }}>
              <span className="live-dot" /> Session en cours
            </div>
            <H1 style={{ position:'relative', zIndex:1 }}>
              Qui a réalisé<br />le meilleur<br />
              <span style={{ color:'var(--turq)' }}>montage ?</span>
            </H1>
            <div style={{ width:48, height:4, background:'var(--ink)', borderRadius:2, margin:'16px auto', position:'relative', zIndex:1 }} />
            <p style={{ fontSize:13, color:'#666', position:'relative', zIndex:1, lineHeight:1.6 }}>
              Vote anonyme · <strong style={{ color:'var(--ink)' }}>podium Or · Argent · Bronze</strong>
            </p>
          </div>

          {/* Form */}
          <div style={{ padding:'24px 20px' }}>
            <label style={{ display:'block', fontFamily:'Barlow Condensed', fontSize:11, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', color:'#666', marginBottom:8 }}>
              Ton prénom + initiale du nom
            </label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 80px', gap:10, marginBottom:14 }}>
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
            <button className="btn-ghost" style={{ marginTop:8 }} onClick={() => router.push('/ceremony')}>
              Voir la dernière cérémonie
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function H1({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="font-display" style={{ fontSize:46, fontWeight:900, textTransform:'uppercase', letterSpacing:'-0.01em', lineHeight:0.95, marginBottom:6, ...style }}>
      {children}
    </div>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-display" style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', background:'var(--ink)', color:'var(--cream)', padding:'5px 12px', borderRadius:4 }}>
      {children}
    </div>
  )
}

function Loader() {
  return <div className="font-display" style={{ padding:'40px 20px', textAlign:'center', fontSize:13, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888' }}>Chargement...</div>
}
