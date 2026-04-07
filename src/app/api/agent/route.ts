import { NextRequest, NextResponse } from 'next/server'
import { processOnboardingTurn } from '@/lib/agents/assistantRuntime'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { messages, employeeId, sessionId, collectedPreferences, onboardingThreadId, itThreadId } = await req.json()

    const result = await processOnboardingTurn({
      messages,
      employeeId,
      sessionId,
      collectedPreferences: collectedPreferences ?? {},
      onboardingThreadId,
      itThreadId,
    })

    await supabaseAdmin
      .from('onboarding_sessions')
      .update({
        conversation: messages.concat({ role: 'assistant', content: result.reply }),
        preferences: {
          ...(collectedPreferences ?? {}),
          onboardingThreadId: result.onboardingThreadId,
          itThreadId: result.itThreadId,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Assistant runtime error:', error)
    return NextResponse.json({ error: 'Agent error' }, { status: 500 })
  }
}
