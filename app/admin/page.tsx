'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isAdmin, loginAdmin, logoutAdmin } from '@/lib/utils'
import type { Session, Entry, Vote, Score } from '@/lib/types'

type Tab = 'session' | 'votes' | 'scores'

function adminToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('kreb_admin') || ''
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken(), ...(opts.headers || {}) },
  })
}

export default function AdminPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [tab, setTab] = useState<Tab>('session')

  const [session, setSession] = useState<Session | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)

  // Forms
  const [newLabel, setNewLabel] = useState('')
  const [newMonth, setNewMonth] = useState('')
  const [newEditor, setNewEditor] = useState('')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: sess } = await supabase
      .from('sessions').select('*').order('created_at', { ascending: false }).limit(1).single()
    setSession(sess || null)

    if (sess) {
      const [{ data: ents }, { data: vs }] = await Promise.all([
        supabase.from('entries').select('*').eq('session_id', sess.id).order('display_number'),
        supabase.from('votes').select('*').eq('session_id', sess.id).order('created_at'),
      ])
      setEntries(ents || [])
      setVotes(vs || [])
    } else {
      setEntries([]); setVotes([])
    }

    const { data: sc } = await supabase.from('scores').select('*').order('total_points', { ascending: false })
    setScores(sc || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isAdmin()) { setAuthed(true); load() }
  }, [load])

  function handleLogin() {
    if (loginAdmin(pw)) { setAuthed(true); load() }
    else setPwErr('Mot de passe incorrect')
  }

  async function createSession() {
    if (!newLabel || !newMonth) return
    setSaving(true)
    const res = await apiFetch('/api/admin/session', { method: 'POST', body: JSON.stringify({ label: newLabel, month: newMonth }) })
    if (res.ok) { setNewLabel(''); setNewMonth(''); await load() }
    setSaving(false)
  }

  async function addEntry() {
    if (!session || !newEditor || !newFile) return
    setSaving(true)
    setUploadProgress(0)

    try {
      // 1. Upload MP4 to Supabase Storage
      const ext = newFile.name.split('.').pop() || 'mp4'
      const fileName = `${session.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, newFile, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError
      setUploadProgress(80)

      // 2. Get public URL
      const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName)
      const videoUrl = urlData.publicUrl
      setUploadProgress(90)

      // 3. Save entry with video URL
      const res = await apiFetch('/api/admin/entry', {
        method: 'POST',
        body: JSON.stringify({ session_id: session.id, editor_name: newEditor, youtube_url: videoUrl }),
      })
      if (!res.ok) throw new Error('Erreur lors de la sauvegarde')

      setNewEditor('')
      setNewFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setUploadProgress(null)
      await load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erreur upload')
      setUploadProgress(null)
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm('Supprimer cette soumission ?')) return
    await apiFetch('/api/admin/entry', { method: 'DELETE', body: JSON.stringify({ id }) })
    await load()
  }

  async function closeSession() {
    if (!session || !confirm('Fermer la session ? Les votes ne seront plus acceptés.')) return
    await apiFetch('/api/admin/session', { method: 'PATCH', body: JSON.stringify({ id: session.id, status: 'closed' }) })
    await load()
  }

  async function revealSession() {
    if (!session || !confirm('Révéler les résultats et déclencher la cérémonie ?')) return
    setSaving(true)
    const res = await apiFetch('/api/admin/reveal', { method: 'POST', body: JSON.stringify({ session_id: session.id }) })
    if (res.ok) { await load(); router.push('/ceremony') }
    else { const j = await res.json(); alert(j.error) }
    setSaving(false)
  }

  // ── Login ──────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight:'100vh', background:'var(--cream)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:340, padding:'0 20px', textAlign:'center' }}>
        <div className="font-display" style={{ fontSize:40, fontWeight:900, textTransform:'uppercase', marginBottom:28 }}>Admin</div>
        <input className="k-field" type="password" placeholder="Mot de passe" value={pw}
          onChange={e => { setPw(e.target.value); setPwErr('') }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ marginBottom:12 }} />
        {pwErr && <p style={{ fontSize:13, color:'#c0392b', marginBottom:12 }}>{pwErr}</p>}
        <button className="btn-ink" onClick={handleLogin}>Connexion →</button>
      </div>
    </div>
  )

  // ── Dashboard ──────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'var(--cream)' }}>

      {/* Topbar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 32px', borderBottom:'var(--border)' }}>
        <span style={{ fontSize:14, fontWeight:500 }}>Kreads Edit</span>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div className="font-display" style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', background:'var(--turq)', color:'var(--ink)', padding:'5px 12px', borderRadius:4 }}>Admin</div>
          <button className="btn-sm danger" onClick={() => { logoutAdmin(); setAuthed(false) }}>Déco</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'var(--border)', padding:'0 32px' }}>
        {(['session', 'votes', 'scores'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'13px 16px', fontFamily:'Barlow Condensed', fontSize:11, fontWeight:900,
            letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer',
            color: tab === t ? 'var(--ink)' : '#888',
            background:'transparent', border:'none',
            borderBottom: tab === t ? '3px solid var(--turq)' : '3px solid transparent',
          }}>
            {t === 'votes' ? `Votes (${votes.length})` : t === 'scores' ? 'Leaderboard' : 'Session'}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 32px' }}>
        {loading ? (
          <div className="font-display" style={{ textAlign:'center', padding:40, fontSize:13, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888' }}>Chargement...</div>
        ) : (
          <>
            {/* ── SESSION ── */}
            {tab === 'session' && (
              <div>
                {!session ? (
                  <>
                    <SectionHead title="Nouvelle session" />
                    <input className="k-field" placeholder="Label (ex: Avril 2025)" value={newLabel} onChange={e => setNewLabel(e.target.value)} style={{ marginBottom:10 }} />
                    <input className="k-field" placeholder="Mois (ex: 2025-04)" value={newMonth} onChange={e => setNewMonth(e.target.value)} style={{ marginBottom:14 }} />
                    <button className="btn-ink" disabled={!newLabel || !newMonth || saving} onClick={createSession}>
                      {saving ? 'Création...' : 'Créer la session →'}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Stats */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
                      {[['Montages', entries.length], ['Votants', votes.length], ['Statut', session.status]].map(([l, v]) => (
                        <div key={String(l)} style={{ background:'white', border:'var(--border)', borderRadius:'var(--radius)', padding:14 }}>
                          <div className="font-display" style={{ fontSize:10, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888', marginBottom:4 }}>{l}</div>
                          <div className="font-display" style={{ fontSize:22, fontWeight:900, textTransform:'uppercase' }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
                      {session.status === 'open' && <button className="btn-sm danger" onClick={closeSession}>Fermer session</button>}
                      {(session.status === 'open' || session.status === 'closed') && (
                        <button className="btn-sm turq" disabled={saving} onClick={revealSession}>{saving ? '...' : 'Cérémonie →'}</button>
                      )}
                      {session.status === 'revealed' && (
                        <button className="btn-sm filled" onClick={() => router.push('/ceremony')}>Voir la cérémonie →</button>
                      )}
                    </div>

                    {/* Add entry — MP4 upload */}
                    {session.status === 'open' && (
                      <div style={{ marginBottom:28, padding:20, background:'white', border:'var(--border)', borderRadius:'var(--radius)' }}>
                        <div className="font-display" style={{ fontSize:12, fontWeight:900, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:14 }}>
                          Ajouter une soumission
                        </div>

                        <input className="k-field" placeholder="Nom du monteur (ex: Loïs V.)" value={newEditor}
                          onChange={e => setNewEditor(e.target.value)} style={{ marginBottom:10 }} />

                        {/* File drop zone */}
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            border: newFile ? '2px solid var(--turq)' : '2px dashed #0d0d0d30',
                            borderRadius: 10, padding:'20px 16px', textAlign:'center',
                            cursor:'pointer', marginBottom:12, background: newFile ? '#e0faf920' : 'transparent',
                            transition:'all 0.15s',
                          }}>
                          <input
                            ref={fileInputRef} type="file" accept="video/mp4,video/mov,video/quicktime,video/*"
                            style={{ display:'none' }}
                            onChange={e => setNewFile(e.target.files?.[0] || null)}
                          />
                          {newFile ? (
                            <>
                              <div style={{ fontSize:28, marginBottom:6 }}>🎬</div>
                              <div className="font-display" style={{ fontSize:13, fontWeight:900, textTransform:'uppercase' }}>{newFile.name}</div>
                              <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{(newFile.size / 1024 / 1024).toFixed(1)} MB · Cliquer pour changer</div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize:28, marginBottom:6 }}>📁</div>
                              <div className="font-display" style={{ fontSize:13, fontWeight:900, textTransform:'uppercase' }}>Cliquer pour sélectionner un fichier vidéo</div>
                              <div style={{ fontSize:12, color:'#888', marginTop:2 }}>MP4, MOV — max 500 MB</div>
                            </>
                          )}
                        </div>

                        {/* Progress bar */}
                        {uploadProgress !== null && (
                          <div style={{ marginBottom:12 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#888', marginBottom:4 }}>
                              <span className="font-display" style={{ fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>Upload en cours...</span>
                              <span>{uploadProgress}%</span>
                            </div>
                            <div style={{ height:4, background:'#0d0d0d14', borderRadius:3 }}>
                              <div style={{ height:'100%', background:'var(--turq)', borderRadius:3, width:`${uploadProgress}%`, transition:'width 0.3s' }} />
                            </div>
                          </div>
                        )}

                        <button className="btn-sm filled" disabled={!newEditor || !newFile || saving} onClick={addEntry}>
                          {saving ? 'Upload en cours...' : 'Uploader la vidéo'}
                        </button>
                      </div>
                    )}

                    {/* Entries list */}
                    <SectionHead title={`Soumissions — ${session.label}`} />
                    {entries.length === 0
                      ? <p style={{ fontSize:13, color:'#888' }}>Aucune soumission pour le moment.</p>
                      : entries.map(entry => (
                          <EntryRow key={entry.id} entry={entry} canDelete={session.status === 'open'} onDelete={() => deleteEntry(entry.id)} />
                        ))
                    }
                  </>
                )}
              </div>
            )}

            {/* ── VOTES ── */}
            {tab === 'votes' && (
              <div>
                <SectionHead title="Votes reçus" />
                {votes.length === 0
                  ? <p style={{ fontSize:13, color:'#888' }}>Aucun vote pour le moment.</p>
                  : votes.map((v, i) => {
                      const g = entries.find(e => e.id === v.gold_entry_id)
                      const s = entries.find(e => e.id === v.silver_entry_id)
                      const b = entries.find(e => e.id === v.bronze_entry_id)
                      return (
                        <div key={v.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #0d0d0d12' }}>
                          <div style={{ width:32, height:32, borderRadius:'50%', background:'#eee', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Barlow Condensed', fontSize:11, fontWeight:900, color:'#555', flexShrink:0 }}>
                            {String(i + 1).padStart(2, '0')}
                          </div>
                          <span style={{ fontSize:13, fontWeight:700, flex:1 }}>{v.voter_name}</span>
                          <span style={{ fontSize:12, color:'#888' }}>🥇#{g?.display_number ?? '?'} · 🥈#{s?.display_number ?? '?'} · 🥉#{b?.display_number ?? '?'}</span>
                        </div>
                      )
                    })
                }
              </div>
            )}

            {/* ── SCORES ── */}
            {tab === 'scores' && (
              <div>
                <SectionHead title="Leaderboard all-time" />
                {scores.length === 0
                  ? <p style={{ fontSize:13, color:'#888' }}>Pas encore de scores.</p>
                  : scores.map((sc, i) => (
                      <div key={sc.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #0d0d0d12' }}>
                        <span style={{ width:22, textAlign:'center', fontSize: i < 3 ? 16 : 12, fontFamily:'Barlow Condensed', fontWeight:700, color:'#888', flexShrink:0 }}>
                          {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                        </span>
                        <div style={{ width:34, height:34, borderRadius:'50%', background: i === 0 ? 'var(--turq)' : '#eee', border:'1.5px solid var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Barlow Condensed', fontSize:11, fontWeight:900, flexShrink:0 }}>
                          {sc.editor_name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:700 }}>{sc.editor_name}</div>
                          <div style={{ fontSize:11, color:'#888' }}>{sc.wins} victoire{sc.wins > 1 ? 's' : ''}{sc.badges?.length > 0 && <> · {sc.badges.join(', ')}</>}</div>
                        </div>
                        <span className="font-display" style={{ fontSize:14, fontWeight:900, color: i === 0 ? 'var(--gold)' : '#888' }}>{sc.total_points} pts</span>
                      </div>
                    ))
                }
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SectionHead({ title }: { title: string }) {
  return <div className="font-display" style={{ fontSize:13, fontWeight:900, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:14 }}>{title}</div>
}

function EntryRow({ entry, canDelete, onDelete }: { entry: Entry; canDelete: boolean; onDelete: () => void }) {
  const initials = entry.editor_name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  const isVideo = entry.youtube_url.includes('supabase') || entry.youtube_url.endsWith('.mp4') || entry.youtube_url.endsWith('.mov')
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #0d0d0d12' }}>
      <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--turq)', border:'1.5px solid var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Barlow Condensed', fontSize:11, fontWeight:900, flexShrink:0 }}>
        {initials}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:700 }}>{entry.editor_name}</div>
        <div style={{ fontSize:11, color:'#888', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {isVideo ? '🎬 Vidéo uploadée' : entry.youtube_url}
        </div>
      </div>
      <div className="font-display" style={{ fontSize:11, fontWeight:700, background:'#0d0d0d12', padding:'3px 8px', borderRadius:4, flexShrink:0 }}>
        #{entry.display_number}
      </div>
      {canDelete && (
        <button onClick={onDelete} style={{ fontSize:12, color:'#c0392b', background:'none', border:'none', cursor:'pointer', fontWeight:700, flexShrink:0 }}>✕</button>
      )}
    </div>
  )
}
