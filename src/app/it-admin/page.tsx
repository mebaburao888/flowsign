'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Package, AlertTriangle, RefreshCw, FileText } from 'lucide-react'

interface DeviceRequest {
  id: string
  request_type: 'standard' | 'exception'
  status: 'pending' | 'approved' | 'denied' | 'procurement'
  device_spec: { model: string; ram: string; storage: string }
  preferences: { ide?: string; terminal?: string; claudeCode?: boolean; deliveryMethod?: string }
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

interface SnowTicket {
  id: string
  ticket_number: string
  ticket_type: 'exception' | 'device_prep'
  status: string
  priority: string
  payload: {
    title: string
    appsToInstall?: string[]
    prepSteps?: string[]
    procurementSteps?: string[]
    device?: Record<string, string>
    employee?: { name: string; role: string; startDate: string; location: string }
    delivery?: string
  }
  due_date: string
  created_at: string
}

const PRIYA_ID = 'a1000000-0000-0000-0000-000000000002'

export default function ITAdminPage() {
  const [requests, setRequests] = useState<DeviceRequest[]>([])
  const [tickets, setTickets] = useState<SnowTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<SnowTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)
  const [tab, setTab] = useState<'queue' | 'tickets'>('queue')

  useEffect(() => {
    loadData()
    // Poll for realtime updates
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    try {
      const [reqRes, ticketRes] = await Promise.all([
        fetch('/api/requests?type=pending_exceptions'),
        fetch('/api/requests?type=snow_tickets'),
      ])
      const reqData = await reqRes.json()
      const ticketData = await ticketRes.json()
      setRequests(reqData.requests ?? [])
      setTickets(ticketData.tickets ?? [])
    } catch (e) {
      console.error('Load error', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(requestId: string) {
    setActioning(requestId)
    try {
      await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          requestId,
          approverId: PRIYA_ID,
          approverRole: 'it_admin',
        }),
      })
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
          reason: 'Non-standard device request denied by IT. Standard device will be prepared.',
        }),
      })
      await loadData()
    } finally {
      setActioning(null)
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-green-100 text-green-700',
      denied: 'bg-red-100 text-red-700',
      procurement: 'bg-blue-100 text-blue-700',
    }
    return map[status] ?? 'bg-slate-100 text-slate-600'
  }

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
          <span className="text-slate-500 text-sm">IT Admin</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={loadData} className="text-slate-400 hover:text-slate-600">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">PR</div>
          <span className="text-slate-600 text-sm">Priya Rajan</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Pending Approval', value: requests.filter(r => r.status === 'pending').length, icon: Clock, color: 'text-amber-500' },
            { label: 'In Procurement', value: requests.filter(r => r.status === 'procurement').length, icon: Package, color: 'text-blue-500' },
            { label: 'Open Tickets', value: tickets.filter(t => t.status === 'open').length, icon: FileText, color: 'text-purple-500' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-slate-500 text-sm">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
          {(['queue', 'tickets'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'queue' ? 'Approval Queue' : 'SNow Tickets'}
            </button>
          ))}
        </div>

        {tab === 'queue' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-slate-500">No pending requests — queue is clear</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{req.employee.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(req.status)}`}>
                          {req.status}
                        </span>
                        {!req.in_stock && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Out of stock
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm">{req.employee.role} · {req.employee.team} · Starts {req.employee.start_date}</p>
                    </div>
                    {req.snow_exception_ticket && (
                      <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
                        {req.snow_exception_ticket}
                      </span>
                    )}
                  </div>

                  {/* Device info */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                      <p className="text-xs text-amber-600 font-medium mb-1">REQUESTED</p>
                      <p className="font-semibold text-slate-900">{req.device_spec.model}</p>
                      <p className="text-slate-500 text-sm">{req.device_spec.ram} · {req.device_spec.storage}</p>
                      {req.procurement_days && (
                        <p className="text-amber-600 text-xs mt-1">+{req.procurement_days} days procurement</p>
                      )}
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                      <p className="text-xs text-slate-400 font-medium mb-1">PREFERENCES</p>
                      <div className="space-y-1 text-sm text-slate-600">
                        {req.preferences.ide && <p>IDE: {req.preferences.ide}</p>}
                        {req.preferences.terminal && <p>Terminal: {req.preferences.terminal}</p>}
                        {req.preferences.claudeCode && <p className="text-brand-600">✓ Claude Code</p>}
                        {req.preferences.deliveryMethod && (
                          <p>{req.preferences.deliveryMethod === 'ship_home' ? '📦 Ship home' : '🏢 Office pickup'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {req.justification && (
                    <div className="bg-slate-50 rounded-lg px-4 py-3 mb-4 text-sm text-slate-600 border border-slate-100">
                      <span className="font-medium text-slate-700">Justification: </span>{req.justification}
                    </div>
                  )}

                  {/* Approval status */}
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className={`flex items-center gap-1.5 ${req.manager_approval ? 'text-green-600' : 'text-amber-500'}`}>
                      {req.manager_approval ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      <span>Manager: {req.manager_approval ? 'Approved' : 'Pending'}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${req.it_admin_approval ? 'text-green-600' : 'text-amber-500'}`}>
                      {req.it_admin_approval ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      <span>IT Admin: {req.it_admin_approval ? 'Approved' : 'Pending'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {req.status === 'pending' && !req.it_admin_approval && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={actioning === req.id}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleDeny(req.id)}
                        disabled={actioning === req.id}
                        className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Deny
                      </button>
                    </div>
                  )}
                  {req.status === 'procurement' && (
                    <div className="flex items-center gap-2 text-blue-600 text-sm">
                      <Package className="w-4 h-4" />
                      <span>In procurement — SNow ticket: <span className="font-mono">{req.snow_device_ticket}</span></span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'tickets' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Ticket list */}
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full text-left bg-white rounded-xl border p-4 transition-all ${
                    selectedTicket?.id === ticket.id
                      ? 'border-brand-500 ring-1 ring-brand-500'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-medium text-brand-600">{ticket.ticket_number}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        ticket.priority === 'P1' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>{ticket.priority}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        ticket.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>{ticket.status}</span>
                    </div>
                  </div>
                  <p className="text-slate-700 text-sm font-medium">{ticket.payload.title}</p>
                  <p className="text-slate-400 text-xs mt-1">Due {ticket.due_date}</p>
                </button>
              ))}
              {tickets.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">No tickets yet</div>
              )}
            </div>

            {/* Ticket detail */}
            {selectedTicket ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6 h-fit sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono font-bold text-brand-600">{selectedTicket.ticket_number}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    selectedTicket.priority === 'P1' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>{selectedTicket.priority}</span>
                </div>

                <h3 className="font-semibold text-slate-900 mb-4">{selectedTicket.payload.title}</h3>

                {selectedTicket.payload.employee && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 font-medium uppercase mb-2">Employee</p>
                    <p className="text-sm text-slate-700 font-medium">{selectedTicket.payload.employee.name}</p>
                    <p className="text-sm text-slate-500">{selectedTicket.payload.employee.role} · Start {selectedTicket.payload.employee.startDate}</p>
                    <p className="text-sm text-slate-500">{selectedTicket.payload.delivery}</p>
                  </div>
                )}

                {selectedTicket.payload.device && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 font-medium uppercase mb-2">Device</p>
                    <p className="text-sm font-medium text-slate-700">{selectedTicket.payload.device.model}</p>
                    <p className="text-sm text-slate-500">{selectedTicket.payload.device.ram} · {selectedTicket.payload.device.storage}</p>
                  </div>
                )}

                {selectedTicket.payload.procurementSteps && (
                  <div className="mb-4">
                    <p className="text-xs text-red-500 font-medium uppercase mb-2">⚠ Procurement Steps</p>
                    <ol className="space-y-1">
                      {selectedTicket.payload.procurementSteps.map((step, i) => (
                        <li key={i} className="text-sm text-slate-600 flex gap-2">
                          <span className="text-slate-400 flex-shrink-0">{i + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {selectedTicket.payload.appsToInstall && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 font-medium uppercase mb-2">Apps to Install</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTicket.payload.appsToInstall.map((app) => (
                        <span key={app} className={`text-xs px-2 py-1 rounded-md font-medium ${
                          app === 'Claude Code' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'
                        }`}>{app}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTicket.payload.prepSteps && (
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase mb-2">Prep Steps</p>
                    <ol className="space-y-2">
                      {selectedTicket.payload.prepSteps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="w-5 h-5 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                          <span className="text-slate-600">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
                  Due: {selectedTicket.due_date}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center">
                <p className="text-slate-400 text-sm">Select a ticket to view details</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
