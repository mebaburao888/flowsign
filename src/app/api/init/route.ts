import { NextRequest, NextResponse } from 'next/server'
import { initSession } from '@/lib/agents/orchestrator'

export async function POST(req: NextRequest) {
  try {
    const { employeeId } = await req.json()
    const result = await initSession(employeeId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Init error:', error)
    return NextResponse.json({ error: 'Init failed' }, { status: 500 })
  }
}
