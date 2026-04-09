'use client'

import { useRouter } from 'next/navigation'
import { FileText, Shield, ChevronRight, MessageCircle, ArrowLeft } from 'lucide-react'

export default function DocumentsIntroPage() {
  const router = useRouter()

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
        <span className="font-semibold text-slate-900">FlowSign</span>
        <span className="text-slate-400 mx-2">·</span>
        <span className="text-slate-500 text-sm">NDA Signing</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">JC</div>
          <span className="text-slate-600 text-sm">Jordan Chen</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-brand-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Sign your NDA</h2>
          </div>

          <p className="text-slate-500 text-sm mb-6 ml-[52px]">
            Before continuing onboarding, please review and sign the confidentiality agreement.
          </p>

          <div className="flex items-start gap-4 rounded-xl p-4 border bg-blue-50 text-blue-700 border-blue-100 mb-6">
            <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Confidentiality & NDA</p>
              <p className="text-slate-600 text-xs mt-0.5">Covers confidential information, invention assignment, and non-solicitation.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 mb-6 border border-slate-200">
            <MessageCircle className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
            <p className="text-slate-600 text-xs leading-relaxed">
              Need clarification? Alex is available while you review the NDA.
            </p>
          </div>

          <button
            onClick={() => router.push('/onboarding/docs')}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Review NDA
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
