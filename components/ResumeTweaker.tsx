'use client'

import { useState } from 'react'
import {
  FileText, Link2, Wand2, Eye, Check, X, Send, Settings,
  Loader2, AlertCircle, CheckCircle, Type, Download, RotateCcw
} from 'lucide-react'
import toast from 'react-hot-toast'

interface FontPreference {
  family: string
  headingSize: number
  bodySize: number
  nameSize: number
}

interface TweakedResume {
  summary: string
  skills: string[]
  experienceHighlights: string[]
  projectHighlights: string[]
  fullText: string
}

const fontOptions = [
  { label: 'Calibri (ATS-Friendly)', value: 'Calibri' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Garamond', value: 'Garamond' },
  { label: 'Cambria', value: 'Cambria' },
]

const sizePresets = [
  { label: 'Standard', nameSize: 16, headingSize: 12, bodySize: 10.5 },
  { label: 'Compact', nameSize: 14, headingSize: 11, bodySize: 10 },
  { label: 'Spacious', nameSize: 18, headingSize: 13, bodySize: 11 },
]

export default function ResumeTweaker() {
  const [jobLink, setJobLink] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [fontPrefs, setFontPrefs] = useState<FontPreference>({
    family: 'Calibri',
    headingSize: 12,
    bodySize: 10.5,
    nameSize: 16,
  })
  const [showSettings, setShowSettings] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [tweakedResume, setTweakedResume] = useState<TweakedResume | null>(null)
  const [isApproved, setIsApproved] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleGenerate = async () => {
    if (!jobLink && !jobDescription) {
      toast.error('Paste a job link or description first')
      return
    }

    setIsGenerating(true)
    setTweakedResume(null)
    setIsApproved(false)
    setSent(false)

    try {
      const response = await fetch('/api/resume-tweak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobLink, jobDescription, fontPreferences: fontPrefs }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate')
      }

      const data = await response.json()
      setTweakedResume(data.tweakedResume)
      toast.success('Resume tweaked — review before applying')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApprove = () => {
    setIsApproved(true)
    // Save to history
    const history = JSON.parse(localStorage.getItem('resume-history') || '[]')
    history.unshift({
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      jobLink,
      jobTitle: jobDescription.substring(0, 80) || jobLink,
      fontPreferences: fontPrefs,
      tweakedResume,
    })
    localStorage.setItem('resume-history', JSON.stringify(history.slice(0, 100)))
    toast.success('Approved & saved to history')
  }

  const handleReject = () => {
    setTweakedResume(null)
    setIsApproved(false)
    toast('Rejected — tweak again with different input', { icon: '↩️' })
  }

  const handleDownloadPDF = async () => {
    if (!tweakedResume) return
    setIsDownloading(true)

    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweakedResume, fontPreferences: fontPrefs, jobLink }),
      })

      if (!response.ok) throw new Error('PDF generation failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Pooja_Kiran_Resume_${Date.now()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'PDF generation failed')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!tweakedResume || !isApproved) return
    setIsSending(true)

    try {
      const response = await fetch('/api/send-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweakedResume, jobLink, jobDescription, fontPreferences: fontPrefs }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send')
      }

      setSent(true)
      toast.success('Sent to pkiran1@asu.edu ✓')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Email failed')
    } finally {
      setIsSending(false)
    }
  }

  const handleReset = () => {
    setJobLink('')
    setJobDescription('')
    setTweakedResume(null)
    setIsApproved(false)
    setSent(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Resume Tweaker</h1>
          <p className="text-xs text-gray-400 mt-0.5">Paste JD → AI tweaks → you approve → PDF + email</p>
        </div>
        {(tweakedResume || jobLink || jobDescription) && (
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 border border-gray-700 transition-colors">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Input Section */}
        <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-5">
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-300 mb-1.5">
                <Link2 className="w-3.5 h-3.5" /> Job Link
              </label>
              <input
                type="url"
                value={jobLink}
                onChange={(e) => setJobLink(e.target.value)}
                placeholder="https://careers.company.com/job/..."
                className="w-full px-3 py-2.5 rounded-lg bg-[#0f1117] border border-gray-700 text-white placeholder-gray-600 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all"
                disabled={isGenerating || isApproved}
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-300 mb-1.5">
                <FileText className="w-3.5 h-3.5" /> Job Description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here..."
                rows={6}
                className="w-full px-3 py-2.5 rounded-lg bg-[#0f1117] border border-gray-700 text-white placeholder-gray-600 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all resize-y"
                disabled={isGenerating || isApproved}
              />
            </div>

            {/* Font Settings */}
            <div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-400 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Font & Size: {fontPrefs.family}, {fontPrefs.bodySize}pt
              </button>

              {showSettings && (
                <div className="mt-3 p-4 rounded-lg bg-[#0f1117] border border-gray-700 space-y-3">
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Font Family</label>
                    <select
                      value={fontPrefs.family}
                      onChange={(e) => setFontPrefs({ ...fontPrefs, family: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#1a1d2e] border border-gray-700 text-white text-sm outline-none focus:border-indigo-500"
                    >
                      {fontOptions.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">Size Preset</label>
                    <div className="flex gap-2">
                      {sizePresets.map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => setFontPrefs({ ...fontPrefs, nameSize: preset.nameSize, headingSize: preset.headingSize, bodySize: preset.bodySize })}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs transition-all ${
                            fontPrefs.bodySize === preset.bodySize
                              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                              : 'bg-[#1a1d2e] text-gray-400 border border-gray-700 hover:text-white'
                          }`}
                        >
                          {preset.label} ({preset.bodySize}pt)
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Name', key: 'nameSize' as const },
                      { label: 'Heading', key: 'headingSize' as const },
                      { label: 'Body', key: 'bodySize' as const },
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <label className="text-[10px] text-gray-500">{label} (pt)</label>
                        <input
                          type="number"
                          value={fontPrefs[key]}
                          onChange={(e) => setFontPrefs({ ...fontPrefs, [key]: +e.target.value })}
                          step={0.5}
                          className="w-full px-2 py-1.5 rounded bg-[#1a1d2e] border border-gray-700 text-white text-xs outline-none focus:border-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generate Button */}
          {!tweakedResume && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (!jobLink && !jobDescription)}
              className="mt-4 w-full py-3 rounded-lg bg-indigo-600 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Tweaking...</>
              ) : (
                <><Wand2 className="w-4 h-4" /> Tweak Resume</>
              )}
            </button>
          )}
        </div>

        {/* Preview Section */}
        {tweakedResume && !isApproved && (
          <div className="bg-[#1a1d2e] border border-amber-600/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Eye className="w-4 h-4 text-amber-400" /> Preview — Review Before Applying
              </h2>
              <span className="text-[10px] text-gray-500 font-mono">{fontPrefs.family} | {fontPrefs.bodySize}pt</span>
            </div>

            <div className="space-y-4 max-h-80 overflow-y-auto pr-2 text-sm">
              <div>
                <h3 className="text-xs font-semibold text-indigo-400 mb-1 uppercase tracking-wide">Summary</h3>
                <p className="text-gray-300 leading-relaxed">{tweakedResume.summary}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-indigo-400 mb-1 uppercase tracking-wide">Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {tweakedResume.skills.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-xs bg-indigo-600/10 text-indigo-300 border border-indigo-600/20">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-indigo-400 mb-1 uppercase tracking-wide">Experience</h3>
                <ul className="space-y-1">
                  {tweakedResume.experienceHighlights.map((h, i) => (
                    <li key={i} className="text-gray-300 text-xs flex gap-2"><span className="text-indigo-400">•</span>{h}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-indigo-400 mb-1 uppercase tracking-wide">Projects</h3>
                <ul className="space-y-1">
                  {tweakedResume.projectHighlights.map((p, i) => (
                    <li key={i} className="text-gray-300 text-xs flex gap-2"><span className="text-purple-400">•</span>{p}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-700">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-xs text-amber-300 flex-grow">Review changes before approving</span>
              <button onClick={handleReject} className="px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors flex items-center gap-1">
                <X className="w-3 h-3" /> Reject
              </button>
              <button onClick={handleApprove} className="px-3 py-1.5 rounded-lg text-xs text-green-400 border border-green-500/30 hover:bg-green-500/10 transition-colors flex items-center gap-1">
                <Check className="w-3 h-3" /> Approve
              </button>
            </div>
          </div>
        )}

        {/* Post-Approval Actions */}
        {isApproved && (
          <div className="bg-[#1a1d2e] border border-green-600/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-300">Approved</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download PDF
              </button>
              <button
                onClick={handleSendEmail}
                disabled={isSending || sent}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <CheckCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {sent ? 'Sent ✓' : 'Email to pkiran1@asu.edu'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
