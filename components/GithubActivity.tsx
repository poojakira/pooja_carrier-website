'use client'

import { useState, useEffect } from 'react'
import { GitCommit, Star, GitFork, ExternalLink, RefreshCw, Loader2 } from 'lucide-react'

interface Repo {
  name: string
  description: string
  html_url: string
  stargazers_count: number
  forks_count: number
  language: string
  updated_at: string
  pushed_at: string
}

interface Event {
  id: string
  type: string
  repo: { name: string }
  created_at: string
  payload: { commits?: { message: string }[]; action?: string }
}

export default function GithubActivity() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(0)
  const [tab, setTab] = useState<'events' | 'repos'>('events')

  const fetchData = async (refresh = false) => {
    if (refresh) setLoading(true)
    try {
      const [repoRes, eventRes] = await Promise.all([
        fetch('https://api.github.com/users/poojakira/repos?sort=pushed&per_page=15'),
        fetch('https://api.github.com/users/poojakira/events?per_page=30'),
      ])
      if (repoRes.ok) setRepos(await repoRes.json())
      if (eventRes.ok) setEvents(await eventRes.json())
    } catch { /* silent */ }
    setNow(Date.now())
    setLoading(false)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchData() }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const formatDate = (d: string) => {
    const diff = now - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  const getEventText = (e: Event) => {
    switch (e.type) {
      case 'PushEvent': return e.payload.commits?.[0]?.message || 'Pushed commits'
      case 'CreateEvent': return `Created ${e.payload.action || 'branch/tag'}`
      case 'WatchEvent': return 'Starred a repo'
      case 'IssuesEvent': return `${e.payload.action} issue`
      case 'PullRequestEvent': return `${e.payload.action} PR`
      default: return e.type.replace('Event', '')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">GitHub Activity</h1>
          <p className="text-xs text-gray-400 mt-0.5">github.com/poojakira — recent activity & repos</p>
        </div>
        <button onClick={() => void fetchData(true)} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white border border-gray-700 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button onClick={() => setTab('events')} className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${tab === 'events' ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-500 hover:text-white'}`}>Recent Events</button>
        <button onClick={() => setTab('repos')} className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${tab === 'repos' ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-500 hover:text-white'}`}>Repositories ({repos.length})</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>
      ) : tab === 'events' ? (
        <div className="space-y-2">
          {events.length === 0 && <p className="text-sm text-gray-500 text-center py-12">No recent events found.</p>}
          {events.map(event => (
            <div key={event.id} className="flex items-start gap-3 p-3 bg-[#1a1d2e] border border-gray-800 rounded-lg">
              <GitCommit className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 truncate">{getEventText(event)}</p>
                <p className="text-[11px] text-gray-500">{event.repo.name.replace('poojakira/', '')} • {formatDate(event.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {repos.map(repo => (
            <a key={repo.name} href={repo.html_url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-[#1a1d2e] border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white flex items-center gap-1.5">{repo.name} <ExternalLink className="w-3 h-3 text-gray-500" /></p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{repo.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-shrink-0">
                  {repo.language && <span className="px-1.5 py-0.5 rounded bg-indigo-600/10 text-indigo-300">{repo.language}</span>}
                  {repo.stargazers_count > 0 && <span className="flex items-center gap-0.5"><Star className="w-3 h-3" />{repo.stargazers_count}</span>}
                  {repo.forks_count > 0 && <span className="flex items-center gap-0.5"><GitFork className="w-3 h-3" />{repo.forks_count}</span>}
                </div>
              </div>
              <p className="text-[10px] text-gray-600 mt-1">Updated {formatDate(repo.pushed_at)}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
