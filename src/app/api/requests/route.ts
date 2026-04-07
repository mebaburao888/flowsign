import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  submitStandardRequest,
  submitExceptionRequest,
  approveException,
  denyException,
} from '@/lib/agents/orchestrator'

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    const { userId } = auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
