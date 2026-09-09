import nodemailer, { Transporter } from 'nodemailer';
import { EmailOptions, EmailService } from './email-service.interface';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  fromName: string;
}

function loadSmtpConfig(): SmtpConfig | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FROM_EMAIL, FROM_NAME } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD || !FROM_EMAIL) {
    return null;
  }

  const port = parseInt(SMTP_PORT, 10);
  if (isNaN(port)) return null;

  return { host: SMTP_HOST, port, user: SMTP_USER, password: SMTP_PASSWORD, from: FROM_EMAIL, fromName: FROM_NAME ?? '' };
}

export class NodemailerEmailService implements EmailService {
  private readonly transporter: Transporter | null = null;
  private readonly config: SmtpConfig | null;

  constructor() {
    this.config = loadSmtpConfig();

    if (this.config) {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.port === 465,
        auth: {
          user: this.config.user,
          pass: this.config.password,
        },
      });
    } else {
      console.warn('[EmailService] SMTP not configured — email sending is disabled.');
    }
  }

  isReady(): boolean {
    return this.transporter !== null;
  }

  async send(options: EmailOptions): Promise<boolean> {
    if (!this.transporter || !this.config) {
      console.warn('[EmailService] Attempted to send email but service is not configured.');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.config.fromName
          ? `"${this.config.fromName}" <${this.config.from}>`
          : this.config.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      return true;
    } catch (_error) {
      console.warn('[EmailService] Failed to send email', { recipient: Array.isArray(options.to) ? options.to : [options.to] });
      return false;
    }
  }
}
