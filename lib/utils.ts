// ── Admin auth (localStorage) ──────────────────────────────
const ADMIN_KEY = 'kreb_admin'

export function loginAdmin(password: string): boolean {
  if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
    localStorage.setItem(ADMIN_KEY, btoa('kreads:' + password))
    return true
  }
  return false
}

export function isAdmin(): boolean {
  if (typeof window === 'undefined') return false
  const t = localStorage.getItem(ADMIN_KEY)
  if (!t) return false
  try { return atob(t).startsWith('kreads:') } catch { return false }
}

export function logoutAdmin() {
  localStorage.removeItem(ADMIN_KEY)
}

// ── Voter identity ─────────────────────────────────────────
const VOTER_KEY = 'kreb_voter'

export function getVoter(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(VOTER_KEY)
}

export function setVoter(name: string) {
  localStorage.setItem(VOTER_KEY, name)
}

export function hasVoted(sessionId: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('kreb_voted_' + sessionId) === '1'
}

export function markVoted(sessionId: string) {
  localStorage.setItem('kreb_voted_' + sessionId, '1')
}

// ── YouTube helpers ────────────────────────────────────────
export function ytId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  return m ? m[1] : null
}

export function ytThumb(url: string): string {
  const id = ytId(url)
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : ''
}

// ── Score computation ──────────────────────────────────────
import type { Entry, Vote, SessionResult } from './types'

export function computeResults(entries: Entry[], votes: Vote[]): SessionResult[] {
  const map: Record<string, SessionResult> = {}
  entries.forEach(e => {
    map[e.id] = { entry: e, total_points: 0, gold_votes: 0, silver_votes: 0, bronze_votes: 0, rank: 0 }
  })
  votes.forEach(v => {
    if (map[v.gold_entry_id])   { map[v.gold_entry_id].total_points += 3;   map[v.gold_entry_id].gold_votes++ }
    if (map[v.silver_entry_id]) { map[v.silver_entry_id].total_points += 2; map[v.silver_entry_id].silver_votes++ }
    if (map[v.bronze_entry_id]) { map[v.bronze_entry_id].total_points += 1; map[v.bronze_entry_id].bronze_votes++ }
  })
  return Object.values(map)
    .sort((a, b) => b.total_points - a.total_points || b.gold_votes - a.gold_votes)
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

// ── Badge logic ────────────────────────────────────────────
export function computeBadges(wins: number, goldCount: number): string[] {
  const badges: string[] = []
  if (wins >= 1) badges.push('Meilleur monteur')
  if (wins >= 3) badges.push('Hat-trick')
  if (wins >= 5) badges.push('Légende')
  if (goldCount >= 5) badges.push('Gold addict')
  return badges
}
