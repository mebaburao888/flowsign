// ─────────────────────────────────────
// Hotmail SMTP Email Adapter
// Uses nodemailer + Hotmail app password
// Set env vars:
//   EMAIL_HOST=smtp.office365.com
//   EMAIL_USER=mebaburao@hotmail.com
//   EMAIL_PASS=<app password>
//   RESEND_TEST_TO=harshitha.neelakanta@metisstrategy.com  (optional override)
// ─────────────────────────────────────

import nodemailer from 'nodemailer'
import { EmailAdapter, Employee, DeviceRequest } from '../types'

const EMAIL_USER = process.env.EMAIL_USER?.trim() ?? 'mebaburao@hotmail.com'
const EMAIL_PASS = process.env.EMAIL_PASS?.trim() ?? ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? 'http://localhost:3000'
const TEST_TO = process.env.RESEND_TEST_TO?.trim() ?? null

const to = (addr: string) => TEST_TO ?? addr
const FROM = `FlowSign <${EMAIL_USER}>`

function createTransport() {
  return nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    tls: { ciphers: 'SSLv3' },
  })
}

async function sendEmail(opts: { to: string; subject: string; html: string }) {
  if (!EMAIL_PASS) {
    console.warn('[HotmailAdapter] EMAIL_PASS missing — skipping email:', opts.subject)
    return
  }
  const transport = createTransport()
  await transport.sendMail({ from: FROM, ...opts })
}

export class HotmailEmailAdapter implements EmailAdapter {
  async sendWelcome(employee: Employee): Promise<void> {
    await sendEmail({
      to: to(employee.email),
      subject: `Welcome to FlowSign, ${employee.name.split(' ')[0]}! Your onboarding is ready.`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: #0c81eb; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to FlowSign</h1>
          </div>
          <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
            <p style="font-size: 16px; color: #1e293b;">Hi ${employee.name.split(' ')[0]},</p>
            <p style="color: #475569;">We're thrilled to have you joining the <strong>${employee.team}</strong> team as a <strong>${employee.role}</strong> on <strong>${employee.startDate}</strong>.</p>
            <p style="color: #475569;">Your onboarding portal is ready. Alex will walk you through everything.</p>
            <a href="${APP_URL}/onboarding" style="display: inline-block; background: #0c81eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
              Start Onboarding →
            </a>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 32px;">This takes about 10 minutes. See you on ${employee.startDate}!</p>
          </div>
        </div>
      `,
    })
  }

  async sendApprovalRequest(manager: Employee, itAdmin: Employee, request: DeviceRequest, employee: Employee): Promise<void> {
    const approvalUrl = `${APP_URL}/hiring-manager?requestId=${request.id}`
    const html = (recipientName: string) => `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: #f59e0b; padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">⚠️ Non-Standard Device Request — Approval Needed</h1>
        </div>
        <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
          <p style="color: #1e293b;">Hi ${recipientName},</p>
          <p style="color: #475569;"><strong>${employee.name}</strong> (${employee.role}) has requested a non-standard device.</p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 8px; font-weight: 600; color: #1e293b;">Requested: ${request.deviceSpec.model}</p>
            <p style="margin: 0; color: #475569;">Justification: ${request.justification}</p>
          </div>
          <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ Out of stock — procurement adds ${request.procurementDays} days.</p>
          </div>
          <a href="${approvalUrl}" style="display: inline-block; background: #0c81eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
            Review &amp; Approve →
          </a>
        </div>
      </div>
    `
    await Promise.all([
      sendEmail({ to: to(manager.email), subject: `Action Required: ${employee.name} — Non-Standard Device Request`, html: html(manager.name.split(' ')[0]) }),
      sendEmail({ to: to(itAdmin.email), subject: `Pending: ${employee.name} — Non-Standard Device (Awaiting Manager Approval)`, html: html(itAdmin.name.split(' ')[0]) }),
    ])
  }

  async sendApproved(employee: Employee, request: DeviceRequest): Promise<void> {
    await sendEmail({
      to: to(employee.email),
      subject: `Your laptop request has been approved ✓`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: #10b981; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">✓ Laptop Request Approved</h1>
          </div>
          <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
            <p style="color: #1e293b;">Hi ${employee.name.split(' ')[0]},</p>
            <p style="color: #475569;">Your non-standard device request has been approved. IT is now actioning procurement.</p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 4px; font-weight: 600;">${request.deviceSpec.model}</p>
              <p style="margin: 0; color: #64748b; font-size: 14px;">Ticket: ${request.snowDeviceTicket}</p>
            </div>
          </div>
        </div>
      `,
    })
  }

  async sendDenied(employee: Employee, reason: string): Promise<void> {
    await sendEmail({
      to: to(employee.email),
      subject: `Update on your laptop request`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <p>Hi ${employee.name.split(' ')[0]},</p>
          <p>${reason}</p>
          <p>Your standard device will be prepared and ready for your start date.</p>
        </div>
      `,
    })
  }

  async sendConfirmation(employee: Employee, request: DeviceRequest, ticket: string): Promise<void> {
    await sendEmail({
      to: to(employee.email),
      subject: `You're all set — your laptop is being prepped 🎉`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: #0c81eb; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">You're all set, ${employee.name.split(' ')[0]}!</h1>
          </div>
          <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
            <p style="color: #475569;">IT is prepping your machine.</p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 8px; font-weight: 600; color: #1e293b;">${request.deviceSpec.model}</p>
              <p style="margin: 0 0 4px; color: #475569;">Delivery: ${request.preferences.deliveryMethod === 'ship_home' ? 'Shipped to your home address' : 'Office pickup'}</p>
              <p style="margin: 0; color: #64748b; font-size: 14px;">Reference: ${ticket}</p>
            </div>
            <p style="color: #475569;">See you on <strong>${employee.startDate}</strong>. We can't wait! 🚀</p>
          </div>
        </div>
      `,
    })
  }

  async sendStepComplete(manager: Employee, employee: Employee, stepName: string, _completedCount: number): Promise<void> {
    await sendEmail({
      to: to(manager.email),
      subject: `${employee.name.split(' ')[0]} completed: ${stepName} ✅`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: #0c81eb; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 18px;">Onboarding Update — ${employee.name}</h1>
          </div>
          <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
            <p style="color: #1e293b;">Hi ${manager.name.split(' ')[0]},</p>
            <p style="color: #475569;"><strong>${employee.name}</strong> completed <strong>${stepName}</strong>.</p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; color: #166534; font-size: 14px;">✅ ${stepName} — complete</p>
            </div>
            <a href="${APP_URL}/hiring-manager" style="display: inline-block; background: #0c81eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">View Manager Dashboard →</a>
          </div>
        </div>
      `,
    })
  }
}
