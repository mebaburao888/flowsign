export interface FlowDoc {
  id: string
  title: string
  subtitle: string
  body: string
}

export function getDocuments(employee: {
  name: string
  role: string
  team: string
  startDate: string
  location: string
  managerName?: string
}): FlowDoc[] {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return [
    {
      id: 'nda',
      title: 'Confidentiality & NDA',
      subtitle: 'Required onboarding document',
      body: `
        <div style="font-family: 'Georgia', serif; line-height: 1.8; color: #1e293b;">
          <p style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Confidential Information and Invention Assignment Agreement</p>
          <br/>
          <p>This Agreement is entered into as of ${today} between <strong>FlowSign Inc.</strong> ("Company") and <strong>${employee.name}</strong> ("Employee").</p>

          <p><strong>1. Confidential Information</strong><br/>
          Employee agrees to keep confidential and not to disclose, use, copy, publish, or remove from Company premises any Confidential Information, except as required to perform their duties. "Confidential Information" includes all non-public information relating to the Company's business, technology, customers, employees, finances, and strategic plans.</p>

          <p><strong>2. Invention Assignment</strong><br/>
          All inventions, developments, and discoveries conceived during employment that relate to the Company's business are the sole property of the Company. Employee assigns all rights in such inventions to the Company.</p>

          <p><strong>3. Non-Solicitation</strong><br/>
          During employment and for 12 months thereafter, Employee agrees not to solicit Company employees, contractors, or customers for any competitive purpose.</p>

          <p><strong>4. Return of Property</strong><br/>
          Upon termination, Employee will promptly return all Company property, including documents and equipment containing Confidential Information.</p>

          <p><strong>5. Prior Obligations</strong><br/>
          Employee confirms they are not subject to prior agreements that conflict with this Agreement or their duties at FlowSign.</p>

          <p><strong>6. Governing Law</strong><br/>
          This Agreement is governed by the laws of Delaware, without regard to conflict of law provisions.</p>

          <p style="margin-top: 32px;">By signing, Employee acknowledges reading, understanding, and agreeing to the terms above.</p>
          <p><strong>People Operations</strong><br/>FlowSign Inc.</p>
        </div>
      `,
    },
  ]
}

export const DOC_QA_SYSTEM_PROMPT = `You are Alex, an onboarding guide helping a new hire understand their NDA document.

RULES:
- Answer questions about the document clearly and in plain English.
- Keep answers concise — 2-3 sentences max.
- If asked about salary, compensation amounts, equity specifics, payroll, or benefits: say "Compensation and benefits details are handled separately by HR and payroll. Please contact your HR partner for those details." Do NOT discuss or reveal numbers.
- If asked about legal advice: say "I can help explain what the document says, but for legal advice please consult your own attorney."
- Do not make up information not in the document.
- Be warm and reassuring — signing docs on Day 0 can feel intimidating.
- If the question is unrelated to the NDA, gently redirect: "I'm here to help with your NDA — feel free to ask anything about it."
`

export const REQUIRED_DOC_IDS = ['nda']
