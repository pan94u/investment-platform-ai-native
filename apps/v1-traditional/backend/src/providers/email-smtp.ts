import type { EmailProvider, EmailPayload } from './types.js';

/**
 * SMTP 邮件提供者 — 用 nodemailer 发送
 * 配置: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */
export class SmtpEmailProvider implements EmailProvider {
  private transporter: import('nodemailer').Transporter | null = null;

  private async getTransporter() {
    if (this.transporter) return this.transporter;

    const nodemailer = await import('nodemailer');
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return this.transporter;
  }

  async sendEmail(payload: EmailPayload): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to: payload.to.join(', '),
        cc: payload.cc.join(', '),
        subject: payload.subject,
        html: payload.htmlBody,
        attachments: payload.attachments.map((a) => ({
          filename: a.filename,
          path: a.path,
          contentType: a.mimeType,
        })),
      });
      console.log(`[SmtpEmail] 邮件发送成功: ${payload.subject}`);
      return true;
    } catch (err) {
      console.error(`[SmtpEmail] 邮件发送失败:`, err);
      return false;
    }
  }
}
