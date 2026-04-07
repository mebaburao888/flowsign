'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Send, Loader2 } from 'lucide-react'

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

type Phase = 'confirm' | 'preferences' | 'exception_check' | 'complete'

const EMPLOYEE_ID = 'a1000000-0000-0000-0000-000000000001'

export default function OnboardingPage() {
  const searchParams = useSearchParams()
  const isException = searchParams.get('scenario') === 'exception'

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<SessionData | null>(null)
  const [phase, setPhase] = useState<Phase>('confirm')
  const [preferences, setPreferences] = useState<Record<string, unknown>>({})
  const [submitted, setSubmitted] = useState(false)
  const [ticketNumber, setTicketNumber] = useState('')
  const [exceptionFiled, setExceptionFiled] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initializeSession()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function initializeSession() {
    try {
      const res = await fetch('/api/requests?type=session&employeeId=' + EMPLOYEE_ID)
      const data = await res.json()

      const configRes = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          employeeId: EMPLOYEE_ID,
          sessionId: data.session?.id ?? 'new',
          phase: 'confirm',
          collectedPreferences: {},
          initOnly: true,
        }),
      })

      // Init the session via orchestrator
      const initRes = await fetch('/api/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: EMPLOYEE_ID }),
      })
      const initData = await initRes.json()

      setSession({
        employeeId: EMPLOYEE_ID,
        sessionId: initData.session.id,
        onboardingThreadId: initData.onboardingThreadId,
        itThreadId: initData.itThreadId,
        standardConfig: initData.standardConfig,
      })

      // Kick off Alex with opening message
      const openingMessages: Message[] = []
      if (isException) {
        openingMessages.push({
          role: 'user',
          content: 'Hi, I just got hired and wanted to start my onboarding.',
        })
      } else {
        openingMessages.push({
          role: 'user',
          content: 'Hi Alex! Ready to get started.',
        })
      }

      await sendToAlex(openingMessages, initData.session.id, initData.standardConfig)
    } catch (e) {
      console.error('Init error', e)
    } finally {
      setInitializing(false)
    }
  }

  async function sendToAlex(
    msgs: Message[],
    sessionId?: string,
    stdConfig?: SessionData['standardConfig']
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
          phase,
          collectedPreferences: preferences,
          onboardingThreadId: sessionId ? session?.onboardingThreadId : undefined,
          itThreadId: sessionId ? session?.itThreadId : undefined,
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

      const newMessages = [...msgs, {
        role: 'assistant' as const,
        content: reply.replace('[READY_TO_SUBMIT]', '').replace('[EXCEPTION_REQUESTED]', '').trim(),
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

  async function handleSubmit(stdConfig?: SessionData['standardConfig']) {
    if (!session) return
    try {
      const res = await fetch('/api/requests', {
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
      const data = await res.json()
      setTicketNumber(data.ticketNumber)
      setSubmitted(true)
      setPhase('complete')
    } catch (e) {
      console.error('Submit error', e)
    }
  }

  async function handleExceptionSubmit() {
    if (!session) return
    try {
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_exception',
          employeeId: EMPLOYEE_ID,
          sessionId: session.sessionId,
          preferences,
          justification: (preferences.justification as string) ?? 'Local model testing requirements',
          exceptionDevice: 'MacBook Pro 16" M3 Max',
        }),
      })
      setExceptionFiled(true)
    } catch (e) {
      console.error('Exception submit error', e)
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading your onboarding portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M4 10h12M10 4l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <span className="font-semibold text-slate-900">FlowSign</span>
          <span className="text-slate-400 mx-2">·</span>
          <span className="text-slate-500 text-sm">Employee Onboarding</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">JC</div>
          <span className="text-slate-600 text-sm">Jordan Chen</span>
        </div>
      </header>

      {/* Completion banner */}
      {submitted && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <div>
            <span className="text-green-800 font-medium text-sm">You're all set! </span>
            <span className="text-green-600 text-sm">IT is prepping your MacBook Pro. Reference: </span>
            <span className="text-green-800 font-mono text-sm font-medium">{ticketNumber}</span>
          </div>
        </div>
      )}

      {exceptionFiled && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3">
          <div className="w-5 h-5 text-amber-500">⚠️</div>
          <span className="text-amber-800 text-sm font-medium">
            Exception request filed — your manager and IT have been notified simultaneously. You'll hear back within 1 business day.
          </span>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">
        {/* Alex intro card */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            A
          </div>
          <div>
            <p className="font-semibold text-slate-900">Alex</p>
            <p className="text-slate-400 text-xs">FlowSign Onboarding Guide · Powered by Claude</p>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mr-2 mt-1">
                  A
                </div>
              )}
              <div className={`max-w-sm px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-alex'
              }`}>
                {msg.content}
                {msg.timestamp && (
                  <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex items-center gap-2 fade-in">
              <div className="w-7 h-7 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                A
              </div>
              <div className="chat-bubble-alex px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
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
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl px-4 py-3 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
