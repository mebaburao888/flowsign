// ─────────────────────────────────────
// Alex Agent — Conversational Onboarding
// ─────────────────────────────────────

import { Employee, DeviceStandard } from '../adapters/types'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim()

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface AlexContext {
  employee: Employee
  standardConfig: DeviceStandard
  stockStatus: { inStock: boolean; procurementDays?: number }
  phase: 'confirm' | 'preferences' | 'exception_check' | 'complete'
  collectedPreferences: {
    ide?: string
    terminal?: string
    claudeCode?: boolean
    deliveryMethod?: string
    requestType?: 'standard' | 'exception'
    exceptionDevice?: string
    justification?: string
    peripherals?: string[]
    additionalApps?: string[]
  }
}

export async function runAlexAgent(
  messages: Message[],
  context: AlexContext
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context)

  try {
    if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.4,
        max_tokens: 500,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI error ${response.status}: ${errorText}`)
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }

    return data.choices?.[0]?.message?.content?.trim() ?? ''
  } catch (error) {
    console.error('OpenAI unavailable, falling back to demo agent:', error)
    return runDemoFallback(messages, context)
  }
}

function runDemoFallback(messages: Message[], context: AlexContext): string {
  const firstName = context.employee.name.split(' ')[0]
  const lastUserMessage = messages.filter(m => m.role === 'user').at(-1)?.content.toLowerCase() ?? ''
  const device = context.standardConfig.deviceModel

  if (messages.length <= 1) {
    return `Hi ${firstName} — welcome to FlowSign. I’ve got you set up as a ${context.employee.role} on ${context.employee.team}, starting ${context.employee.startDate}. Your standard setup is a ${device}; does that all look right, and do you have an IDE preference like VS Code, JetBrains, Vim, or something else?`
  }

  if (lastUserMessage.includes('16') || lastUserMessage.includes('m3 max') || lastUserMessage.includes('max')) {
    return `Got it — the MacBook Pro 16” M3 Max is a non-standard option for your role. It’s currently out of stock and would add about ${context.stockStatus.procurementDays ?? 7} days through procurement, which could put your start date at risk. Is that a hard requirement for your workflow, or would the standard ${device} work?`
  }

  if (lastUserMessage.includes('hard requirement') || lastUserMessage.includes('need it') || lastUserMessage.includes('i insist')) {
    return `Understood. I’ll file this as an exception request and notify both your manager and IT at the same time so they can review it quickly. [EXCEPTION_REQUESTED]`
  }

  if (lastUserMessage.includes('looks right') || lastUserMessage.includes('yes') || lastUserMessage.includes('standard') || lastUserMessage.includes('works')) {
    return `Perfect — I’ll keep you on the standard ${device}. I’ll note your preferences and submit this so IT can start prepping your machine. [READY_TO_SUBMIT]`
  }

  return `Sounds good. I’ve got that noted for your setup. If you’re happy with the standard ${device}, say the word and I’ll submit it; if you want the 16” M3 Max instead, I can start the exception path.`
}

function buildSystemPrompt(context: AlexContext): string {
  const { employee, standardConfig, stockStatus } = context
  const nonStandardDevice = 'MacBook Pro 16" M3 Max'

  return `You are Alex, FlowSign's AI onboarding guide. You are warm, professional, and efficient. You speak conversationally — not like a form wizard. You know what you're doing and guide the new hire naturally.

EMPLOYEE CONTEXT (already in system — do not ask for this):
- Name: ${employee.name}
- Role: ${employee.role}
- Team: ${employee.team}
- Start Date: ${employee.startDate}
- Location: ${employee.location}
- Manager: ${employee.managerName}

STANDARD DEVICE CONFIG FOR THEIR ROLE:
- Device: ${standardConfig.deviceModel}
- Spec: ${JSON.stringify(standardConfig.deviceSpec)}
- Standard Apps: ${standardConfig.standardApps.join(', ')}

STOCK STATUS:
- Standard device (${standardConfig.deviceModel}): IN STOCK ✓
- Non-standard (${nonStandardDevice}): ${stockStatus.inStock ? 'IN STOCK' : `OUT OF STOCK — procurement adds ${stockStatus.procurementDays} days`}

YOUR FLOW:

PHASE 1 — CONFIRM:
Greet ${employee.name.split(' ')[0]} warmly. Surface their details and ask them to confirm. Keep it brief.

PHASE 2 — STANDARD LOADOUT:
Present their standard device config clearly. Then ask preference questions ONE AT A TIME:
1. IDE preference: VS Code, JetBrains, Vim, or other?
2. Terminal: Default, iTerm2, or Warp?
3. Would they like Claude Code pre-installed? (add a subtle 😄)
4. Peripherals? (monitor, keyboard, mouse — keep optional)
5. Delivery: ship to home address or office pickup?

If they ask for the non-standard device (${nonStandardDevice}):
- Acknowledge it
- Explain it's non-standard for their team
- Tell them it's out of stock, procurement adds ${stockStatus.procurementDays} days
- Note the start date risk
- Ask: is this a hard requirement, or would the standard work?
- If they insist: tell them this requires approval from their manager and IT, both will be notified simultaneously
- If they switch to standard: proceed normally

PHASE 3 — SUMMARY & SUBMIT:
Summarize everything back clearly. Confirm they're happy. Tell them what happens next.

RULES:
- Never ask for info that's already in the system
- Never use bullet point lists in your messages — speak naturally
- Keep messages concise — max 3-4 sentences per turn
- Be warm but efficient — this should feel like a great first impression
- When the conversation is complete and ready to submit, end your message with exactly: [READY_TO_SUBMIT]
- When the user confirms a non-standard exception, end your message with: [EXCEPTION_REQUESTED]
- When the user confirms standard after being offered it, or confirms standard from the start: proceed normally`
}
