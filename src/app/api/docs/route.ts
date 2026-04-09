import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getDocuments, DOC_QA_SYSTEM_PROMPT, REQUIRED_DOC_IDS } from '@/lib/documents'
import { FakeHRISAdapter } from '@/lib/adapters/hris/fake'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim()
const hris = new FakeHRISAdapter()

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')
  if (!employeeId) return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 })

  const employee = await hris.getEmployee(employeeId)
  const docs = getDocuments(employee)

  // Return which docs are already signed
  const { data: signed } = await supabaseAdmin
    .from('signed_documents')
    .select('doc_id')
    .eq('employee_id', employeeId)
  const signedIds = (signed ?? []).map((r: { doc_id: string }) => r.doc_id)

  return NextResponse.json({ docs, signedIds })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  // Sign a document
  if (action === 'sign') {
    const { employeeId, docId, sessionId } = body

    const { data: existing } = await supabaseAdmin
      .from('signed_documents')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('doc_id', docId)
      .single()

    if (!existing) {
      await supabaseAdmin.from('signed_documents').insert({
        employee_id: employeeId,
        session_id: sessionId,
        doc_id: docId,
        signed_at: new Date().toISOString(),
      })
    }

    // Check if all required docs are signed
    const { data: allSigned } = await supabaseAdmin
      .from('signed_documents')
      .select('doc_id')
      .eq('employee_id', employeeId)

    const signedIds = Array.from(new Set([...(allSigned ?? []).map((r: { doc_id: string }) => r.doc_id), docId]))
    const allComplete = REQUIRED_DOC_IDS.every(id => signedIds.includes(id))

    if (allComplete) {
      // Mark doc_signing task as done
      await supabaseAdmin
        .from('onboarding_tasks')
        .update({ status: 'done', updated_at: new Date().toISOString() })
        .eq('employee_id', employeeId)
        .eq('task_type', 'doc_signing')

      // Notify manager
      try {
        const employee = await hris.getEmployee(employeeId)
        const manager = await hris.getManager(employeeId)
        const { ResendEmailAdapter } = await import('@/lib/adapters/email/resend')
        const email = new ResendEmailAdapter()
        await email.sendStepComplete(manager, employee, 'Document Signing', 1)
      } catch (e) {
        console.error('Step complete email failed', e)
      }
    }

    return NextResponse.json({ success: true, allComplete, signedIds })
  }

  // Doc Q&A via OpenAI
  if (action === 'ask') {
    const { question, docTitle, docBody, history } = body

    if (!OPENAI_API_KEY) {
      return NextResponse.json({
        answer: "I'm here to help explain your documents. Could you try rephrasing your question?",
      })
    }

    const messages = [
      { role: 'system', content: DOC_QA_SYSTEM_PROMPT },
      { role: 'user', content: `The employee is currently reviewing: ${docTitle}\n\nDocument content:\n${docBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000)}` },
      ...(history ?? []),
      { role: 'user', content: question },
    ]

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 200,
        messages,
      }),
    })

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    const answer = data.choices?.[0]?.message?.content?.trim() ?? 'I had trouble with that — could you rephrase?'
    return NextResponse.json({ answer })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
