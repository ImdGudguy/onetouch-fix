import { Resend } from 'resend';

/**
 * Sends a password-reset OTP. Uses Resend when RESEND_API_KEY is set; otherwise
 * falls back to dev mode (logs the code and returns it so the flow works without
 * an email account). Set RESEND_API_KEY + RESEND_FROM in production.
 */
export async function sendOtpEmail(to: string, code: string): Promise<{ delivered: boolean; devCode?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'IntelliFix <onboarding@resend.dev>';

  if (!key) {
    console.log(`[email:dev] Password reset code for ${to}: ${code}`);
    return { delivered: false, devCode: code };
  }
  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from,
      to,
      subject: 'Your IntelliFix password reset code',
      html: `
        <div style="font-family:Inter,Arial,sans-serif;background:#0a0a12;color:#e2e8f0;padding:32px;border-radius:12px">
          <h2 style="margin:0 0 8px;color:#00e5ff">IntelliFix AI</h2>
          <p style="color:#94a3b8">Use this code to reset your password. It expires in 10 minutes.</p>
          <div style="font-size:32px;font-weight:800;letter-spacing:8px;margin:16px 0;color:#fff">${code}</div>
          <p style="color:#64748b;font-size:12px">If you didn't request this, you can ignore this email.</p>
        </div>`,
    });
    return { delivered: true };
  } catch (e) {
    console.log('[email] send failed, falling back to dev code:', (e as Error)?.message);
    return { delivered: false, devCode: code };
  }
}
