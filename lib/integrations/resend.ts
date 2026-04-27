import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  orgId: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, orgId, replyTo }: SendEmailParams) {
  // Physical address + unsubscribe link appended to every email (CAN-SPAM)
  const complianceFooter = `
<br><br><hr>
<p style="font-size:11px;color:#888;">
  You're receiving this email because you match our ideal customer profile.<br>
  <a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(to)}&org=${orgId}">
    Unsubscribe
  </a>
  &nbsp;|&nbsp;
  123 Main Street, Suite 100, Boston MA 02101
</p>
`;

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    replyTo: replyTo ?? process.env.RESEND_FROM_EMAIL,
    subject,
    html: html + complianceFooter,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);

  return { id: data!.id, messageId: data!.id };
}
