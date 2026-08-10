import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * メール送信ユーティリティ関数
 */
export async function sendNoticeEmail({ to, subject, html }) {
  if (!resend) {
    console.warn('RESEND_API_KEY is not configured in environment variables. Email sending skipped.');
    return { success: false, message: 'RESEND_API_KEY未設定のため送信スキップ' };
  }

  try {
    const data = await resend.emails.send({
      from: 'デジタル安全宣言 <onboarding@resend.dev>',
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
    return { success: false, error };
  }
}

/**
 * 未提出者アラート通知関数
 */
export async function sendUnsubmittedAlert({ adminEmail, unsubmittedCount, date }) {
  return sendNoticeEmail({
    to: adminEmail,
    subject: `【安全宣言アラート】${date} 未提出者が${unsubmittedCount}名います`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
        <h2 style="color: #c62828;">出庫前安全誓約書 未提出通知</h2>
        <p>本日（${date}）の出庫前安全誓約書が未提出のドライバーが <strong>${unsubmittedCount}名</strong> います。</p>
        <p>確認および運行指導を行ってください。</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 0.85rem; color: #777;">※このメールはデジタル安全誓約書システムから自動送信されています。</p>
      </div>
    `,
  });
}
