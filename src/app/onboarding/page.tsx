'use client'

import { useEffect, useState, type ElementType } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  Clock,
  Circle,
  AlertCircle,
  FileText,
  Laptop,
  DollarSign,
  Calendar,
  ChevronRight,
  Loader2,
  RotateCcw,
  Home,
} from 'lucide-react'

const EMPLOYEE_ID = 'a1000000-0000-0000-0000-000000000001'
const EMPLOYEE_NAME = 'Jordan Chen'

type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'done'

interface Task {
  id: string
  employee_id: string
  task_type: string
  title: string
  description?: string
  status: TaskStatus
  priority: number
  metadata?: Record<string, unknown>
}

interface DeviceRequest {
  id: string
  request_type: 'standard' | 'exception'
  status: 'pending' | 'approved' | 'denied' | 'procurement'
  manager_approval: string | null
  it_admin_approval: string | null
  snow_device_ticket: string | null
  snow_exception_ticket: string | null
  in_stock: boolean
  procurement_days: number | null
  updated_at: string
}

const TASK_CONFIG: Record<string, {
  label: string
  icon: ElementType
  route: string
  desc: string
  color: string
}> = {
  doc_signing: {
    label: 'Sign NDA',
    icon: FileText,
    route: '/onboarding/documents',
    desc: 'Review and sign your confidentiality agreement',
    color: 'text-blue-600 bg-blue-50',
  },
  device_setup: {
    label: 'Laptop setup',
    icon: Laptop,
    route: '/onboarding/laptop',
    desc: 'Choose your laptop setup and delivery preferences',
    color: 'text-purple-600 bg-purple-50',
  },
  payroll_setup: {
    label: 'Payroll & benefits enrollment',
    icon: DollarSign,
    route: '/onboarding/payroll',
    desc: 'Enroll in payroll and benefits',
    color: 'text-green-600 bg-green-50',
  },
  orientation: {
    label: 'Orientation & calendar setup',
    icon: Calendar,
    route: '/onboarding/orientation',
    desc: 'Schedule orientation and calendar events',
    color: 'text-amber-600 bg-amber-50',
  },
}

function statusLabel(status: TaskStatus) {
  if (status === 'done') return 'Done'
  if (status === 'in_progress') return 'In progress'
  if (status === 'blocked') return 'Blocked'
  return 'Not started'
}

function statusPillClass(status: TaskStatus) {
  if (status === 'done') return 'bg-green-100 text-green-700'
  if (status === 'in_progress') return 'bg-amber-100 text-amber-700'
  if (status === 'blocked') return 'bg-red-100 text-red-700'
  return 'bg-slate-100 text-slate-500'
}

function getExceptionStatusLabel(dr: DeviceRequest): { label: string; color: string } {
  if (dr.status === 'procurement') return { label: 'Fully approved — procurement in progress', color: 'text-green-600' }
  if (dr.status === 'denied') return { label: 'Exception denied — choose standard setup', color: 'text-red-600' }
  if (dr.it_admin_approval) return { label: 'Fully approved — procurement starting', color: 'text-green-600' }
  if (dr.manager_approval) return { label: 'Manager approved — awaiting IT approval', color: 'text-blue-600' }
  return { label: 'Pending manager approval', color: 'text-amber-600' }
}

function StatusIcon({ status }: { status: TaskStatus }) {
  if (status === 'done') return <CheckCircle className="w-5 h-5 text-green-500" />
  if (status === 'in_progress') return <Clock className="w-5 h-5 text-amber-500" />
  if (status === 'blocked') return <AlertCircle className="w-5 h-5 text-red-500" />
  return <Circle className="w-5 h-5 text-slate-300" />
}

export default function OnboardingPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [deviceRequest, setDeviceRequest] = useState<DeviceRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    loadTasks()

    const interval = setInterval(loadTasks, 5000)
    return () => clearInterval(interval)
  }, [])

  async function loadTasks() {
    try {
      const res = await fetch(`/api/tasks?employeeId=${EMPLOYEE_ID}`)
      const data = await res.json()
      setTasks(data.tasks ?? [])
      setDeviceRequest(data.deviceRequest ?? null)
    } catch (error) {
      console.error('Failed to load onboarding tasks', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    if (!confirm('Reset all onboarding progress and start fresh?')) return
    setResetting(true)
    await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_session', employeeId: EMPLOYEE_ID }),
    })
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  const doneCount = tasks.filter(task => task.status === 'done').length
  const total = tasks.length

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
        <span className="text-slate-500 text-sm">Onboarding Checklist</span>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-xs border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">JC</div>
          <span className="text-slate-600 text-sm">{EMPLOYEE_NAME}</span>
          <button onClick={() => router.push('/')} className="ml-1 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg p-1.5" title="Switch persona">
            <Home className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome, {EMPLOYEE_NAME.split(' ')[0]}! 👋</h1>
          <p className="text-slate-500">Complete these steps in any order before Day 1.</p>
        </div>

        {total > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">Overall progress</span>
              <span className="text-sm font-bold text-brand-600">{doneCount} of {total} complete</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-brand-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(doneCount / total) * 100}%` }} />
            </div>
          </div>
        )}

        <div className="space-y-3">
          {tasks.map(task => {
            const config = TASK_CONFIG[task.task_type]
            if (!config) return null

            const Icon = config.icon
            const isDone = task.status === 'done'
            const exceptionState = task.task_type === 'device_setup' && deviceRequest?.request_type === 'exception'
              ? getExceptionStatusLabel(deviceRequest)
              : null

            return (
              <button
                key={task.id}
                onClick={() => router.push(config.route)}
                className={`w-full text-left bg-white rounded-2xl border p-5 flex items-center gap-4 transition-all shadow-sm ${
                  isDone
                    ? 'border-green-200 hover:border-green-300'
                    : 'border-slate-200 hover:border-brand-300 hover:shadow-md'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-50' : config.color}`}>
                  {isDone ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Icon className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`font-semibold text-sm ${isDone ? 'text-slate-500' : 'text-slate-900'}`}>{config.label}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusPillClass(task.status)}`}>
                      {statusLabel(task.status)}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs">{config.desc}</p>
                  {exceptionState && task.status !== 'done' && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                        <span className={`text-xs font-medium ${exceptionState.color}`}>{exceptionState.label}</span>
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                        <div className={`px-2 py-1 rounded-md border ${deviceRequest?.manager_approval ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          Manager {deviceRequest?.manager_approval ? 'approved' : 'pending'}
                        </div>
                        <div className={`px-2 py-1 rounded-md border ${deviceRequest?.it_admin_approval ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          IT {deviceRequest?.it_admin_approval ? 'approved' : 'pending'}
                        </div>
                        <div className={`px-2 py-1 rounded-md border ${deviceRequest?.status === 'procurement' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          Procurement {deviceRequest?.status === 'procurement' ? 'started' : 'waiting'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusIcon status={task.status} />
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
