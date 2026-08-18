'use client'

import { FileText, Briefcase, History, MessageSquare, Github, ArrowRight, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Props {
  onNavigate: (page: string) => void
}

export default function DashboardHome({ onNavigate }: Props) {
  const [stats, setStats] = useState({ applications: 0, resumes: 0, lastTweak: '' })

  useEffect(() => {
    const apps = JSON.parse(localStorage.getItem('job-applications') || '[]')
    const history = JSON.parse(localStorage.getItem('resume-history') || '[]')
    const lastTweak = history.length > 0 ? history[0].date : 'Never'
    setStats({ applications: apps.length, resumes: history.length, lastTweak })
  }, [])

  const quickActions = [
    { id: 'tweaker', label: 'Tweak Resume', desc: 'Paste a JD and get a tailored resume', icon: FileText, color: 'bg-indigo-600/15 text-indigo-400' },
    { id: 'tracker', label: 'Track Application', desc: 'Log a new job application', icon: Briefcase, color: 'bg-emerald-600/15 text-emerald-400' },
    { id: 'assistant', label: 'Ask AI', desc: 'Get help with cover letters, prep', icon: MessageSquare, color: 'bg-purple-600/15 text-purple-400' },
    { id: 'github', label: 'GitHub Activity', desc: 'See your recent commits', icon: Github, color: 'bg-orange-600/15 text-orange-400' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Career OS</h1>
        <p className="text-sm text-gray-400 mt-1">Your personal job search automation tool</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Applications Tracked</span>
            <Briefcase className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{stats.applications}</p>
        </div>
        <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Resume Versions</span>
            <History className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{stats.resumes}</p>
        </div>
        <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Last Tweak</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-sm font-medium text-white mt-2 truncate">{stats.lastTweak || 'Never'}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="text-sm font-semibold text-gray-300 mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => onNavigate(action.id)}
            className="flex items-center gap-4 p-4 bg-[#1a1d2e] border border-gray-800 rounded-xl hover:border-gray-700 hover:bg-[#1e2235] transition-all text-left group"
          >
            <div className={`p-2.5 rounded-lg ${action.color}`}>
              <action.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{action.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
          </button>
        ))}
      </div>

      {/* Info */}
      <div className="mt-8 p-4 bg-indigo-600/5 border border-indigo-600/20 rounded-xl">
        <p className="text-xs text-indigo-300">
          <strong>Setup:</strong> Add your <code className="bg-indigo-600/20 px-1 rounded">OPENAI_API_KEY</code> and Gmail SMTP credentials in <code className="bg-indigo-600/20 px-1 rounded">.env</code> to enable AI tweaking and email sending. Without them, the tool uses smart local matching and skips email.
        </p>
      </div>
    </div>
  )
}
