// ─────────────────────────────────────
// FlowSign — Adapter Interfaces
// Swap fake implementations for real ones
// without touching agent logic
// ─────────────────────────────────────

export interface Employee {
  id: string
  name: string
  email: string
  role: string
  team: string
  department: string
  managerId?: string
  managerName?: string
  managerEmail?: string
  startDate: string
  location: string
  status: string
}

export interface DeviceStandard {
  deviceModel: string
  deviceSpec: {
    ram: string
    storage: string
    chip: string
    screen: string
  }
  standardApps: string[]
}

export interface DeviceRequest {
  id: string
  employeeId: string
  sessionId: string
  requestType: 'standard' | 'exception'
  deviceSpec: DeviceStandard['deviceSpec'] & { model: string }
  preferences: {
    ide?: string
    terminal?: string
    claudeCode?: boolean
    peripherals?: string[]
    additionalApps?: string[]
    deliveryMethod?: 'ship_home' | 'office_pickup'
  }
  justification?: string
  status: 'pending' | 'approved' | 'denied' | 'procurement'
  inStock: boolean
  procurementDays?: number
  snowExceptionTicket?: string
  snowDeviceTicket?: string
  createdAt: string
}

export interface SnowTicket {
  id: string
  ticketNumber: string
  ticketType: 'exception' | 'device_prep'
  parentTicketId?: string
  deviceRequestId: string
  employeeId: string
  status: 'open' | 'in_progress' | 'resolved'
  priority: string
  payload: Record<string, unknown>
  assignedTo?: string
  dueDate: string
  createdAt: string
}

// ─────────────────────────────────────
// HRIS Adapter
// ─────────────────────────────────────
export interface HRISAdapter {
  getEmployee(id: string): Promise<Employee>
  getEmployeeByClerkId(clerkUserId: string): Promise<Employee>
  getManager(employeeId: string): Promise<Employee>
}

// ─────────────────────────────────────
// Device Adapter
// ─────────────────────────────────────
export interface DeviceAdapter {
  getStandardConfig(team: string, role: string): Promise<DeviceStandard>
  checkStock(model: string): Promise<{ inStock: boolean; procurementDays?: number }>
}

// ─────────────────────────────────────
// Ticketing Adapter
// ─────────────────────────────────────
export interface TicketingAdapter {
  createExceptionTicket(request: DeviceRequest, employee: Employee, manager: Employee): Promise<string>
  createDeviceTicket(request: DeviceRequest, employee: Employee): Promise<string>
  updateTicketStatus(ticketNumber: string, status: string): Promise<void>
}

// ─────────────────────────────────────
// Email Adapter
// ─────────────────────────────────────
export interface EmailAdapter {
  sendWelcome(employee: Employee): Promise<void>
  sendApprovalRequest(manager: Employee, itAdmin: Employee, request: DeviceRequest, employee: Employee): Promise<void>
  sendApproved(employee: Employee, request: DeviceRequest): Promise<void>
  sendDenied(employee: Employee, reason: string): Promise<void>
  sendConfirmation(employee: Employee, request: DeviceRequest, ticket: string): Promise<void>
}
