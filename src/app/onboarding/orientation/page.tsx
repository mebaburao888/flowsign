'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, CheckCircle, Loader2, Home } from 'lucide-react'

const EMPLOYEE_ID = 'a1000000-0000-0000-0000-000000000001'

export default function OrientationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const [orientationSlot, setOrientationSlot] = useState('Monday 10:00 AM PT')
  const [managerIntro, setManagerIntro] = useState(true)
  const [itWelcome, setItWelcome] = useState(true)

  useEffect(() => {
    checkTaskStatus()
  }, [])

  async function checkTaskStatus() {
    try {
      const res = await fetch(`/api/tasks?employeeId=${EMPLOYEE_ID}`)
      const data = await res.json()
      const orientationTask = data.tasks?.find((t: { task_type: string; status: string }) => t.task_type === 'orientation')
      if (orientationTask?.status === 'done') {
        setDone(true)
        setTimeout(() => router.push('/onboarding'), 500)
      }
    } finally {
      setLoading(false)
    }
  }

  async function markComplete() {
    setSaving(true)
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: EMPLOYEE_ID,
          taskType: 'orientation',
          status: 'done',
          metadata: {
            orientationSlot,
            managerIntro,
            itWelcome,
            completedAt: new Date().toISOString(),
          },
        }),
      })
      setDone(true)
      setTimeout(() => router.push('/onboarding'), 600)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
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
        <span className="text-slate-500 text-sm">Orientation & Calendar Setup</span>
        <button onClick={() => router.push('/')} className="ml-auto text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg p-1.5" title="Switch persona">
          <Home className="w-4 h-4" />
        </button>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Orientation scheduling</h1>
          <p className="text-sm text-slate-500 mb-6">Pick your orientation time and confirm calendar events.</p>

          {done ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-2 text-green-700 text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> Orientation setup complete. Returning to checklist…
            </div>
          ) : (
            <>
              <label className="block text-sm text-slate-600 font-medium mb-2">Orientation slot</label>
              <div className="relative mb-5">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <select
                  value={orientationSlot}
                  onChange={e => setOrientationSlot(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-sm"
                >
                  <option>Monday 10:00 AM PT</option>
                  <option>Monday 1:00 PM PT</option>
                  <option>Tuesday 9:30 AM PT</option>
                  <option>Tuesday 2:00 PM PT</option>
                </select>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { label: 'Manager intro meeting on calendar', value: managerIntro, set: setManagerIntro },
                  { label: 'IT welcome + account setup session on calendar', value: itWelcome, set: setItWelcome },
                ].map(item => (
                  <label key={item.label} className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={item.value} onChange={e => item.set(e.target.checked)} className="w-4 h-4" />
                    <span className="text-sm text-slate-700">{item.label}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={markComplete}
                disabled={saving || !managerIntro || !itWelcome}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {saving ? 'Saving…' : 'Mark orientation as complete'}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
