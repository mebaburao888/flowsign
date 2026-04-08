import { initSession, submitExceptionRequest, submitStandardRequest } from './orchestrator'
import { FakeHRISAdapter } from '../adapters/hris/fake'
import { FakeDeviceAdapter } from '../adapters/device/fake'
import { getActiveTask, getPendingTasks, updateTaskStatus } from '../tasks'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim()
const ONBOARDING_ASSISTANT_ID = process.env.OPENAI_ONBOARDING_ASSISTANT_ID?.trim()
const IT_ASSISTANT_ID = process.env.OPENAI_IT_ASSISTANT_ID?.trim()

const hris = new FakeHRISAdapter()
const devices = new FakeDeviceAdapter()

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ThreadResponse { id: string }
interface RunResponse { id: string; status: string }
interface MessageListResponse {
  data: Array<{
    role: 'assistant' | 'user'
    content: Array<{ type: string; text?: { value: string } }>
  }>
}

interface HandoffPayload {
  ready: boolean
  requestType: 'standard' | 'exception'
  employeeId: string
  justification?: string
  exceptionDevice?: string
  preferences?: Record<string, unknown>
}

interface DevicePreferences {
  ide?: string
  terminal?: string
  claudeCode?: boolean
  peripherals?: string[]
  additionalApps?: string[]
  deliveryMethod?: 'ship_home' | 'office_pickup'
}

interface ITDecision {
  requestType: 'standard' | 'exception'
  status: 'approved' | 'pending_approvals'
  summary: string
  employeeMessage: string
  justification?: string
  exceptionDevice?: string
}

async function openai<T>(path: string, init?: RequestInit): Promise<T> {
  if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')

  const res = await fetch(`https://api.openai.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    throw new Error(`OpenAI ${path} failed: ${res.status} ${await res.text()}`)
  }

  return res.json() as Promise<T>
}

async function ensureThread(threadId?: string) {
  if (threadId) return threadId
  const thread = await openai<ThreadResponse>('/threads', { method: 'POST', body: '{}' })
  return thread.id
}

async function addMessage(threadId: string, role: 'user' | 'assistant', content: string) {
  await openai(`/threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ role, content }),
  })
}

async function runAssistant(threadId: string, assistantId: string, instructions?: string) {
  const run = await openai<RunResponse>(`/threads/${threadId}/runs`, {
    method: 'POST',
    body: JSON.stringify({ assistant_id: assistantId, instructions }),
  })

  let status = run.status
  for (let i = 0; i < 60; i++) {
    if (['completed', 'failed', 'cancelled', 'expired'].includes(status)) break
    await new Promise(resolve => setTimeout(resolve, 1000))
    const polled = await openai<RunResponse>(`/threads/${threadId}/runs/${run.id}`)
    status = polled.status
  }

  if (status !== 'completed') {
    throw new Error(`Assistant run ended with status ${status}`)
  }
}

async function getLatestAssistantText(threadId: string) {
  const messages = await openai<MessageListResponse>(`/threads/${threadId}/messages`)
  const assistantMessage = messages.data.find(m => m.role === 'assistant')
  const textPart = assistantMessage?.content.find(c => c.type === 'text')
  return textPart?.text?.value?.trim() ?? ''
}

