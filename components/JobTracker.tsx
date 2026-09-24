'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, X, Check, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

interface Application {
  id: string
  company: string
  role: string
  link: string
  status: 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'ghosted'
  resumeVersion: string
  dateApplied: string
  notes: string
}

const statusColors: Record<string, string> = {
  applied: 'bg-blue-500/15 text-blue-400',
  screening: 'bg-amber-500/15 text-amber-400',
  interview: 'bg-purple-500/15 text-purple-400',
  offer: 'bg-green-500/15 text-green-400',
  rejected: 'bg-red-500/15 text-red-400',
  ghosted: 'bg-gray-500/15 text-gray-400',
}

export default function JobTracker() {
  const [apps, setApps] = useState<Application[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ company: '', role: '', link: '', status: 'applied' as Application['status'], resumeVersion: '', notes: '' })
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setApps(JSON.parse(localStorage.getItem('job-applications') || '[]'))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const save = (updated: Application[]) => {
    setApps(updated)
    localStorage.setItem('job-applications', JSON.stringify(updated))
  }

  const handleSubmit = () => {
    if (!form.company || !form.role) { toast.error('Company and role required'); return }

    if (editId) {
      save(apps.map(a => a.id === editId ? { ...a, ...form } : a))
      toast.success('Updated')
    } else {
      save([{ id: Date.now().toString(), dateApplied: new Date().toLocaleDateString(), ...form }, ...apps])
      toast.success('Application added')
    }
    setForm({ company: '', role: '', link: '', status: 'applied', resumeVersion: '', notes: '' })
    setShowForm(false)
    setEditId(null)
  }

  const handleEdit = (app: Application) => {
    setForm({ company: app.company, role: app.role, link: app.link, status: app.status, resumeVersion: app.resumeVersion, notes: app.notes })
    setEditId(app.id)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    save(apps.filter(a => a.id !== id))
    toast.success('Deleted')
  }

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Job Tracker</h1>
          <p className="text-xs text-gray-400 mt-0.5">{apps.length} applications tracked</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ company: '', role: '', link: '', status: 'applied', resumeVersion: '', notes: '' }) }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="Company" className="px-3 py-2 rounded-lg bg-[#0f1117] border border-gray-700 text-white text-sm outline-none focus:border-indigo-500" />
            <input value={form.role} onChange={e => setForm({...form, role: e.target.value})} placeholder="Role" className="px-3 py-2 rounded-lg bg-[#0f1117] border border-gray-700 text-white text-sm outline-none focus:border-indigo-500" />
          </div>
          <input value={form.link} onChange={e => setForm({...form, link: e.target.value})} placeholder="Job link (optional)" className="w-full px-3 py-2 rounded-lg bg-[#0f1117] border border-gray-700 text-white text-sm outline-none focus:border-indigo-500" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value as Application['status']})} className="px-3 py-2 rounded-lg bg-[#0f1117] border border-gray-700 text-white text-sm outline-none focus:border-indigo-500">
              <option value="applied">Applied</option>
              <option value="screening">Screening</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
              <option value="ghosted">Ghosted</option>
            </select>
            <input value={form.resumeVersion} onChange={e => setForm({...form, resumeVersion: e.target.value})} placeholder="Resume version used" className="px-3 py-2 rounded-lg bg-[#0f1117] border border-gray-700 text-white text-sm outline-none focus:border-indigo-500" />
          </div>
          <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes..." rows={2} className="w-full px-3 py-2 rounded-lg bg-[#0f1117] border border-gray-700 text-white text-sm outline-none focus:border-indigo-500 resize-none" />
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="px-4 py-2 rounded-lg text-xs bg-indigo-600 text-white hover:bg-indigo-500"><Check className="w-3 h-3 inline mr-1" />{editId ? 'Update' : 'Save'}</button>
            <button onClick={() => { setShowForm(false); setEditId(null) }} className="px-4 py-2 rounded-lg text-xs text-gray-400 border border-gray-700 hover:text-white"><X className="w-3 h-3 inline mr-1" />Cancel</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {['all', 'applied', 'screening', 'interview', 'offer', 'rejected', 'ghosted'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-2.5 py-1 rounded text-xs transition-colors ${filter === s ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-500 hover:text-white'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-12">No applications yet. Click Add to start tracking.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(app => (
            <div key={app.id} className="bg-[#1a1d2e] border border-gray-800 rounded-lg p-3 flex items-center gap-3 hover:border-gray-700 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">{app.company}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[app.status]}`}>{app.status}</span>
                </div>
                <p className="text-xs text-gray-400 truncate">{app.role}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{app.dateApplied}{app.resumeVersion && ` • Resume: ${app.resumeVersion}`}</p>
              </div>
              <div className="flex items-center gap-1">
                {app.link && <a href={app.link} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded text-gray-500 hover:text-white"><ExternalLink className="w-3.5 h-3.5" /></a>}
                <button onClick={() => handleEdit(app)} className="p-1.5 rounded text-gray-500 hover:text-indigo-400"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(app.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
