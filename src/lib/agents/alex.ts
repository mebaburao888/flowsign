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
    return `Hi ${firstName} — I’ve got your onboarding checklist ready. You’re joining as a ${context.employee.role} on ${context.employee.team}, starting ${context.employee.startDate}. First up is your laptop setup: your standard option is a ${device}. Does that look right, or do you need something different?`
  }

  if (lastUserMessage.includes('16') || lastUserMessage.includes('m3 max') || lastUserMessage.includes('max')) {
    return `Got it — the MacBook Pro 16” M3 Max is a non-standard option for your role. It’s currently out of stock and would add about ${context.stockStatus.procurementDays ?? 7} days through procurement, which could put your start date at risk. If you want, I can file an exception request for manager and IT approval, or we can stick with the standard ${device}.`
  }

  if (lastUserMessage.includes('hard requirement') || lastUserMessage.includes('need it') || lastUserMessage.includes('i insist')) {
    return `Understood. I’ll file this as an exception request so your manager can review it first and IT can take it from there right after. [EXCEPTION_REQUESTED]`
  }

  if (lastUserMessage.includes('looks right') || lastUserMessage.includes('yes') || lastUserMessage.includes('standard') || lastUserMessage.includes('works')) {
    return `Perfect — I’ll keep you on the standard ${device}. I’ll note your preferences and submit this so IT can start prepping your machine. [READY_TO_SUBMIT]`
  }

  return `Sounds good. I’ve got that noted. If you want, you can stick with the standard ${device} and I’ll submit it, or I can open an exception request for the 16” model.`
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

PHASE 1 — CHECKLIST + CONFIRM:
Open with a short onboarding checklist frame, then confirm the employee details. Keep it brief and light.

PHASE 2 — STANDARD LOADOUT:
Present the standard laptop choice simply, not as a long hardware dump. Then ask preference questions ONE AT A TIME:
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
- If they insist: tell them this requires approval from their manager first and then IT review
- If they switch to standard: proceed normally

PHASE 3 — SUMMARY & SUBMIT:
Summarize everything back clearly. Confirm they're happy. Tell them what happens next.

RULES:
- Never ask for info that's already in the system
- Never use bullet point lists in your messages — speak naturally
- Do not repeat “welcome aboard” or repeat the same stock/out-of-stock line every turn
- Keep messages concise — max 2-3 short sentences per turn unless summarizing
- Be warm but efficient — this should feel like a great first impression
- When the conversation is complete and ready to submit, end your message with exactly: [READY_TO_SUBMIT]
- When the user confirms a non-standard exception, end your message with: [EXCEPTION_REQUESTED]
- When the user confirms standard after being offered it, or confirms standard from the start: proceed normally`
}
