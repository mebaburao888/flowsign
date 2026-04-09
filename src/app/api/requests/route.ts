import { NextRequest, NextResponse } from 'next/server'
import {
  submitStandardRequest,
  submitExceptionRequest,
  approveException,
  denyException,
} from '@/lib/agents/orchestrator'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'submit_standard': {
        const result = await submitStandardRequest(
          body.employeeId,
          body.sessionId,
          body.preferences,
          body.standardConfig
        )
        return NextResponse.json(result)
      }

      case 'submit_exception': {
        const result = await submitExceptionRequest(
          body.employeeId,
          body.sessionId,
          body.preferences,
          body.justification,
          body.exceptionDevice
        )
        return NextResponse.json(result)
      }

      case 'approve': {
        const result = await approveException(
          body.requestId,
          body.approverId,
          body.approverRole
        )
        return NextResponse.json(result)
      }

      case 'deny': {
        await denyException(body.requestId, body.reason)
        return NextResponse.json({ success: true })
      }

      case 'reset_session': {
        const { supabaseAdmin } = await import('@/lib/supabase')
        // Clear conversation, thread IDs, and status
        await supabaseAdmin
          .from('onboarding_sessions')
          .update({
            conversation: [],
            preferences: {},
            onboarding_thread_id: null,
            it_thread_id: null,
            status: 'in_progress',
            updated_at: new Date().toISOString(),
          })
          .eq('employee_id', body.employeeId)
        // Delete ALL device requests for this employee (full reset)
        await supabaseAdmin
          .from('device_requests')
          .delete()
          .eq('employee_id', body.employeeId)
        // Clear signed documents so doc signing resets too
        await supabaseAdmin
          .from('signed_documents')
          .delete()
          .eq('employee_id', body.employeeId)
        // Delete ALL tasks and re-seed fresh (eliminates duplicates)
        await supabaseAdmin
          .from('onboarding_tasks')
          .delete()
          .eq('employee_id', body.employeeId)
        // Re-seed 4 clean tasks
        await supabaseAdmin
          .from('onboarding_tasks')
          .insert([
            { employee_id: body.employeeId, task_type: 'doc_signing',   title: 'Sign NDA',                      description: 'Review and sign your confidentiality agreement', status: 'pending', owner: 'employee', priority: 1 },
            { employee_id: body.employeeId, task_type: 'device_setup',  title: 'Laptop setup',                  description: 'Choose your laptop setup and delivery preferences', status: 'pending', owner: 'employee', priority: 2 },
            { employee_id: body.employeeId, task_type: 'payroll_setup', title: 'Payroll & benefits enrollment', description: 'Complete your payroll and benefits enrollment',        status: 'pending', owner: 'employee', priority: 3 },
            { employee_id: body.employeeId, task_type: 'orientation',   title: 'Orientation & calendar setup', description: 'Book your orientation sessions and calendar events',  status: 'pending', owner: 'employee', priority: 4 },
          ])
        return NextResponse.json({ success: true })
      }

      case 'reset_laptop': {
        const { supabaseAdmin } = await import('@/lib/supabase')
        const now = new Date().toISOString()

        await supabaseAdmin
          .from('onboarding_sessions')
          .update({
            conversation: [],
            preferences: {},
            onboarding_thread_id: null,
            it_thread_id: null,
            status: 'in_progress',
            updated_at: now,
          })
          .eq('employee_id', body.employeeId)

        await supabaseAdmin
          .from('device_requests')
          .delete()
          .eq('employee_id', body.employeeId)
          .in('status', ['pending', 'approved', 'denied', 'procurement'])

        await supabaseAdmin
          .from('onboarding_tasks')
          .update({ status: 'pending', metadata: null, updated_at: now })
          .eq('employee_id', body.employeeId)
          .eq('task_type', 'device_setup')

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Request API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase')
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')

    if (type === 'pending_exceptions') {
      const { data } = await supabaseAdmin
        .from('device_requests')
        .select('*, employee:employee_id(*)')
        .eq('request_type', 'exception')
        .in('status', ['pending', 'procurement'])
        .order('created_at', { ascending: false })

      return NextResponse.json({ requests: data })
    }

    if (type === 'snow_tickets') {
      const { data } = await supabaseAdmin
        .from('snow_tickets')
        .select('*')
        .order('created_at', { ascending: false })

      return NextResponse.json({ tickets: data })
    }

    if (type === 'session') {
      const employeeId = searchParams.get('employeeId')
      const { data } = await supabaseAdmin
        .from('onboarding_sessions')
        .select('*')
        .eq('employee_id', employeeId)
        .single()

      return NextResponse.json({ session: data })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
