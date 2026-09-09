interface PrimactaNotificationEmailParams {
  title: string;
  recipientName?: string | null;
  message: string;
  code?: string;
  actionLabel?: string;
  actionUrl?: string;
  warningMessage?: string;
}

const BRAND = {
  dark: '#0F1117',
  orange: '#E8620A',
  orangeLight: '#F5844A',
  gray: '#6B7280',
  light: '#F9FAFB',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHeader(): string {
  const logoUrl = buildFrontendUrl('/assets/logo/Logo-Color.png');
  return `
    <tr>
      <td style="background-color:${BRAND.dark};padding:28px 40px;text-align:center;">
        ${logoUrl ? `<img src="${logoUrl}" width="23" height="32" alt="" style="vertical-align:middle;display:inline-block;margin-right:10px;" />` : ""}
        <span style="font-family:'Krona One',Arial,sans-serif;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;vertical-align:middle;">PRIMACTA</span>
      </td>
    </tr>`;
}

function renderFooter(year: number): string {
  return `
    <tr>
      <td style="background-color:${BRAND.light};text-align:center;padding:20px 40px;font-size:12px;color:${BRAND.gray};">
        &copy; ${year} Primacta &nbsp;&middot;&nbsp; Este es un correo automatico, por favor no respondas a este mensaje.
      </td>
    </tr>`;
}

/**
 * Envuelve contenido HTML arbitrario en el mismo encabezado/pie de marca que
 * usa buildPrimactaNotificationEmail, para correos con estructura propia (p.ej. tablas).
 */
export function buildPrimactaEmailShell(params: { title: string; bodyHtml: string }): string {
  const year = new Date().getFullYear();
  const safeTitle = escapeHtml(params.title);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} - Primacta</title>
  <!--[if !mso]><!-->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Krona+One&display=swap" rel="stylesheet" type="text/css" />
  <!--<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BRAND.light};font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.light};padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          ${renderHeader()}
          <tr>
            <td style="padding:36px 40px;color:#333333;line-height:1.7;">
              ${params.bodyHtml}
            </td>
          </tr>
          ${renderFooter(year)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildPrimactaNotificationEmail(params: PrimactaNotificationEmailParams): string {
  const safeTitle = escapeHtml(params.title);
  const safeMessage = escapeHtml(params.message);
  const safeRecipient = params.recipientName ? escapeHtml(params.recipientName) : null;
  const safeCode = params.code ? escapeHtml(params.code) : null;
  const safeActionLabel = params.actionLabel ? escapeHtml(params.actionLabel) : null;
  const safeActionUrl = params.actionUrl ? escapeHtml(params.actionUrl) : null;
  const safeWarning = params.warningMessage ? escapeHtml(params.warningMessage) : null;

  const bodyHtml = `
    <h2 style="color:${BRAND.dark};margin-top:0;font-size:20px;">${safeTitle}</h2>
    ${safeRecipient ? `<p style="margin:0 0 16px;">Hola, <strong>${safeRecipient}</strong></p>` : ""}
    <p style="margin:0 0 20px;">${safeMessage}</p>

    ${safeCode ? `
      <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
        <tr>
          <td align="center" style="background-color:${BRAND.light};border-radius:8px;padding:16px 24px;">
            <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:${BRAND.orange};">${safeCode}</span>
          </td>
        </tr>
      </table>
    ` : ""}

    ${safeActionUrl && safeActionLabel ? `
      <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="border-radius:6px;background-color:${BRAND.orange};">
            <a href="${safeActionUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;border-radius:6px;letter-spacing:0.5px;">
              ${safeActionLabel}
            </a>
          </td>
        </tr>
      </table>

      <table cellpadding="0" cellspacing="0" style="background-color:${BRAND.light};border-left:4px solid ${BRAND.orange};border-radius:4px;margin:0 0 20px;width:100%;">
        <tr>
          <td style="padding:14px 20px;">
            <p style="margin:0 0 6px;font-size:13px;color:${BRAND.gray};">Si el boton no funciona, copia y pega este enlace en tu navegador:</p>
            <p style="margin:0;font-size:12px;word-break:break-all;">
              <a href="${safeActionUrl}" style="color:${BRAND.orange};">${safeActionUrl}</a>
            </p>
          </td>
        </tr>
      </table>
    ` : ""}

    ${safeWarning ? `
      <table cellpadding="0" cellspacing="0" style="background-color:#fff4ec;border-left:4px solid ${BRAND.orangeLight};border-radius:4px;margin:0 0 20px;width:100%;">
        <tr>
          <td style="padding:12px 20px;font-size:14px;color:${BRAND.gray};">
            ${safeWarning}
          </td>
        </tr>
      </table>
    ` : ""}

    <p style="margin:24px 0 0;">Saludos cordiales,<br /><strong style="color:${BRAND.dark};">Equipo Primacta</strong></p>
  `;

  return buildPrimactaEmailShell({ title: params.title, bodyHtml });
}

export function buildFrontendUrl(path: string): string | undefined {
  const baseUrl = (process.env.FRONTEND_URL ?? "").trim().replace(/\/$/, "");
  if (!baseUrl) return undefined;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
