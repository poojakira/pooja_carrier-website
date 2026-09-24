'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User, Trash2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem('ai-chat-history')
      if (saved) setMessages(JSON.parse(saved))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      })
      const data = await res.json()
      const withReply = [...updated, { role: 'assistant' as const, content: data.reply }]
      setMessages(withReply)
      localStorage.setItem('ai-chat-history', JSON.stringify(withReply))
    } catch {
      const withErr = [...updated, { role: 'assistant' as const, content: 'Error: could not get response. Check your OPENAI_API_KEY in .env' }]
      setMessages(withErr)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setMessages([])
    localStorage.removeItem('ai-chat-history')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">AI Assistant</h1>
          <p className="text-xs text-gray-400 mt-0.5">Ask about your projects, draft cover letters, interview prep</p>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClear} className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1 transition-colors">
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <Bot className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Ask me anything about your job search</p>
            <div className="mt-4 space-y-2">
              {['Which of my projects relates to cloud security?', 'Draft a cover letter for an AI Security role at Google', 'Help me prep for a MCP security interview question'].map(q => (
                <button key={q} onClick={() => setInput(q)} className="block mx-auto text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-600/10 px-3 py-1.5 rounded-lg transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && <div className="w-6 h-6 rounded-md bg-indigo-600/20 flex items-center justify-center flex-shrink-0 mt-0.5"><Bot className="w-3.5 h-3.5 text-indigo-400" /></div>}
            <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
              msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-[#1a1d2e] border border-gray-800 text-gray-300'
            }`}>
              {msg.content}
            </div>
            {msg.role === 'user' && <div className="w-6 h-6 rounded-md bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5"><User className="w-3.5 h-3.5 text-gray-300" /></div>}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-md bg-indigo-600/20 flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-indigo-400" /></div>
            <div className="bg-[#1a1d2e] border border-gray-800 px-3 py-2 rounded-lg"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask about projects, cover letters, interview prep..."
          className="flex-1 px-4 py-3 rounded-lg bg-[#1a1d2e] border border-gray-800 text-white text-sm placeholder-gray-600 outline-none focus:border-indigo-500"
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} className="px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
