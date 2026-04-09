'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, Users } from 'lucide-react'

interface DeviceRequest {
  id: string
  status: 'pending' | 'approved' | 'denied' | 'procurement'
  device_spec: { model: string; ram: string; storage: string }
  preferences: { ide?: string; terminal?: string; claudeCode?: boolean }
  justification?: string
  in_stock: boolean
  procurement_days?: number
  snow_exception_ticket?: string
  snow_device_ticket?: string
  manager_approval?: string
  it_admin_approval?: string
  created_at: string
  employee: {
    id: string
    name: string
    email: string
    role: string
    team: string
    start_date: string
  }
}

interface OnboardingTask {
  id: string
  task_type: string
  title: string
  status: 'pending' | 'in_progress' | 'blocked' | 'done'
}

const MARCUS_ID = 'a1000000-0000-0000-0000-000000000003'

export default function HiringManagerPage() {
  const [requests, setRequests] = useState<DeviceRequest[]>([])
  const [tasks, setTasks] = useState<OnboardingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)
  const [approvedIds, setApprovedIds] = useState<string[]>([])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    try {
      const [reqRes, taskRes] = await Promise.all([
        fetch('/api/requests?type=pending_exceptions'),
        fetch('/api/tasks?employeeId=a1000000-0000-0000-0000-000000000001'),
      ])

      const reqData = await reqRes.json()
      const taskData = await taskRes.json()

      setRequests(reqData.requests ?? [])
      setTasks(taskData.tasks ?? [])
    } catch (e) {
      console.error('Load error', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(requestId: string) {
    setActioning(requestId)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          requestId,
          approverId: MARCUS_ID,
          approverRole: 'manager',
        }),
      })
      const data = await res.json()
      setApprovedIds(prev => [...prev, requestId])

      if (data.status === 'fully_approved') {
        // Both approved — refresh to show updated state
      }
      await loadData()
    } finally {
      setActioning(null)
    }
  }

  async function handleDeny(requestId: string) {
    setActioning(requestId)
    try {
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deny',
          requestId,
          reason: 'Non-standard device request not approved. Please proceed with the standard device configuration.',
        }),
      })
      await loadData()
    } finally {
      setActioning(null)
    }
  }

  const pendingMyApproval = requests.filter(r => !r.manager_approval && r.status === 'pending')
  const awaitingIT = requests.filter(r => r.manager_approval && !r.it_admin_approval && r.status === 'pending')
  const inProgress = requests.filter(r => r.status === 'procurement')
  const autoApprovedDemoCount = 3
  const completedTaskCount = tasks.filter(t => t.status === 'done').length
  const totalTaskCount = tasks.length

  return (
    <div className="min-h-screen bg-slate-50">
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
          <span className="text-slate-500 text-sm">Hiring Manager</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={loadData} className="text-slate-400 hover:text-slate-600">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">MT</div>
          <span className="text-slate-600 text-sm">Marcus Torres</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Needs My Approval', value: pendingMyApproval.length, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Awaiting IT', value: awaitingIT.length, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'In Procurement', value: inProgress.length, color: 'text-green-500', bg: 'bg-green-50' },
            { label: 'Auto-Approved Standard', value: autoApprovedDemoCount, color: 'text-slate-700', bg: 'bg-slate-100' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-xl p-5 border border-white`}>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-slate-600 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Approval logic</p>
              <p className="text-sm text-slate-500 mt-1">Standard laptop requests are auto-approved. Only non-standard exceptions land here for manager review first.</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">Demo workflow</span>
          </div>
        </div>

        {totalTaskCount > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Jordan onboarding progress</p>
                <p className="text-xs text-slate-500">Live checklist completion status for your new hire</p>
              </div>
              <span className="text-sm font-semibold text-brand-600">{completedTaskCount}/{totalTaskCount}</span>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full mb-4">
              <div
                className="h-2 bg-brand-500 rounded-full transition-all"
                style={{ width: `${(completedTaskCount / totalTaskCount) * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {tasks.map(task => (
                <div key={task.id} className={`rounded-lg border px-3 py-2 text-xs ${
                  task.status === 'done'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : task.status === 'in_progress'
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : task.status === 'blocked'
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <p className="font-semibold">{task.title}</p>
                  <p className="capitalize mt-0.5">{task.status.replace('_', ' ')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Needs action */}
        {pendingMyApproval.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Needs Your Approval
            </h2>
            <div className="space-y-4">
              {pendingMyApproval.map(req => (
                <div key={req.id} className="bg-white rounded-xl border-2 border-amber-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 text-lg">{req.employee.name}</h3>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          Exception Request
                        </span>
                      </div>
                      <p className="text-slate-500 text-sm">{req.employee.role} · {req.employee.team}</p>
                      <p className="text-slate-500 text-sm">Starts <strong>{req.employee.start_date}</strong></p>
                    </div>
                    {req.snow_exception_ticket && (
                      <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
                        {req.snow_exception_ticket}
                      </span>
                    )}
                  </div>

                  {/* Risk banner */}
                  {!req.in_stock && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-amber-700 text-sm">
                        Item not in stock — procurement adds <strong>{req.procurement_days} days</strong>. 
                        This is close to Jordan's start date. Approval needed today to avoid a delay.
                      </p>
                    </div>
                  )}

                  {/* Device comparison */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                      <p className="text-xs text-slate-400 font-medium mb-1">TEAM STANDARD</p>
                      <p className="font-medium text-slate-700">MacBook Pro 14" M3 Pro</p>
                      <p className="text-sm text-slate-500">18GB RAM · 512GB SSD</p>
                      <p className="text-green-600 text-xs mt-1 font-medium">✓ In stock</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                      <p className="text-xs text-amber-600 font-medium mb-1">REQUESTED</p>
                      <p className="font-medium text-slate-700">{req.device_spec.model}</p>
                      <p className="text-sm text-slate-500">{req.device_spec.ram} · {req.device_spec.storage}</p>
                      <p className="text-red-500 text-xs mt-1 font-medium">✗ Not in stock</p>
                    </div>
                  </div>

                  {req.justification && (
                    <div className="bg-slate-50 rounded-lg px-4 py-3 mb-4 text-sm border border-slate-100">
                      <span className="font-medium text-slate-700">Jordan's justification: </span>
                      <span className="text-slate-600">{req.justification}</span>
                    </div>
                  )}

                  {/* IT status */}
                  <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Clock className="w-4 h-4" />
                      <span>Approval chain: Manager review → IT approval → procurement / prep</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">Nothing auto-approves on the exception path.</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={actioning === req.id}
                      className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve Exception
                    </button>
                    <button
                      onClick={() => handleDeny(req.id)}
                      disabled={actioning === req.id}
                      className="flex items-center gap-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Deny — use standard
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Awaiting IT */}
        {awaitingIT.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Approved by You — Awaiting IT
            </h2>
            {awaitingIT.map(req => (
              <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{req.employee.name}</p>
                  <p className="text-slate-500 text-sm">{req.device_spec.model}</p>
                </div>
                <div className="flex items-center gap-2 text-blue-500 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Waiting on Priya</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* In Procurement */}
        {inProgress.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              In Procurement
            </h2>
            {inProgress.map(req => (
              <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{req.employee.name}</p>
                  <p className="text-slate-500 text-sm">{req.device_spec.model} · {req.snow_device_ticket}</p>
                </div>
                <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  <span>Ordered</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && requests.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No pending requests for your team</p>
            <p className="text-slate-400 text-sm mt-1">You'll be notified when action is needed</p>
          </div>
        )}
      </div>
    </div>
  )
}
