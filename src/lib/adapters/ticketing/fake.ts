// ─────────────────────────────────────
// Fake Ticketing Adapter (ServiceNow)
// Replace with real SNow REST API adapter
// ─────────────────────────────────────

import { TicketingAdapter, DeviceRequest, Employee } from '../types'
import { supabaseAdmin } from '../../supabase'
import { format, addDays } from 'date-fns'

function generateTicketNumber(prefix: string): string {
  return `${prefix}-${String(Math.floor(Math.random() * 90000) + 10000)}`
}

export class FakeTicketingAdapter implements TicketingAdapter {
  async createExceptionTicket(
    request: DeviceRequest,
    employee: Employee,
    manager: Employee
  ): Promise<string> {
    const ticketNumber = generateTicketNumber('REQ')
    const dueDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')

    const payload = {
      title: `Non-Standard Device Exception Request`,
      requestor: { name: employee.name, role: employee.role, team: employee.team },
      startDate: employee.startDate,
      requestedDevice: request.deviceSpec.model,
      standardDevice: 'MacBook Pro 14" M3 Pro',
      justification: request.justification,
      riskFlags: [
        'Item not in stock',
        `Procurement adds ${request.procurementDays} days`,
        `Start date: ${employee.startDate} — delivery at risk`,
      ],
      approvals: [
        { name: manager.name, role: 'Hiring Manager', status: 'PENDING' },
        { name: 'Priya Rajan', role: 'IT Admin', status: 'PENDING — awaiting manager' },
      ],
    }

    await supabaseAdmin.from('snow_tickets').insert({
      ticket_number: ticketNumber,
      ticket_type: 'exception',
      device_request_id: request.id,
      employee_id: employee.id,
      status: 'open',
      priority: 'P1',
      payload,
      due_date: dueDate,
    })

    return ticketNumber
  }

  async createDeviceTicket(
    request: DeviceRequest,
    employee: Employee
  ): Promise<string> {
    const ticketNumber = generateTicketNumber('INC')
    const startDate = new Date(employee.startDate)
    const dueDate = format(addDays(startDate, -3), 'yyyy-MM-dd')
    const isException = request.requestType === 'exception'

    const appsToInstall = [
      ...(request.deviceSpec as { standardApps?: string[] }).standardApps ?? [],
      ...(request.preferences.additionalApps ?? []),
      ...(request.preferences.ide ? [request.preferences.ide] : []),
      ...(request.preferences.terminal ? [request.preferences.terminal] : []),
      ...(request.preferences.claudeCode ? ['Claude Code'] : []),
    ]

    const prepSteps = isException
      ? [
          'Confirm device receipt from procurement',
          'Enroll in MDM (Jamf) — Engineering-NonStandard policy',
          'Run software deployment profile per app list below',
          'Verify all apps installed and Okta SSO active',
          'Run checklist sign-off',
          'Package and ship — label auto-generated',
        ]
      : [
          'Pull device from shelf — serial auto-assigned',
          'Enroll in MDM (Jamf) — Engineering-Standard policy',
          'Run software deployment profile per app list below',
          'Verify Okta SSO activation',
          'Run checklist sign-off',
          'Package and hand to shipping — label auto-generated',
        ]

    const payload = {
      title: `New Hire Device Prep${isException ? ' [PROCUREMENT REQUIRED]' : ''}`,
      employee: {
        name: employee.name,
        role: employee.role,
        team: employee.team,
        startDate: employee.startDate,
        location: employee.location,
      },
      device: {
        ...request.deviceSpec,
      },
      delivery: request.preferences.deliveryMethod === 'ship_home' ? 'Ship to home address' : 'Office pickup',
      appsToInstall,
      preferences: request.preferences,
      prepSteps,
      ...(isException ? {
        procurementSteps: [
          `Raise PO — ${request.deviceSpec.model}`,
          'Confirm expedited shipping with vendor',
          'Update employee on revised delivery estimate',
        ],
        parentTicket: request.snowExceptionTicket,
      } : {}),
    }

    const { data: ticket } = await supabaseAdmin.from('snow_tickets').insert({
      ticket_number: ticketNumber,
      ticket_type: 'device_prep',
      device_request_id: request.id,
      employee_id: employee.id,
      status: 'open',
      priority: isException ? 'P1' : 'P2',
      payload,
      assigned_to: 'IT Ops',
      due_date: dueDate,
    }).select().single()

    if (isException && request.snowExceptionTicket) {
      const { data: parentTicket } = await supabaseAdmin
        .from('snow_tickets')
        .select('id')
        .eq('ticket_number', request.snowExceptionTicket)
        .single()

      if (parentTicket && ticket) {
        await supabaseAdmin
          .from('snow_tickets')
          .update({ parent_ticket_id: parentTicket.id })
          .eq('id', ticket.id)
      }
    }

    return ticketNumber
  }

  async updateTicketStatus(ticketNumber: string, status: string): Promise<void> {
    await supabaseAdmin
      .from('snow_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('ticket_number', ticketNumber)
  }
}

// TODO: ServiceNowAdapter implements TicketingAdapter
// Uses SNow REST API: https://<instance>.service-now.com/api/now/table/
// export class ServiceNowAdapter implements TicketingAdapter { ... }
