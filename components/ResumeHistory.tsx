'use client'

import { useState, useEffect } from 'react'
import { Search, Trash2, Download, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

interface HistoryItem {
  id: string
  date: string
  jobLink: string
  jobTitle: string
  fontPreferences: { family: string; headingSize: number; bodySize: number; nameSize: number }
  tweakedResume: { summary: string; skills: string[]; experienceHighlights: string[]; projectHighlights: string[]; fullText: string }
}

export default function ResumeHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHistory(JSON.parse(localStorage.getItem('resume-history') || '[]'))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const filtered = history.filter(h =>
    h.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
    h.jobLink.toLowerCase().includes(search.toLowerCase()) ||
    h.tweakedResume.summary.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = (id: string) => {
    const updated = history.filter(h => h.id !== id)
    setHistory(updated)
    localStorage.setItem('resume-history', JSON.stringify(updated))
    toast.success('Deleted')
  }

  const handleClearAll = () => {
    if (!confirm('Clear all resume history?')) return
    setHistory([])
    localStorage.setItem('resume-history', '[]')
    toast.success('History cleared')
  }

  const handleDownload = async (item: HistoryItem) => {
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweakedResume: item.tweakedResume, fontPreferences: item.fontPreferences, jobLink: item.jobLink }),
      })
      if (!response.ok) throw new Error('Failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Resume_${item.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('PDF generation failed')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Resume History</h1>
          <p className="text-xs text-gray-400 mt-0.5">{history.length} saved versions</p>
        </div>
        {history.length > 0 && (
          <button onClick={handleClearAll} className="text-xs text-red-400 hover:text-red-300 transition-colors">Clear All</button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by job title, link, or content..."
          className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#1a1d2e] border border-gray-800 text-white text-sm placeholder-gray-600 outline-none focus:border-indigo-500"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-12">
          {history.length === 0 ? 'No resume history yet. Tweak a resume to get started.' : 'No results match your search.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <div key={item.id} className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span className="text-[11px] text-gray-500">{item.date}</span>
                    <span className="text-[10px] text-gray-600 font-mono">{item.fontPreferences.family} {item.fontPreferences.bodySize}pt</span>
                  </div>
                  {item.jobLink && (
                    <a href={item.jobLink} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline truncate block mb-1">{item.jobLink}</a>
                  )}
                  <p className="text-sm text-gray-300 line-clamp-2">{item.tweakedResume.summary}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tweakedResume.skills.slice(0, 5).map((s, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-600/10 text-indigo-300">{s}</span>
                    ))}
                    {item.tweakedResume.skills.length > 5 && <span className="text-[10px] text-gray-500">+{item.tweakedResume.skills.length - 5}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleDownload(item)} className="p-1.5 rounded text-gray-500 hover:text-indigo-400" title="Download PDF"><Download className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
