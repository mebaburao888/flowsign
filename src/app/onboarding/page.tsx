'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Send, Loader2, Laptop, ClipboardList, RotateCcw, DollarSign, Calendar, Sparkles } from 'lucide-react'

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

const EMPLOYEE_ID = 'a1000000-0000-0000-0000-000000000001'

function getContextualReplies(lastAssistantMsg: string, messageCount: number): string[] {
  const msg = lastAssistantMsg.toLowerCase()
  if (msg.includes('vs code') || msg.includes('ide') || msg.includes('development environment')) {
    return ['VS Code', 'JetBrains', 'Vim']
  }
  if (msg.includes('terminal') || msg.includes('iterm')) {
    return ['Default terminal', 'iTerm2', 'Warp']
  }
  if (msg.includes('claude code')) {
    return ['Yes, add Claude Code ✨', 'No thanks']
  }
  if (msg.includes('ship') || msg.includes('deliver') || msg.includes('pickup') || msg.includes('office')) {
    return ['Ship to home address', 'Office pickup']
  }
  if (msg.includes('out of stock') || msg.includes('procurement') || msg.includes('non-standard') || msg.includes('exception')) {
    return ["It's a hard requirement", 'Standard laptop is fine']
  }
  if (msg.includes('summary') || msg.includes('submit') || msg.includes('confirm') || messageCount > 8) {
    return ['Looks good — submit it', 'I need to change something']
  }
  if ((msg.includes('standard') || msg.includes('macbook') || msg.includes('laptop')) && messageCount < 4) {
    return ['Standard laptop works for me', 'I want the 16" MacBook Pro']
  }
  return ['Looks right — continue', 'Something looks wrong']
}

const NEXT_STEPS = [
  { label: 'Payroll Setup', desc: 'Direct deposit & tax forms', icon: DollarSign, href: '/onboarding/payroll' },
  { label: 'Orientation Scheduling', desc: 'Book your Day 1 session', icon: Calendar, href: '/onboarding/orientation' },
]

function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isException = searchParams.get('scenario') === 'exception'

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<SessionData | null>(null)
  const [showChecklist, setShowChecklist] = useState(true)
  const [preferences, setPreferences] = useState<Record<string, unknown>>({})
  const [submitted, setSubmitted] = useState(false)
  const [ticketNumber, setTicketNumber] = useState('')
  const [exceptionFiled, setExceptionFiled] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const submittingRef = useRef(false) // guard against duplicate ticket submissions
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initializeSession()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function initializeSession() {
    try {
      // Init session — reuses existing DB session + thread IDs if they exist
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

      // Restore saved conversation if it exists (session persistence)
      const savedConversation: Message[] = Array.isArray(initData.session.conversation)
        ? initData.session.conversation
        : []

      if (savedConversation.length > 0) {
        // Returning user — restore messages, skip opening greeting
        setMessages(savedConversation)
        setShowChecklist(false)
        // Check if already submitted/exception filed
        const sessionStatus = initData.session.status
        if (sessionStatus === 'complete') setSubmitted(true)
        return
      }

      // New session — kick off Alex with opening message
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
    if (!session || submittingRef.current) return
    submittingRef.current = true
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
      setShowChecklist(false)
    } catch (e) {
      console.error('Submit error', e)
      submittingRef.current = false // allow retry on error
    }
  }

  async function handleExceptionSubmit() {
    if (!session || submittingRef.current) return
    submittingRef.current = true
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
      submittingRef.current = false // allow retry on error
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
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={async () => {
              if (!confirm('Reset conversation and start fresh?')) return
              await fetch('/api/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset_session', employeeId: EMPLOYEE_ID }),
              })
              window.location.reload()
            }}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-xs border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 transition-colors"
            title="Reset conversation"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">JC</div>
          <span className="text-slate-600 text-sm">Jordan Chen</span>
        </div>
      </header>

      {/* Completion banner */}
      {submitted && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <div>
            <span className="text-green-800 font-medium text-sm">Request submitted. </span>
            <span className="text-green-600 text-sm">IT is prepping your standard laptop. Reference: </span>
            <span className="text-green-800 font-mono text-sm font-medium">{ticketNumber}</span>
          </div>
        </div>
      )}

      {exceptionFiled && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-5 h-5 text-amber-500 mt-0.5">⚠️</div>
            <div>
              <p className="text-amber-800 text-sm font-semibold mb-1">Exception request filed</p>
              <p className="text-amber-700 text-sm">Your manager and IT have been notified and will review within 1 business day. Check your inbox for updates.</p>
            </div>
          </div>
          <p className="text-amber-700 text-xs font-semibold uppercase tracking-wider mb-2 ml-8">Continue with your onboarding:</p>
          <div className="ml-8 flex gap-3 flex-wrap">
            {NEXT_STEPS.map(step => {
              const Icon = step.icon
              return (
                <button key={step.label} onClick={() => router.push(step.href)}
                  className="flex items-center gap-2.5 bg-white border border-amber-200 hover:border-amber-400 rounded-xl px-4 py-2.5 text-left transition-colors">
                  <Icon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-amber-900 text-xs font-semibold">{step.label}</p>
                    <p className="text-amber-600 text-xs">{step.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">
        {showChecklist && !submitted && !exceptionFiled && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-semibold text-slate-900">Your onboarding checklist</p>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Day 0</span>
                </div>
                <p className="text-sm text-slate-600 mb-4">Let's knock out the laptop setup first so IT can get moving.</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-2 text-brand-700">
                    <CheckCircle className="w-4 h-4" />
                    <span>Review your role and start date</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
                    <Laptop className="w-4 h-4" />
                    <span>Choose standard laptop or request an exception</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
                    <Sparkles className="w-4 h-4" />
                    <span>Set a few setup preferences for IT</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alex intro card */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            A
          </div>
          <div>
            <p className="font-semibold text-slate-900">Alex</p>
            <p className="text-slate-400 text-xs">FlowSign onboarding guide</p>
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
                <div dangerouslySetInnerHTML={{
                  __html: msg.content
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\n- /g, '<br/>• ')
                    .replace(/^- /g, '• ')
                    .replace(/\n/g, '<br/>')
                }} />
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

export default function OnboardingPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>}>
      <OnboardingPage />
    </Suspense>
  )
}
