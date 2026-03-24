import { Resend } from "resend"

type SendEmailInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM

  if (!apiKey || !from) {
    console.warn("[email] Skipped (missing RESEND_API_KEY or RESEND_FROM)")
    return { sent: false }
  }

  const resend = new Resend(apiKey)
  await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })

  return { sent: true }
}
