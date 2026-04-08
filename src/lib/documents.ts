// ─────────────────────────────────────
// Fake Document Templates
// Replace with DocuSign / real contract pull
// ─────────────────────────────────────

export interface FlowDoc {
  id: string
  title: string
  subtitle: string
  body: string // HTML content of the doc
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
      subtitle: 'Doc 1 of 2',
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
    {
      id: 'benefits',
      title: 'Benefits & Payroll Acknowledgment',
      subtitle: 'Doc 2 of 2',
      body: `
        <div style="font-family: 'Georgia', serif; line-height: 1.8; color: #1e293b;">
          <p style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Benefits Enrollment & Payroll Authorization</p>
          <br/>
          <p>Dear ${employee.name},</p>
          <p>This document confirms your enrollment in FlowSign's benefits program and authorizes payroll processing effective <strong>${employee.startDate}</strong>.</p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="font-weight: 700; margin: 0 0 12px; color: #1e293b;">Your Benefits Package</p>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #64748b; width: 200px;">Health Insurance</td><td style="font-weight: 600;">Medical, Dental, Vision — Blue Shield PPO</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">401(k)</td><td style="font-weight: 600;">4% company match, vests over 4 years</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">PTO</td><td style="font-weight: 600;">Flexible / Unlimited</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Parental Leave</td><td style="font-weight: 600;">16 weeks fully paid</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Learning Budget</td><td style="font-weight: 600;">$2,000/year for courses and conferences</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Home Office Stipend</td><td style="font-weight: 600;">$500 one-time setup allowance</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Equity</td><td style="font-weight: 600;">As outlined in your separate equity letter</td></tr>
            </table>
          </div>

          <p><strong>Payroll Authorization</strong><br/>
          By signing this document, you authorize FlowSign Inc. to process your compensation on a bi-weekly basis via direct deposit to your designated bank account. Tax withholdings will follow your W-4 elections submitted separately to Payroll.</p>

          <p><strong>Benefits Enrollment Window</strong><br/>
          You have 30 days from your start date (${employee.startDate}) to complete benefits enrollment in the HR portal. Elections made during this window take effect on your first day. Outside this window, changes are only permitted during the annual Open Enrollment period.</p>

          <p><strong>Acknowledgment</strong><br/>
          By signing, you confirm that you have reviewed and understood your benefits package, authorize payroll processing, and agree to complete benefits enrollment within 30 days of your start date.</p>

          <p style="margin-top: 32px;"><strong>People Operations</strong><br/>FlowSign Inc.</p>
        </div>
      `,
    },
  ]
}

// Q&A rules for the doc signing agent
export const DOC_QA_SYSTEM_PROMPT = `You are Alex, an onboarding guide helping a new hire understand their employment documents.

RULES:
- Answer questions about the document clearly and in plain English.
- Keep answers concise — 2-3 sentences max.
- If asked about salary, compensation amounts, equity specifics, or pay negotiation: say "Compensation details are outlined in your separate compensation letter. If you have questions, reach out to your HR contact directly." Do NOT discuss or reveal any numbers.
- If asked about legal advice: say "I can help explain what the document says, but for legal advice please consult your own attorney."
- Do not make up information not in the document.
- Be warm and reassuring — signing docs on Day 0 can feel intimidating.
- If the question is unrelated to the documents, gently redirect: "I'm here to help with your onboarding docs — feel free to ask anything about them."
`

// All doc IDs that must be signed for doc_signing step to be complete
export const REQUIRED_DOC_IDS = ['nda', 'benefits']
