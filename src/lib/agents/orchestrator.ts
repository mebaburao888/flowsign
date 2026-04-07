// ─────────────────────────────────────
// Orchestrator Agent
// Coordinates Alex, Approval, and Ticket agents
// ─────────────────────────────────────

import { supabaseAdmin } from '../supabase'
import { FakeHRISAdapter } from '../adapters/hris/fake'
import { FakeDeviceAdapter } from '../adapters/device/fake'
import { FakeTicketingAdapter } from '../adapters/ticketing/fake'
import { ResendEmailAdapter } from '../adapters/email/resend'
import { Employee, DeviceRequest } from '../adapters/types'

const hris = new FakeHRISAdapter()
const devices = new FakeDeviceAdapter()
const ticketing = new FakeTicketingAdapter()
const email = new ResendEmailAdapter()

// ─────────────────────────────────────
// Initialize onboarding session
// ─────────────────────────────────────
export async function initSession(employeeId: string) {
  const employee = await hris.getEmployee(employeeId)
  const standardConfig = await devices.getStandardConfig(employee.team, employee.role)
  const stockStatus = await devices.checkStock(standardConfig.deviceModel)
  const nonStandardStock = await devices.checkStock('MacBook Pro 16" M3 Max')

  const { data: existing } = await supabaseAdmin
    .from('onboarding_sessions')
    .select('*')
    .eq('employee_id', employeeId)
    .single()

  if (existing) {
    return { employee, standardConfig, stockStatus: nonStandardStock, session: existing }
  }

  const { data: session } = await supabaseAdmin
    .from('onboarding_sessions')
    .insert({
      employee_id: employeeId,
      status: 'in_progress',
      conversation: [],
      preferences: {},
    })
    .select()
    .single()

  // Send welcome email
  try { await email.sendWelcome(employee) } catch (e) { console.error('Welcome email failed', e) }

  return { employee, standardConfig, stockStatus: nonStandardStock, session }
}

// ─────────────────────────────────────
// Submit standard device request
// Auto-approved, fires SNow INC ticket
// ─────────────────────────────────────
export async function submitStandardRequest(
  employeeId: string,
  sessionId: string,
  preferences: DeviceRequest['preferences'],
  standardConfig: { deviceModel: string; deviceSpec: Record<string, string>; standardApps: string[] }
) {
  const employee = await hris.getEmployee(employeeId)

  const { data: request } = await supabaseAdmin
    .from('device_requests')
    .insert({
      employee_id: employeeId,
      session_id: sessionId,
      request_type: 'standard',
      device_spec: {
        model: standardConfig.deviceModel,
        ...standardConfig.deviceSpec,
        standardApps: standardConfig.standardApps,
      },
      preferences,
      status: 'approved',
      in_stock: true,
    })
    .select()
    .single()

  const req = mapRequest(request)
  const ticketNumber = await ticketing.createDeviceTicket(req, employee)

  await supabaseAdmin
    .from('device_requests')
    .update({ snow_device_ticket: ticketNumber, updated_at: new Date().toISOString() })
    .eq('id', request.id)

  await supabaseAdmin
    .from('onboarding_sessions')
    .update({ status: 'complete', updated_at: new Date().toISOString() })
    .eq('id', sessionId)

  try { await email.sendConfirmation(employee, req, ticketNumber) } catch (e) { console.error('Confirmation email failed', e) }

  return { request: req, ticketNumber }
}

