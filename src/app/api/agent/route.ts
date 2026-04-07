import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { runAlexAgent, AlexContext } from '@/lib/agents/alex'
import { FakeHRISAdapter } from '@/lib/adapters/hris/fake'
import { FakeDeviceAdapter } from '@/lib/adapters/device/fake'
import { supabaseAdmin } from '@/lib/supabase'

const hris = new FakeHRISAdapter()
const devices = new FakeDeviceAdapter()

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messages, employeeId, sessionId, phase, collectedPreferences } = await req.json()

    const employee = await hris.getEmployee(employeeId)
    const standardConfig = await devices.getStandardConfig(employee.team, employee.role)
    const stockStatus = await devices.checkStock('MacBook Pro 16" M3 Max')

    const context: AlexContext = {
      employee,
      standardConfig,
      stockStatus,
      phase: phase ?? 'confirm',
      collectedPreferences: collectedPreferences ?? {},
    }

    const reply = await runAlexAgent(messages, context)

    // Save conversation to session
    await supabaseAdmin
      .from('onboarding_sessions')
      .update({
        conversation: messages.concat({ role: 'assistant', content: reply }),
        preferences: collectedPreferences ?? {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Alex agent error:', error)
    return NextResponse.json({ error: 'Agent error' }, { status: 500 })
  }
}