function extractJsonBlock<T>(text: string, tag: string): T | null {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\/${tag}>`)
  const match = text.match(regex)
  if (!match) return null
  try {
    return JSON.parse(match[1]) as T
  } catch {
    return null
  }
}

export async function initializeAssistantSession(employeeId: string) {
  const init = await initSession(employeeId)
  const { session } = init

  // Reuse existing thread IDs if session already has them (prevents conversation wipe on reload)
  const onboardingThreadId = await ensureThread(session.onboarding_thread_id ?? undefined)
  const itThreadId = await ensureThread(session.it_thread_id ?? undefined)

  // Persist thread IDs back to session if they are new
  if (!session.onboarding_thread_id || !session.it_thread_id) {
    const { supabaseAdmin } = await import('../supabase')
    await supabaseAdmin
      .from('onboarding_sessions')
      .update({
        onboarding_thread_id: onboardingThreadId,
        it_thread_id: itThreadId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)
  }

  return {
    ...init,
    onboardingThreadId,
    itThreadId,
  }
}

export async function processOnboardingTurn(input: {
  employeeId: string
  sessionId: string
  onboardingThreadId?: string
  itThreadId?: string
  messages: ChatMessage[]
  collectedPreferences?: Record<string, unknown>
}) {
  if (!ONBOARDING_ASSISTANT_ID || !IT_ASSISTANT_ID) {
    throw new Error('Missing assistant IDs')
  }

  const employee = await hris.getEmployee(input.employeeId)
  const standardConfig = await devices.getStandardConfig(employee.team, employee.role)
  const stockStatus = await devices.checkStock('MacBook Pro 16" M3 Max')
  const pendingTasks = await getPendingTasks(input.employeeId)
  const activeTask = await getActiveTask(input.employeeId)
  const onboardingThreadId = await ensureThread(input.onboardingThreadId)
  const itThreadId = await ensureThread(input.itThreadId)

  const latestUser = input.messages.filter(m => m.role === 'user').at(-1)?.content ?? 'Start onboarding.'
  const previousTurns = input.messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')

  await addMessage(
    onboardingThreadId,
    'user',
    `Employee context:\n- Name: ${employee.name}\n- Role: ${employee.role}\n- Team: ${employee.team}\n- Start date: ${employee.startDate}\n- Location: ${employee.location}\n- Manager: ${employee.managerName ?? 'Unknown'}\n\nOnboarding tasks:\n${pendingTasks.map((task, index) => `${index + 1}. ${task.title} (${task.task_type}) - ${task.status}${task.description ? `: ${task.description}` : ''}`).join('\n') || 'No pending tasks'}\n\nCurrent active task: ${activeTask?.title ?? 'None'}\n\nDevice context for device_setup only:\n- Standard device: ${standardConfig.deviceModel}\n- Standard apps: ${standardConfig.standardApps.join(', ')}\n- Non-standard stock: ${stockStatus.inStock ? 'in stock' : `out of stock, ${stockStatus.procurementDays} day delay`}\n\nRecent conversation:\n${previousTurns || 'No prior conversation'}\n\nLatest employee message: ${latestUser}\n\nBehavior requirements for this turn:\n- Start from pending onboarding tasks, not from a device spec dump.\n- If the employee is already in the device_setup task, only ask for the single next missing thing.\n- Do not re-ask settled questions.\n- Keep the reply natural and concise.\n- If the employee is ready for IT handoff, include a JSON object inside <handoff></handoff> with keys: ready, requestType, employeeId, justification, exceptionDevice, preferences. If not ready, do not emit handoff tags.`
  )

  await runAssistant(onboardingThreadId, ONBOARDING_ASSISTANT_ID)
  const onboardingReply = await getLatestAssistantText(onboardingThreadId)
  const handoff = extractJsonBlock<HandoffPayload>(onboardingReply, 'handoff')

  if (!handoff?.ready) {
    return {
      reply: onboardingReply.replace(/<handoff>[\s\S]*<\/handoff>/, '').trim(),
      onboardingThreadId,
      itThreadId,
    }
  }

  await addMessage(
    itThreadId,
    'user',
    `Process this onboarding handoff and return only JSON inside <it_result></it_result>.\n${JSON.stringify({
      employeeId: handoff.employeeId,
      requestType: handoff.requestType,
      justification: handoff.justification,
      exceptionDevice: handoff.exceptionDevice,
      preferences: handoff.preferences ?? input.collectedPreferences ?? {},
      standardDevice: standardConfig.deviceModel,
      standardApps: standardConfig.standardApps,
      stockStatus,
    }, null, 2)}\n\nThe JSON must include keys: requestType, status, summary, employeeMessage, justification, exceptionDevice.`
  )

  await runAssistant(itThreadId, IT_ASSISTANT_ID)
  const itReply = await getLatestAssistantText(itThreadId)
  const decision = extractJsonBlock<ITDecision>(itReply, 'it_result')

  if (!decision) {
    throw new Error('IT assistant did not return structured result')
  }

  const preferences = (handoff.preferences ?? input.collectedPreferences ?? {}) as DevicePreferences
  const exceptionDevice = decision.exceptionDevice ?? handoff.exceptionDevice
  const requestedApps = preferences.additionalApps ?? []
  const looksStandard = !exceptionDevice || exceptionDevice.trim().toLowerCase() === standardConfig.deviceModel.trim().toLowerCase()
  const shouldForceStandard = handoff.requestType === 'standard' || (looksStandard && !handoff.justification)

  if (shouldForceStandard) {
    const result = await submitStandardRequest(input.employeeId, input.sessionId, preferences, standardConfig)
    if (activeTask?.task_type === 'device_setup') {
      await updateTaskStatus(activeTask.id, 'done', {
        completedBy: 'onboarding_agent',
        ticketNumber: result.ticketNumber,
      })
    }
    return {
      reply: `Perfect — I’ve passed your standard ${standardConfig.deviceModel} setup to IT${requestedApps.length ? ` with ${requestedApps.join(', ')} added` : ''}.\n\nReference: ${result.ticketNumber}`,
      onboardingThreadId,
      itThreadId,
    }
  }

  const result = await submitExceptionRequest(
    input.employeeId,
    input.sessionId,
    preferences,
    decision.justification ?? handoff.justification ?? 'Needs non-standard setup',
    exceptionDevice ?? 'MacBook Pro 16" M3 Max'
  )

  if (activeTask?.task_type === 'device_setup') {
    await updateTaskStatus(activeTask.id, 'in_progress', {
      escalatedTo: 'it_agent',
      exceptionTicket: result.exceptionTicket,
    })
  }

  return {
    reply: `${decision.employeeMessage}\n\nException ticket: ${result.exceptionTicket}`,
    onboardingThreadId,
    itThreadId,
  }
}
