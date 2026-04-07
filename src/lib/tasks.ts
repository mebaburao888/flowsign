import { supabaseAdmin } from './supabase'

export interface OnboardingTask {
  id: string
  employee_id: string
  task_type: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'blocked' | 'done'
  owner: string
  priority: number
  metadata?: Record<string, unknown>
}

export async function getPendingTasks(employeeId: string): Promise<OnboardingTask[]> {
  const { data, error } = await supabaseAdmin
    .from('onboarding_tasks')
    .select('*')
    .eq('employee_id', employeeId)
    .in('status', ['pending', 'in_progress', 'blocked'])
    .order('priority', { ascending: true })

  if (error) throw error
  return (data ?? []) as OnboardingTask[]
}

export async function updateTaskStatus(taskId: string, status: OnboardingTask['status'], metadata?: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (metadata) payload.metadata = metadata

  const { error } = await supabaseAdmin
    .from('onboarding_tasks')
    .update(payload)
    .eq('id', taskId)

  if (error) throw error
}

export async function getActiveTask(employeeId: string): Promise<OnboardingTask | null> {
  const tasks = await getPendingTasks(employeeId)
  return tasks[0] ?? null
}
