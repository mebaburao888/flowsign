'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Send, Loader2, FileText, PenLine, ArrowLeft, Home } from 'lucide-react'

interface FlowDoc {
  id: string
  title: string
  subtitle: string
  body: string
}

interface QAMessage {
  role: 'user' | 'assistant'
  content: string
}

const EMPLOYEE_ID = 'a1000000-0000-0000-0000-000000000001'

export default function DocsPage() {
  const router = useRouter()
  const [doc, setDoc] = useState<FlowDoc | null>(null)
  const [signed, setSigned] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [qaInput, setQaInput] = useState('')
  const [qaHistory, setQaHistory] = useState<QAMessage[]>([])
  const [qaLoading, setQaLoading] = useState(false)
  const [signing, setSigning] = useState(false)

  const qaBottomRef = useRef<HTMLDivElement>(null)
  const docScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    qaBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [qaHistory, qaLoading])

  async function loadData() {
    setLoading(true)
    try {
      const [docsRes, sessionRes] = await Promise.all([
        fetch(`/api/docs?employeeId=${EMPLOYEE_ID}`),
        fetch(`/api/requests?type=session&employeeId=${EMPLOYEE_ID}`),
      ])

      const docsData = await docsRes.json()
      const sessionData = await sessionRes.json()

      const ndaDoc: FlowDoc | null = (docsData.docs ?? []).find((d: FlowDoc) => d.id === 'nda') ?? null
      const signedIds: string[] = docsData.signedIds ?? []

      setDoc(ndaDoc)
      setSigned(signedIds.includes('nda'))
      setSessionId(sessionData.session?.id ?? null)

      if (signedIds.includes('nda')) {
        router.push('/onboarding')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSign() {
    if (!doc || signing || signed) return
    setSigning(true)
    try {
      const res = await fetch('/api/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign', employeeId: EMPLOYEE_ID, docId: 'nda', sessionId }),
      })
      const data = await res.json()
      if (data.success) {
        setSigned(true)
        setTimeout(() => router.push('/onboarding'), 500)
      }
    } finally {
      setSigning(false)
    }
  }

  async function handleAsk() {
    if (!qaInput.trim() || qaLoading || !doc) return
    const question = qaInput.trim()
    setQaInput('')
    const newHistory: QAMessage[] = [...qaHistory, { role: 'user', content: question }]
    setQaHistory(newHistory)
    setQaLoading(true)

    try {
      const res = await fetch('/api/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask',
          question,
          docTitle: doc.title,
          docBody: doc.body,
          history: qaHistory.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      setQaHistory([...newHistory, { role: 'assistant', content: data.answer }])
    } finally {
      setQaLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600 mb-3">NDA document not found.</p>
          <button onClick={() => router.push('/onboarding')} className="text-brand-600 text-sm hover:underline">Back to checklist</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/onboarding')} className="text-slate-400 hover:text-slate-600 transition-colors">
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
          <span className="text-slate-500 text-sm">NDA Signing</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className={`text-xs px-3 py-1 rounded-full font-medium ${signed ? 'bg-green-100 text-green-700' : 'bg-brand-100 text-brand-700'}`}>
            {signed ? 'Signed' : 'Pending signature'}
          </div>
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold ml-1">JC</div>
          <span className="text-slate-600 text-sm">Jordan Chen</span>
          <button onClick={() => router.push('/')} className="ml-2 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg p-1.5" title="Switch persona">
            <Home className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-slate-200 overflow-hidden">
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">{doc.subtitle}</p>
              <h2 className="text-lg font-bold text-slate-900">{doc.title}</h2>
            </div>
            {signed && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium bg-green-50 px-3 py-1.5 rounded-full">
                <CheckCircle className="w-4 h-4" /> Signed
              </div>
            )}
          </div>

          <div ref={docScrollRef} className="flex-1 overflow-y-auto px-8 py-6 bg-white">
            <div className="max-w-2xl mx-auto" dangerouslySetInnerHTML={{ __html: doc.body }} />
          </div>

          <div className="bg-white border-t border-slate-200 px-6 py-4">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <p className="text-slate-400 text-xs">
                {signed ? 'Signed electronically by Jordan Chen' : 'By clicking Sign, you agree to the terms above and are signing electronically.'}
              </p>
              <button
                onClick={handleSign}
                disabled={signed || signing}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  signed ? 'bg-green-100 text-green-700 cursor-default' : 'bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50'
                }`}
              >
                {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : signed ? <CheckCircle className="w-4 h-4" /> : <PenLine className="w-4 h-4" />}
                {signed ? 'Signed' : signing ? 'Signing…' : 'Sign NDA'}
              </button>
            </div>
          </div>
        </div>

        <div className="w-80 flex flex-col bg-slate-50">
          <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xs">A</div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Alex</p>
              <p className="text-slate-400 text-xs">Ask me about this NDA</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
            {qaHistory.length === 0 && (
              <div className="text-center py-6">
                <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-5 h-5 text-brand-500" />
                </div>
                <p className="text-slate-400 text-xs leading-relaxed px-2">Ask any question about the NDA before you sign.</p>
              </div>
            )}

            {qaHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mr-2 mt-1">A</div>
                )}
                <div className={`max-w-[200px] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  msg.role === 'user' ? 'bg-brand-500 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {qaLoading && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">A</div>
                <div className="bg-white border border-slate-200 rounded-xl px-3 py-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot" />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot" />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={qaBottomRef} />
          </div>

          <div className="bg-white border-t border-slate-200 px-3 py-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={qaInput}
                onChange={e => setQaInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                placeholder="Ask about this NDA…"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                disabled={qaLoading}
              />
              <button onClick={handleAsk} disabled={qaLoading || !qaInput.trim()} className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl px-3 py-2 transition-colors">
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
