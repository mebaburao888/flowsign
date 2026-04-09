import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const DEFAULT_TASKS = [
  {
    task_type: 'doc_signing',
    title: 'Sign NDA',
    description: 'Review and sign your confidentiality agreement',
    priority: 1,
  },
  {
    task_type: 'device_setup',
    title: 'Laptop setup',
    description: 'Choose your laptop setup and delivery preferences',
    priority: 2,
  },
  {
    task_type: 'payroll_setup',
    title: 'Payroll & benefits enrollment',
    description: 'Complete your payroll and benefits enrollment',
    priority: 3,
  },
  {
    task_type: 'orientation',
    title: 'Orientation & calendar setup',
    description: 'Book your orientation sessions and calendar events',
    priority: 4,
  },
]

type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'done'

async function ensureDefaultTasks(employeeId: string) {
  const { data: existing } = await supabaseAdmin
    .from('onboarding_tasks')
    .select('task_type')
    .eq('employee_id', employeeId)

  const existingTypes = new Set((existing ?? []).map((t: { task_type: string }) => t.task_type))
  const missing = DEFAULT_TASKS.filter(t => !existingTypes.has(t.task_type))
  if (missing.length === 0) return

  await supabaseAdmin
    .from('onboarding_tasks')
    .insert(
      missing.map(task => ({
        employee_id: employeeId,
        task_type: task.task_type,
        title: task.title,
        description: task.description,
        status: 'pending',
        owner: 'employee',
        priority: task.priority,
      }))
    )
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')
  if (!employeeId) return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 })

  await ensureDefaultTasks(employeeId)

  const { data: rawTasks, error } = await supabaseAdmin
    .from('onboarding_tasks')
    .select('*')
    .eq('employee_id', employeeId)
    .order('priority', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Deduplicate by task_type — keep the one with best status (done > in_progress > blocked > pending)
  const statusRank: Record<string, number> = { done: 4, in_progress: 3, blocked: 2, pending: 1 }
  const taskMap = new Map<string, typeof rawTasks[0]>()
  for (const task of (rawTasks ?? [])) {
    const existing = taskMap.get(task.task_type)
    if (!existing || (statusRank[task.status] ?? 0) > (statusRank[existing.status] ?? 0)) {
      taskMap.set(task.task_type, task)
    }
  }
  // Return in canonical order
  const ORDER = ['doc_signing', 'device_setup', 'payroll_setup', 'orientation']
  const tasks = ORDER.map(t => taskMap.get(t)).filter(Boolean)

  const { data: deviceRequest } = await supabaseAdmin
    .from('device_requests')
    .select('id, request_type, status, manager_approval, it_admin_approval, snow_device_ticket, snow_exception_ticket, in_stock, procurement_days, updated_at')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ tasks: tasks ?? [], deviceRequest: deviceRequest ?? null })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { employeeId, taskType, status, metadata } = body as {
      employeeId?: string
      taskType?: string
      status?: TaskStatus
      metadata?: Record<string, unknown> | null
    }

    if (!employeeId || !taskType || !status) {
      return NextResponse.json({ error: 'Missing employeeId, taskType, or status' }, { status: 400 })
    }

    if (!['pending', 'in_progress', 'blocked', 'done'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    await ensureDefaultTasks(employeeId)

    const payload: { status: TaskStatus; updated_at: string; metadata?: Record<string, unknown> | null } = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (metadata !== undefined) {
      payload.metadata = metadata
    }

    const { data, error } = await supabaseAdmin
      .from('onboarding_tasks')
      .update(payload)
      .eq('employee_id', employeeId)
      .eq('task_type', taskType)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, task: data })
  } catch (error) {
    console.error('Task update error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
