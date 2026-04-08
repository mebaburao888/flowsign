'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Send, Loader2, FileText, ChevronRight, PenLine, Laptop, DollarSign, Calendar } from 'lucide-react'

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

const CHECKLIST_STEPS = [
  { id: 'docs',        label: 'Sign Documents',      icon: FileText,    desc: 'NDA & Benefits acknowledgment' },
  { id: 'laptop',      label: 'IT Setup',            icon: Laptop,      desc: 'Laptop selection & preferences' },
  { id: 'payroll',     label: 'Payroll Setup',       icon: DollarSign,  desc: 'Direct deposit & tax forms' },
  { id: 'orientation', label: 'Orientation',         icon: Calendar,    desc: 'Schedule your Day 1 session' },
]

export default function DocsPage() {
  const router = useRouter()
  const [docs, setDocs] = useState<FlowDoc[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [signedIds, setSignedIds] = useState<string[]>([])
  const [allComplete, setAllComplete] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showChecklist, setShowChecklist] = useState(true)

  // Q&A state
  const [qaInput, setQaInput] = useState('')
  const [qaHistory, setQaHistory] = useState<QAMessage[]>([])
  const [qaLoading, setQaLoading] = useState(false)
  const [signing, setSigning] = useState(false)

  const qaBottomRef = useRef<HTMLDivElement>(null)
  const docScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadData() }, [])
  useEffect(() => { qaBottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [qaHistory, qaLoading])
  useEffect(() => {
    setQaHistory([])
    docScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentIdx])

  async function loadData() {
    setLoading(true)
    try {
      const [docsRes, sessionRes] = await Promise.all([
        fetch(`/api/docs?employeeId=${EMPLOYEE_ID}`),
        fetch(`/api/requests?type=session&employeeId=${EMPLOYEE_ID}`),
      ])
      const docsData = await docsRes.json()
      const sessionData = await sessionRes.json()
      const loadedDocs: FlowDoc[] = docsData.docs ?? []
      const alreadySigned: string[] = docsData.signedIds ?? []

      setDocs(loadedDocs)
      setSessionId(sessionData.session?.id ?? null)
      setSignedIds(alreadySigned)

      // Check if already fully complete
      const requiredIds = loadedDocs.map(d => d.id)
      const done = requiredIds.length > 0 && requiredIds.every(id => alreadySigned.includes(id))
      if (done) {
        setAllComplete(true)
        return
      }

      // Jump to first unsigned doc
      const firstUnsignedIdx = loadedDocs.findIndex(d => !alreadySigned.includes(d.id))
      if (firstUnsignedIdx >= 0) {
        setCurrentIdx(firstUnsignedIdx)
        setShowChecklist(false) // if returning mid-flow, skip checklist overview
      }

      // If some are already signed but not all, skip the checklist intro
      if (alreadySigned.length > 0) setShowChecklist(false)
    } finally {
      setLoading(false)
    }
  }

  const currentDoc = docs[currentIdx]
  const isCurrentSigned = currentDoc ? signedIds.includes(currentDoc.id) : false

  async function handleSign() {
    if (!currentDoc || signing || isCurrentSigned) return
    setSigning(true)
    try {
      const res = await fetch('/api/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign', employeeId: EMPLOYEE_ID, docId: currentDoc.id, sessionId }),
      })
      const data = await res.json()
      setSignedIds(data.signedIds ?? [])
      if (data.allComplete) {
        setAllComplete(true)
      } else {
        setTimeout(() => setCurrentIdx(i => i + 1), 600)
      }
    } finally {
      setSigning(false)
    }
  }

  async function handleAsk() {
    if (!qaInput.trim() || qaLoading || !currentDoc) return
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
          docTitle: currentDoc.title,
          docBody: currentDoc.body,
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

  // ─── Checklist overview screen ───
  if (showChecklist) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M4 10h12M10 4l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-semibold text-slate-900">FlowSign</span>
          <span className="text-slate-400 mx-2">·</span>
          <span className="text-slate-500 text-sm">Onboarding</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">JC</div>
            <span className="text-slate-600 text-sm">Jordan Chen</span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Welcome, Jordan! 👋</h2>
              <p className="text-slate-500 text-sm">Here's everything we'll cover during your onboarding. This takes about 15 minutes.</p>
            </div>

            <div className="space-y-3 mb-8">
              {CHECKLIST_STEPS.map((step, i) => {
                const Icon = step.icon
                const isDone = i === 0 ? allComplete : false // only docs step can be done here
                return (
                  <div key={step.id} className={`flex items-center gap-4 rounded-xl px-4 py-3.5 border ${
                    i === 0 ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isDone ? 'bg-green-100' : i === 0 ? 'bg-brand-100' : 'bg-slate-200'
                    }`}>
                      {isDone ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Icon className={`w-5 h-5 ${i === 0 ? 'text-brand-600' : 'text-slate-400'}`} />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold text-sm ${i === 0 ? 'text-brand-900' : 'text-slate-600'}`}>{step.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
                    </div>
                    {i === 0 && <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">Up next</span>}
                    {i > 0 && <span className="text-xs text-slate-300 font-medium">Step {i + 1}</span>}
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => setShowChecklist(false)}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              Start with Document Signing
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── All docs complete ───
  if (allComplete) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Documents signed!</h2>
          <p className="text-slate-500 text-sm mb-6">Your manager has been notified. Next up: get your laptop sorted.</p>
          <div className="space-y-2 text-left mb-6">
            {docs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 bg-green-50 rounded-xl px-4 py-3">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-green-800 font-medium">{doc.title}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => router.push('/onboarding')}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Continue to IT Setup
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // ─── Doc signing view ───
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
          <span className="text-slate-500 text-sm">Document Signing</span>
        </div>
        {/* Progress pills */}
        <div className="ml-auto flex items-center gap-2">
          {docs.map((doc, i) => (
            <div key={doc.id} className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium transition-all ${
              signedIds.includes(doc.id) ? 'bg-green-100 text-green-700' :
              i === currentIdx ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-400'
            }`}>
              {signedIds.includes(doc.id) ? <CheckCircle className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
              {doc.title}
            </div>
          ))}
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold ml-2">JC</div>
          <span className="text-slate-600 text-sm">Jordan Chen</span>
        </div>
      </header>

      {/* Main: doc + Q&A */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Document */}
        <div className="flex-1 flex flex-col border-r border-slate-200 overflow-hidden">
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">{currentDoc?.subtitle}</p>
              <h2 className="text-lg font-bold text-slate-900">{currentDoc?.title}</h2>
            </div>
            {isCurrentSigned && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium bg-green-50 px-3 py-1.5 rounded-full">
                <CheckCircle className="w-4 h-4" />
                Signed
              </div>
            )}
          </div>

          <div ref={docScrollRef} className="flex-1 overflow-y-auto px-8 py-6 bg-white">
            <div className="max-w-2xl mx-auto" dangerouslySetInnerHTML={{ __html: currentDoc?.body ?? '' }} />
          </div>

          <div className="bg-white border-t border-slate-200 px-6 py-4">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <p className="text-slate-400 text-xs">
                {isCurrentSigned
                  ? 'Signed electronically by Jordan Chen'
                  : 'By clicking Sign, you agree to the terms above and are signing electronically.'}
              </p>
              <button
                onClick={handleSign}
                disabled={isCurrentSigned || signing}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  isCurrentSigned ? 'bg-green-100 text-green-700 cursor-default' :
                  'bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50'
                }`}
              >
                {signing ? <Loader2 className="w-4 h-4 animate-spin" /> :
                 isCurrentSigned ? <CheckCircle className="w-4 h-4" /> :
                 <PenLine className="w-4 h-4" />}
                {isCurrentSigned ? 'Signed' : signing ? 'Signing…' : 'Sign Document'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Alex Q&A */}
        <div className="w-80 flex flex-col bg-slate-50">
          <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xs">A</div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Alex</p>
              <p className="text-slate-400 text-xs">Ask me about this document</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
            {qaHistory.length === 0 && (
              <div className="text-center py-6">
                <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-5 h-5 text-brand-500" />
                </div>
                <p className="text-slate-400 text-xs leading-relaxed px-2">Questions about the <strong>{currentDoc?.title}</strong>? Ask me anything.</p>
                <div className="mt-4 space-y-2">
                  {currentDoc?.id === 'nda' ? [
                    'What counts as confidential info?',
                    'Can I work on side projects?',
                    'What is invention assignment?',
                  ] : [
                    'When does benefits coverage start?',
                    'How does 401k matching work?',
                    'What is the enrollment window?',
                  ].map(q => (
                    <button key={q} onClick={() => setQaInput(q)}
                      className="block w-full text-left text-xs bg-white border border-slate-200 hover:border-brand-300 hover:text-brand-700 rounded-xl px-3 py-2 text-slate-600 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {qaHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mr-2 mt-1">A</div>
                )}
                <div className={`max-w-[200px] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  msg.role === 'user' ? 'bg-brand-500 text-white rounded-br-sm' :
                  'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
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
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot"></div>
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
                placeholder="Ask about this doc…"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                disabled={qaLoading}
              />
              <button onClick={handleAsk} disabled={qaLoading || !qaInput.trim()}
                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl px-3 py-2 transition-colors">
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
