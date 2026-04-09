'use client'

import { useRouter } from 'next/navigation'
import { FileText, Shield, DollarSign, ChevronRight, MessageCircle } from 'lucide-react'

const DOCS_OVERVIEW = [
  {
    id: 'nda',
    title: 'Confidentiality & NDA',
    description: 'Covers what counts as confidential information, invention assignment, and non-solicitation.',
    icon: Shield,
    color: 'bg-blue-50 text-blue-600 border-blue-100',
  },
  {
    id: 'benefits',
    title: 'Benefits & Payroll Acknowledgment',
    description: 'Confirms your benefits package enrollment and authorizes payroll processing.',
    icon: DollarSign,
    color: 'bg-green-50 text-green-600 border-green-100',
  },
]

export default function DocumentsIntroPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
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
        <div className="max-w-lg w-full">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
            <span className="text-sm font-semibold text-brand-700">Step 1 of 4</span>
            <span className="text-slate-400 text-sm">— Document Signing</span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-brand-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Review & Sign Documents</h2>
            </div>
            <p className="text-slate-500 text-sm mb-6 ml-[52px]">
              Before we get started, you'll need to sign two documents. You can ask Alex questions about anything before signing.
            </p>

            {/* Doc list */}
            <div className="space-y-3 mb-6">
              {DOCS_OVERVIEW.map((doc, i) => {
                const Icon = doc.icon
                return (
                  <div key={doc.id} className={`flex items-start gap-4 rounded-xl p-4 border ${doc.color}`}>
                    <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold opacity-60">Doc {i + 1} of {DOCS_OVERVIEW.length}</span>
                      </div>
                      <p className="font-semibold text-slate-900 text-sm">{doc.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{doc.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Q&A callout */}
            <div className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 mb-6 border border-slate-200">
              <MessageCircle className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
              <p className="text-slate-600 text-xs leading-relaxed">
                <strong>Questions?</strong> Alex will be right there in the sidebar as you review each document. Ask anything — except pay negotiation, which is handled separately by HR.
              </p>
            </div>

            <button
              onClick={() => router.push('/onboarding/docs')}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              Review Documents
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
