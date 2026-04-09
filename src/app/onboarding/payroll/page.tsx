'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, Loader2, ShieldCheck, Landmark, ReceiptText } from 'lucide-react'

const EMPLOYEE_ID = 'a1000000-0000-0000-0000-000000000001'

export default function PayrollPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const [directDepositConfirmed, setDirectDepositConfirmed] = useState(false)
  const [taxFormsConfirmed, setTaxFormsConfirmed] = useState(false)
  const [benefitsConfirmed, setBenefitsConfirmed] = useState(false)

  useEffect(() => {
    loadTaskState()
  }, [])

  async function loadTaskState() {
    try {
      const res = await fetch(`/api/tasks?employeeId=${EMPLOYEE_ID}`)
      const data = await res.json()
      const payrollTask = data.tasks?.find((t: { task_type: string; status: string; metadata?: Record<string, boolean> }) => t.task_type === 'payroll_setup')

      if (payrollTask?.metadata) {
        setDirectDepositConfirmed(Boolean(payrollTask.metadata.directDepositConfirmed))
        setTaxFormsConfirmed(Boolean(payrollTask.metadata.taxFormsConfirmed))
        setBenefitsConfirmed(Boolean(payrollTask.metadata.benefitsConfirmed))
      }

      if (payrollTask?.status === 'done') {
        setDone(true)
        setTimeout(() => router.push('/onboarding'), 500)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleComplete() {
    if (saving || done) return
    setSaving(true)

    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: EMPLOYEE_ID,
          taskType: 'payroll_setup',
          status: 'done',
          metadata: {
            directDepositConfirmed,
            taxFormsConfirmed,
            benefitsConfirmed,
            completedAt: new Date().toISOString(),
          },
        }),
      })

      setDone(true)
      setTimeout(() => router.push('/onboarding'), 700)
    } finally {
      setSaving(false)
    }
  }

  const canComplete = directDepositConfirmed && taxFormsConfirmed && benefitsConfirmed

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
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
        <span className="font-semibold text-slate-900">FlowSign</span>
        <span className="text-slate-400 mx-2">·</span>
        <span className="text-slate-500 text-sm">Payroll & Benefits</span>
      </header>

      {done && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 flex items-center gap-2 text-green-700 text-sm font-medium">
          <CheckCircle className="w-4 h-4" /> Payroll and benefits setup complete. Returning to checklist…
        </div>
      )}

      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Payroll and benefits acknowledgment</h1>
          <p className="text-sm text-slate-500 mb-6">Confirm that your payroll and benefits setup items are complete.</p>

          <div className="space-y-3 mb-6">
            <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={directDepositConfirmed}
                onChange={e => setDirectDepositConfirmed(e.target.checked)}
                className="w-4 h-4 mt-0.5"
                disabled={done}
              />
              <div>
                <div className="flex items-center gap-2 text-slate-800 text-sm font-medium">
                  <Landmark className="w-4 h-4 text-brand-500" /> Direct deposit details submitted
                </div>
                <p className="text-xs text-slate-500 mt-1">Bank account details have been provided for payroll processing.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={taxFormsConfirmed}
                onChange={e => setTaxFormsConfirmed(e.target.checked)}
                className="w-4 h-4 mt-0.5"
                disabled={done}
              />
              <div>
                <div className="flex items-center gap-2 text-slate-800 text-sm font-medium">
                  <ReceiptText className="w-4 h-4 text-brand-500" /> Tax forms completed
                </div>
                <p className="text-xs text-slate-500 mt-1">Federal and state payroll forms are complete and ready for HR review.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={benefitsConfirmed}
                onChange={e => setBenefitsConfirmed(e.target.checked)}
                className="w-4 h-4 mt-0.5"
                disabled={done}
              />
              <div>
                <div className="flex items-center gap-2 text-slate-800 text-sm font-medium">
                  <ShieldCheck className="w-4 h-4 text-brand-500" /> Benefits package acknowledged
                </div>
                <p className="text-xs text-slate-500 mt-1">You have reviewed health, retirement, and PTO policy details.</p>
              </div>
            </label>
          </div>

          <button
            onClick={handleComplete}
            disabled={done || saving || !canComplete}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {done ? 'Completed' : saving ? 'Saving…' : 'Mark payroll setup as complete'}
          </button>
        </div>
      </main>
    </div>
  )
}
