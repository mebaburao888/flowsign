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
      id: 'offer_letter',
      title: 'Offer Letter',
      subtitle: 'Doc 1 of 2',
      body: `
        <div style="font-family: 'Georgia', serif; line-height: 1.8; color: #1e293b;">
          <p style="color: #64748b; font-size: 13px;">${today}</p>
          <br/>
          <p>Dear ${employee.name},</p>
          <p>We are delighted to extend this offer of employment to you at <strong>FlowSign Inc.</strong> We believe your skills and experience will be an excellent addition to our team.</p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 6px 0; color: #64748b; width: 180px;">Position</td><td style="font-weight: 600;">${employee.role}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Team</td><td style="font-weight: 600;">${employee.team}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Start Date</td><td style="font-weight: 600;">${employee.startDate}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Location</td><td style="font-weight: 600;">${employee.location}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Reports To</td><td style="font-weight: 600;">${employee.managerName ?? 'Your Manager'}</td></tr>
              <tr><td style="padding: 6px 0; color: #64748b;">Employment Type</td><td style="font-weight: 600;">Full-Time, At-Will</td></tr>
            </table>
          </div>

          <p><strong>Compensation &amp; Benefits</strong><br/>
          Your compensation package details, including salary and equity, are outlined in your separate compensation letter and are subject to the terms described therein. FlowSign offers a comprehensive benefits package including health, dental, vision, 401(k) with company match, and flexible PTO.</p>

          <p><strong>Conditions of Employment</strong><br/>
          This offer is contingent upon successful completion of a background check, execution of FlowSign's Confidential Information and Invention Assignment Agreement (CIIAA), and your first day of employment. You will be required to provide proof of eligibility to work in the United States.</p>

          <p><strong>At-Will Employment</strong><br/>
          Your employment with FlowSign is at-will, meaning either you or FlowSign may terminate the employment relationship at any time, with or without cause or advance notice.</p>

          <p><strong>Entire Agreement</strong><br/>
          This offer letter, together with the CIIAA, constitutes the entire agreement between you and FlowSign with respect to the subject matter hereof and supersedes all prior and contemporaneous understandings.</p>

          <p>We are thrilled to have you join us. Please sign below to indicate your acceptance of this offer.</p>

          <p style="margin-top: 32px;">Sincerely,<br/>
          <strong>People Operations</strong><br/>
          FlowSign Inc.</p>
        </div>
      `,
    },
    {
      id: 'nda',
      title: 'Non-Disclosure & Confidentiality Agreement',
      subtitle: 'Doc 2 of 2',
      body: `
        <div style="font-family: 'Georgia', serif; line-height: 1.8; color: #1e293b;">
          <p style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Confidential Information and Invention Assignment Agreement</p>
          <br/>
          <p>This Confidential Information and Invention Assignment Agreement (<strong>"Agreement"</strong>) is entered into as of ${today} between <strong>FlowSign Inc.</strong> ("Company") and <strong>${employee.name}</strong> ("Employee").</p>

          <p><strong>1. Confidential Information</strong><br/>
          Employee agrees to keep confidential and not to disclose, use, copy, publish, summarize, or remove from Company premises any Confidential Information, except as required for the performance of Employee's duties for the Company. "Confidential Information" includes all non-public information relating to the Company's business, technology, customers, employees, finances, and strategic plans.</p>

          <p><strong>2. Invention Assignment</strong><br/>
          Employee agrees that all inventions, developments, improvements, and discoveries conceived, made, or reduced to practice during employment that relate to the Company's current or planned business are the sole property of the Company. Employee hereby assigns all right, title, and interest in such inventions to the Company.</p>

          <p><strong>3. Non-Solicitation</strong><br/>
          During employment and for a period of 12 months thereafter, Employee agrees not to solicit Company employees, contractors, or customers for any competitive purpose.</p>

          <p><strong>4. Return of Property</strong><br/>
          Upon termination of employment, Employee agrees to promptly return all Company property, including all documents, equipment, and materials containing Confidential Information.</p>

          <p><strong>5. Prior Obligations</strong><br/>
          Employee represents that they are not subject to any prior agreements that would conflict with this Agreement or the performance of their duties at FlowSign.</p>

          <p><strong>6. Governing Law</strong><br/>
          This Agreement shall be governed by the laws of the State of Delaware, without regard to its conflict of laws provisions.</p>

          <p><strong>7. Entire Agreement</strong><br/>
          This Agreement constitutes the entire agreement between the parties with respect to confidentiality and invention assignment, and supersedes all prior discussions and agreements.</p>

          <p style="margin-top: 32px;">By signing below, Employee acknowledges reading, understanding, and agreeing to the terms of this Agreement.</p>
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
