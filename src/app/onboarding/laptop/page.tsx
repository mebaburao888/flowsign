'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, ArrowLeft, RotateCcw, Home } from 'lucide-react'

const EMPLOYEE_ID = 'a1000000-0000-0000-0000-000000000001'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

interface SessionData {
  employeeId: string
  sessionId: string
  onboardingThreadId?: string
  itThreadId?: string
  standardConfig: {
    deviceModel: string
    deviceSpec: Record<string, string>
    standardApps: string[]
  }
}

function LaptopPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<SessionData | null>(null)
  const [preferences, setPreferences] = useState<Record<string, unknown>>({})
  const [submitted, setSubmitted] = useState(false)
  const [exceptionFiled, setExceptionFiled] = useState(false)
  const [exceptionTicket, setExceptionTicket] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const submittingRef = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { initializeSession() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function initializeSession() {
    try {
      const initRes = await fetch('/api/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: EMPLOYEE_ID }),
      })
      const initData = await initRes.json()

      const sessionData: SessionData = {
        employeeId: EMPLOYEE_ID,
        sessionId: initData.session.id,
        onboardingThreadId: initData.onboardingThreadId,
        itThreadId: initData.itThreadId,
        standardConfig: initData.standardConfig,
      }
      setSession(sessionData)

      // Check task status — if device_setup is done, redirect back
      const tasksRes = await fetch(`/api/tasks?employeeId=${EMPLOYEE_ID}`)
      const tasksData = await tasksRes.json()
      const deviceTask = tasksData.tasks?.find((t: { task_type: string; status: string }) => t.task_type === 'device_setup')
      if (deviceTask?.status === 'done') {
        router.push('/onboarding')
        return
      }
      if (deviceTask?.status === 'in_progress') {
        setExceptionFiled(true)
      }
      if (deviceTask?.status === 'blocked') {
        setDenied(true)
      }

      // Restore saved conversation
      const savedConversation: Message[] = Array.isArray(initData.session.conversation)
        ? initData.session.conversation
        : []

      if (savedConversation.length > 0) {
        setMessages(savedConversation)
        return
      }

      // Keep checklist as navigation hub when waiting on exception approval
      if (deviceTask?.status === 'in_progress') {
        return
      }

      // New session — kick off Alex
      const openingMessages: Message[] = [{ role: 'user', content: "Hi Alex, I'm ready to set up my laptop." }]
      await sendToAlex(openingMessages, sessionData.sessionId, sessionData.standardConfig, sessionData.onboardingThreadId, sessionData.itThreadId)
    } catch (e) {
      console.error('Init error', e)
    } finally {
      setInitializing(false)
    }
  }

  async function sendToAlex(
    msgs: Message[],
    sessionId?: string,
    stdConfig?: SessionData['standardConfig'],
    onboardingThreadId?: string,
    itThreadId?: string,
  ) {
    setLoading(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: msgs,
          employeeId: EMPLOYEE_ID,
          sessionId: sessionId ?? session?.sessionId,
          phase: 'confirm',
          collectedPreferences: preferences,
          onboardingThreadId: onboardingThreadId ?? session?.onboardingThreadId,
          itThreadId: itThreadId ?? session?.itThreadId,
        }),
      })
      const data = await res.json()
      const reply = data.reply as string

      if (data.onboardingThreadId || data.itThreadId) {
        setSession(prev => prev ? {
          ...prev,
          onboardingThreadId: data.onboardingThreadId ?? prev.onboardingThreadId,
          itThreadId: data.itThreadId ?? prev.itThreadId,
        } : prev)
      }

      const cleanReply = reply
        .replace(/\[READY_TO_SUBMIT\]/g, '')
        .replace(/\[EXCEPTION_REQUESTED\]/g, '')
        .trim()
      const newMessages = [...msgs, {
        role: 'assistant' as const,
        content: cleanReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]
      setMessages(newMessages)

      if (reply.includes('[READY_TO_SUBMIT]')) {
        setTimeout(() => handleSubmit(stdConfig), 1000)
      }
      if (reply.includes('[EXCEPTION_REQUESTED]')) {
        await handleExceptionSubmit()
      }
    } catch (e) {
      console.error('Alex error', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(stdConfig?: SessionData['standardConfig']) {
    if (!session || submittingRef.current) return
    submittingRef.current = true
    try {
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_standard',
          employeeId: EMPLOYEE_ID,
          sessionId: session.sessionId,
          preferences,
          standardConfig: stdConfig ?? session.standardConfig,
        }),
      })
      setSubmitted(true)
      // Redirect to checklist after short delay
      setTimeout(() => router.push('/onboarding'), 2000)
    } catch (e) {
      console.error('Submit error', e)
      submittingRef.current = false
    }
  }

  async function handleExceptionSubmit() {
    if (!session || submittingRef.current) return
    submittingRef.current = true
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_exception',
          employeeId: EMPLOYEE_ID,
          sessionId: session.sessionId,
          preferences,
          justification: (preferences.justification as string) ?? 'Non-standard device required for role',
          exceptionDevice: 'MacBook Pro 16" M3 Max',
        }),
      })
      const data = await res.json()
      setExceptionTicket(data.request?.snowExceptionTicket ?? null)
      setExceptionFiled(true)
    } catch (e) {
      console.error('Exception error', e)
      submittingRef.current = false
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMsg: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    await sendToAlex(newMessages)
  }

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/onboarding')} className="text-slate-400 hover:text-slate-600 transition-colors" title="Back to checklist">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M4 10h12M10 4l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <span className="font-semibold text-slate-900">FlowSign</span>
          <span className="text-slate-400 mx-2">·</span>
          <span className="text-slate-500 text-sm">Laptop Setup</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={async () => {
              if (!confirm('Reset laptop setup and start over?')) return
              submittingRef.current = false
              await fetch('/api/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset_laptop', employeeId: EMPLOYEE_ID }),
              })
              window.location.reload()
            }}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">JC</div>
          <span className="text-slate-600 text-sm">Jordan Chen</span>
          <button onClick={() => router.push('/')} className="ml-2 text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 rounded-lg p-1.5" title="Switch persona">
            <Home className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Submitted banner */}
      {submitted && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-green-800 text-sm font-medium">Laptop request submitted — IT is prepping your machine. Redirecting...</span>
        </div>
      )}

      {/* Exception banner */}
      {exceptionFiled && !submitted && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
          <p className="text-amber-800 text-sm font-semibold mb-1">⚠️ Exception request filed</p>
          <p className="text-amber-700 text-sm">Your manager and IT have been notified and will review within 1 business day. Check your inbox for updates.</p>
          {exceptionTicket && <p className="text-amber-600 text-xs mt-1 font-mono">Ticket: {exceptionTicket}</p>}
          <button onClick={() => router.push('/onboarding')} className="mt-3 text-brand-600 text-sm font-medium hover:underline">
            ← Back to checklist to continue other steps
          </button>
        </div>
      )}

      {denied && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-4">
          <p className="text-red-800 text-sm font-semibold mb-1">Exception request denied</p>
          <p className="text-red-700 text-sm">Please continue with the standard laptop setup to complete this step.</p>
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">
        {/* Alex intro */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">A</div>
          <div>
            <p className="font-semibold text-slate-900">Alex</p>
            <p className="text-slate-400 text-xs">FlowSign onboarding guide</p>
          </div>
        </div>

        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mr-2 mt-1">A</div>
              )}
              <div className={`max-w-sm px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-alex'}`}>
                <div dangerouslySetInnerHTML={{
                  __html: msg.content
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/\n- /g, '<br/>• ').replace(/^- /g, '• ')
                    .replace(/\n/g, '<br/>')
                }} />
                {msg.timestamp && (
                  <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>{msg.timestamp}</p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 fade-in">
              <div className="w-7 h-7 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">A</div>
              <div className="chat-bubble-alex px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot" />
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!submitted && !exceptionFiled && (
        <div className="bg-white border-t border-slate-200 px-4 py-4">
          <div className="max-w-2xl mx-auto flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Reply to Alex..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              disabled={loading}
            />
            <button onClick={handleSend} disabled={loading || !input.trim()}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl px-4 py-3 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LaptopSetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>}>
      <LaptopPage />
    </Suspense>
  )
}
