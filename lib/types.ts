export type SessionStatus = 'open' | 'closed' | 'revealed'

export interface Session {
  id: string
  month: string
  label: string
  status: SessionStatus
  created_at: string
  closed_at: string | null
  revealed_at: string | null
}

export interface Entry {
  id: string
  session_id: string
  editor_name: string
  youtube_url: string
  display_number: number
  created_at: string
}

export interface Vote {
  id: string
  session_id: string
  voter_name: string
  gold_entry_id: string
  silver_entry_id: string
  bronze_entry_id: string
  created_at: string
}

export interface Score {
  id: string
  editor_name: string
  total_points: number
  gold_count: number
  silver_count: number
  bronze_count: number
  wins: number
  badges: string[]
  updated_at: string
}

export interface SessionResult {
  entry: Entry
  total_points: number
  gold_votes: number
  silver_votes: number
  bronze_votes: number
  rank: number
}