// ─────────────────────────────────────
// Submit exception request
// Fires REQ ticket, notifies manager + IT simultaneously
// ─────────────────────────────────────
export async function submitExceptionRequest(
  employeeId: string,
  sessionId: string,
  preferences: DeviceRequest['preferences'],
  justification: string,
  exceptionDevice: string
) {
  const employee = await hris.getEmployee(employeeId)
  const manager = await hris.getManager(employeeId)
  const stockStatus = await devices.checkStock(exceptionDevice)

  const { data: itAdmin } = await supabaseAdmin
    .from('employees')
    .select('*')
    .eq('role', 'IT Admin')
    .single()

  const { data: request } = await supabaseAdmin
    .from('device_requests')
    .insert({
      employee_id: employeeId,
      session_id: sessionId,
      request_type: 'exception',
      device_spec: {
        model: exceptionDevice,
        ram: '36GB',
        storage: '1TB SSD',
        chip: 'M3 Max',
        screen: '16 inch',
      },
      preferences,
      justification,
      status: 'pending',
      in_stock: stockStatus.inStock,
      procurement_days: stockStatus.procurementDays,
      manager_id: manager.id,
    })
    .select()
    .single()

  const req = mapRequest(request)
  const itAdminEmployee: Employee = {
    id: itAdmin.id,
    name: itAdmin.name,
    email: itAdmin.email,
    role: itAdmin.role,
    team: itAdmin.team,
    department: itAdmin.department,
    startDate: itAdmin.start_date,
    location: itAdmin.location,
    status: itAdmin.status,
  }

  const exceptionTicket = await ticketing.createExceptionTicket(req, employee, manager)

  await supabaseAdmin
    .from('device_requests')
    .update({ snow_exception_ticket: exceptionTicket, updated_at: new Date().toISOString() })
    .eq('id', request.id)

  try {
    await email.sendApprovalRequest(manager, itAdminEmployee, req, employee)
  } catch (e) { console.error('Approval email failed', e) }

  return { request: req, exceptionTicket }
}

// ─────────────────────────────────────
// Approve exception (manager or IT)
// When both approve → fire INC ticket
// ─────────────────────────────────────
export async function approveException(
  requestId: string,
  approverId: string,
  approverRole: 'manager' | 'it_admin'
) {
  const now = new Date().toISOString()
  const updateField = approverRole === 'manager'
    ? { manager_approval: now }
    : { it_admin_approval: now, it_admin_id: approverId }

  await supabaseAdmin
    .from('device_requests')
    .update({ ...updateField, updated_at: now })
    .eq('id', requestId)

  const { data: request } = await supabaseAdmin
    .from('device_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  // Both approved → fire INC ticket
  if (request.manager_approval && request.it_admin_approval) {
    const employee = await hris.getEmployee(request.employee_id)
    const req = mapRequest(request)
    const ticketNumber = await ticketing.createDeviceTicket(req, employee)

    await supabaseAdmin
      .from('device_requests')
      .update({
        status: 'procurement',
        snow_device_ticket: ticketNumber,
        updated_at: now,
      })
      .eq('id', requestId)

    await supabaseAdmin
      .from('snow_tickets')
      .update({ status: 'resolved', updated_at: now })
      .eq('ticket_number', request.snow_exception_ticket)

    try { await email.sendApproved(employee, { ...req, snowDeviceTicket: ticketNumber }) } catch (e) { console.error('Approved email failed', e) }

    return { status: 'fully_approved', ticketNumber }
  }

  return { status: approverRole === 'manager' ? 'manager_approved' : 'it_approved' }
}

// ─────────────────────────────────────
// Deny exception
// ─────────────────────────────────────
export async function denyException(requestId: string, reason: string) {
  await supabaseAdmin
    .from('device_requests')
    .update({ status: 'denied', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  const { data: request } = await supabaseAdmin
    .from('device_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  const employee = await hris.getEmployee(request.employee_id)
  try { await email.sendDenied(employee, reason) } catch (e) { console.error('Denied email failed', e) }
}

function mapRequest(data: Record<string, unknown>): DeviceRequest {
  return {
    id: data.id as string,
    employeeId: data.employee_id as string,
    sessionId: data.session_id as string,
    requestType: data.request_type as 'standard' | 'exception',
    deviceSpec: data.device_spec as DeviceRequest['deviceSpec'],
    preferences: data.preferences as DeviceRequest['preferences'],
    justification: data.justification as string | undefined,
    status: data.status as DeviceRequest['status'],
    inStock: data.in_stock as boolean,
    procurementDays: data.procurement_days as number | undefined,
    snowExceptionTicket: data.snow_exception_ticket as string | undefined,
    snowDeviceTicket: data.snow_device_ticket as string | undefined,
    createdAt: data.created_at as string,
  }
}
