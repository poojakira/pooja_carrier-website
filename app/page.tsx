'use client'

import { useState } from 'react'
import {
  FileText, Briefcase, History, MessageSquare, Github,
  ChevronLeft, ChevronRight, Zap
} from 'lucide-react'
import ResumeTweaker from '@/components/ResumeTweaker'
import JobTracker from '@/components/JobTracker'
import ResumeHistory from '@/components/ResumeHistory'
import AIAssistant from '@/components/AIAssistant'
import GithubActivity from '@/components/GithubActivity'
import DashboardHome from '@/components/DashboardHome'

const navItems = [
  { id: 'home', label: 'Dashboard', icon: Zap },
  { id: 'tweaker', label: 'Resume Tweaker', icon: FileText },
  { id: 'tracker', label: 'Job Tracker', icon: Briefcase },
  { id: 'history', label: 'Resume History', icon: History },
  { id: 'assistant', label: 'AI Assistant', icon: MessageSquare },
  { id: 'github', label: 'GitHub Activity', icon: Github },
]

export default function Home() {
  const [activePage, setActivePage] = useState('home')
  const [collapsed, setCollapsed] = useState(false)

  const renderPage = () => {
    switch (activePage) {
      case 'home': return <DashboardHome onNavigate={setActivePage} />
      case 'tweaker': return <ResumeTweaker />
      case 'tracker': return <JobTracker />
      case 'history': return <ResumeHistory />
      case 'assistant': return <AIAssistant />
      case 'github': return <GithubActivity />
      default: return <DashboardHome onNavigate={setActivePage} />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-56'} flex-shrink-0 bg-[#151823] border-r border-gray-800 flex flex-col transition-all duration-200`}>
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-gray-800">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm text-white">Career OS</span>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center mx-auto">
              <Zap className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activePage === item.id
                  ? 'bg-indigo-600/15 text-indigo-400 font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <div className="p-2 border-t border-gray-800">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center py-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-6xl mx-auto">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}
