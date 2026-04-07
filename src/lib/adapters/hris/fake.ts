// ─────────────────────────────────────
// Fake HRIS Adapter
// Replace with Workday REST API adapter
// ─────────────────────────────────────

import { HRISAdapter, Employee } from '../types'
import { supabaseAdmin } from '../../supabase'

export class FakeHRISAdapter implements HRISAdapter {
  async getEmployee(id: string): Promise<Employee> {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*, manager:manager_id(name, email)')
      .eq('id', id)
      .single()

    if (error || !data) throw new Error(`Employee not found: ${id}`)
    return this.mapEmployee(data)
  }

  async getEmployeeByClerkId(clerkUserId: string): Promise<Employee> {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*, manager:manager_id(name, email)')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (error || !data) throw new Error(`Employee not found for clerk user: ${clerkUserId}`)
    return this.mapEmployee(data)
  }

  async getManager(employeeId: string): Promise<Employee> {
    const employee = await this.getEmployee(employeeId)
    if (!employee.managerId) throw new Error('No manager assigned')
    return this.getEmployee(employee.managerId)
  }

  private mapEmployee(data: Record<string, unknown>): Employee {
    const manager = data.manager as { name: string; email: string } | null
    return {
      id: data.id as string,
      name: data.name as string,
      email: data.email as string,
      role: data.role as string,
      team: data.team as string,
      department: data.department as string,
      managerId: data.manager_id as string | undefined,
      managerName: manager?.name,
      managerEmail: manager?.email,
      startDate: data.start_date as string,
      location: data.location as string,
      status: data.status as string,
    }
  }
}

// TODO: WorkdayHRISAdapter implements HRISAdapter
// import { WorkdayClient } from '@workday/api'
// export class WorkdayHRISAdapter implements HRISAdapter { ... }
