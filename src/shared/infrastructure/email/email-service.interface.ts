export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailService {
  /**
   * Sends an email. Returns true if sent successfully.
   * If the email service is not configured, returns false without throwing.
   */
  send(options: EmailOptions): Promise<boolean>;

  /**
   * Whether the email service is properly configured and ready to send.
   */
  isReady(): boolean;
}
