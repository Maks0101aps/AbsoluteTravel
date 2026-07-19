import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

// Sends transactional email over the Mailtrap sandbox SMTP relay. In dev
// (no MAILTRAP_USER configured) it logs the message instead of throwing, the
// same graceful-fallback pattern AiService uses for a missing GEMINI_API_KEY.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const user = process.env.MAILTRAP_USER;
    const pass = process.env.MAILTRAP_PASS;
    if (!user || !pass) {
      this.logger.warn('MAILTRAP_USER/MAILTRAP_PASS not set — verification emails will only be logged.');
      return;
    }
    this.transporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
      port: parseInt(process.env.MAILTRAP_PORT ?? '587', 10),
      secure: false,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async sendVerificationEmail(to: string, name: string, verifyUrl: string) {
    const subject = 'Підтвердіть вашу пошту — Absolute Travel';
    const html = `
      <div style="font-family: Arial, sans-serif; background:#071F16; color:#F4F1E8; padding:32px;">
        <h1 style="color:#3FA66B; font-size:22px; margin:0 0 16px;">Ласкаво просимо, ${escapeHtml(name)}!</h1>
        <p style="font-size:14px; line-height:1.6;">
          Дякуємо, що приєднались до Absolute Travel. Щоб активувати акаунт, підтвердіть свою електронну пошту,
          натиснувши на кнопку нижче.
        </p>
        <p style="margin:28px 0;">
          <a href="${verifyUrl}" style="background:#3FA66B; color:#071F16; text-decoration:none; font-weight:bold; padding:14px 26px; border-radius:10px; display:inline-block;">
            Підтвердити пошту
          </a>
        </p>
        <p style="font-size:12px; color:rgba(244,241,232,0.6);">
          Якщо кнопка не працює, перейдіть за посиланням: <br/>
          <a href="${verifyUrl}" style="color:#9BD8B4;">${verifyUrl}</a>
        </p>
        <p style="font-size:12px; color:rgba(244,241,232,0.5); margin-top:24px;">
          Якщо ви не реєструвались в Absolute Travel, просто проігноруйте цей лист.<br/>
          — Команда Absolute Travel
        </p>
      </div>`;

    if (!this.transporter) {
      this.logger.log(`[dev] Verification email for ${to}: ${verifyUrl}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: '"Absolute Travel" <no-reply@absolutetravel.app>',
        to,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`Failed to send verification email to ${to}`, err as Error);
    }
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
