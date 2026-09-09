import { LandingSettingsRepository } from "../repositories/landing-settings.repository";
import { EmailQueueService } from "@shared/infrastructure/email/email-queue.service";
import { ValidationError } from "@shared/domain/errors";
import { buildPrimactaEmailShell } from "@shared/infrastructure/email/templates/primacta-notification-email.template";

export interface SubmitLandingContactInput {
  nombre: string;
  apellido: string;
  correo: string;
  cargo: string;
  empresa: string;
  telefono: string;
  mensaje: string;
}

const FIELD_LABELS: Record<keyof SubmitLandingContactInput, string> = {
  nombre: "Nombre",
  apellido: "Apellido",
  correo: "Correo",
  cargo: "Cargo",
  empresa: "Empresa",
  telefono: "Teléfono",
  mensaje: "Mensaje",
};

export class SubmitLandingContactUseCase {
  constructor(
    private readonly landingSettingsRepository: LandingSettingsRepository,
    private readonly emailQueueService: EmailQueueService,
  ) {}

  public async execute(input: SubmitLandingContactInput): Promise<void> {
    const settings = await this.landingSettingsRepository.getOrCreate();
    const recipients = settings.recipientEmails();

    if (recipients.length === 0) {
      throw new ValidationError("No hay correos de destino configurados para el formulario de contacto");
    }

    const title = "Nuevo mensaje desde el formulario de contacto";
    const rows = (Object.keys(FIELD_LABELS) as (keyof SubmitLandingContactInput)[])
      .map((key) => `<tr><td style="padding:8px 12px;font-weight:bold;color:#0F1117;border-bottom:1px solid #E5E7EB;">${FIELD_LABELS[key]}</td><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;">${escapeHtml(input[key])}</td></tr>`)
      .join("");

    const bodyHtml = `
      <h2 style="color:#0F1117;margin-top:0;font-size:20px;">${title}</h2>
      <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">${rows}</table>
    `;

    await this.emailQueueService.enqueue({
      to: recipients,
      subject: `Nuevo contacto desde Primacta – ${input.empresa}`,
      html: buildPrimactaEmailShell({ title, bodyHtml }),
      text: (Object.keys(FIELD_LABELS) as (keyof SubmitLandingContactInput)[])
        .map((key) => `${FIELD_LABELS[key]}: ${input[key]}`)
        .join("\n"),
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
