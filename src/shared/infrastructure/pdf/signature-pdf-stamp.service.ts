import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { Bucket } from '@shared/utils/Bucket';
import { ServerError } from '@shared/domain/errors';

export interface StampTarget {
  storage: 'local' | 's3';
  /** Local filesystem path (relative to FILE_STORAGE_LOCAL_PATH) or S3 object key. */
  path: string;
}

export interface SignatureStampData {
  signerName: string;
  signerDocumentNumber: string;
  signerEmail: string;
  signedAt: Date;
  /** PNG de la firma dibujada por el firmante. Si no viene, el estampado se hace sin ella. */
  signatureImageBytes?: Buffer;
  ipAddress: string;
  documentId: string;
  tokenHash: string;
  verifyUrl: string;
}

export interface SignerStampData {
  signerName: string;
  signerDocumentNumber: string;
  signerEmail: string;
  signedAt: Date;
  /** PNG de la firma dibujada por el firmante. Si no viene, el estampado se hace sin ella. */
  signatureImageBytes?: Buffer;
  ipAddress: string;
  tokenHash: string;
}

export interface ConsolidatedStampData {
  documentId: string;
  completedAt: Date;
  verifyUrl: string;
  signers: SignerStampData[];
}

/**
 * Zona horaria usada para mostrar la fecha/hora en el estampado de firma.
 * La plataforma por ahora opera con una única zona horaria global (Chile continental);
 * la zona horaria real del firmante se captura y persiste aparte (Signature.signerTimezone /
 * ExternalParticipantToken.timezone) solo con fines de trazabilidad, no para el estampado.
 */
const DEFAULT_STAMP_TIMEZONE = 'America/Santiago';

export class SignaturePdfStampService {
  /** Devuelve los bytes del PDF ya estampado — no escribe nada, eso lo decide quien llama. */
  async stampPdf(target: StampTarget, data: SignatureStampData): Promise<Buffer> {
    const pdfBytes = await this.readBytes(target);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const qrBuffer: Buffer = await QRCode.toBuffer(data.verifyUrl, {
      errorCorrectionLevel: 'M',
      width: 200,
      margin: 1,
    });

    const qrImage = await pdfDoc.embedPng(qrBuffer);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pages = pdfDoc.getPages();
    const { width } = pages[pages.length - 1].getSize();

    const MARGIN = 20;
    const STAMP_H = 174;
    const PADDING = 8;
    const QR_SIZE = 78;
    const SIG_W = 130;
    const SIG_H = 55;
    const RIGHT_COL_W = Math.max(QR_SIZE, SIG_W);

    // Add a dedicated new page for the signature stamp so it never overlaps
    // existing content (e.g. page numbers on the last page).
    const stampPageHeight = STAMP_H + MARGIN * 4;
    const stampPage = pdfDoc.addPage([width, stampPageHeight]);

    const stampX = MARGIN;
    const stampY = MARGIN * 2;
    const stampW = width - MARGIN * 2;
    const textW = stampW - RIGHT_COL_W - PADDING * 3;

    // Simple bordered container for the signature proof block.
    stampPage.drawRectangle({
      x: stampX,
      y: stampY,
      width: stampW,
      height: STAMP_H,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.55, 0.55, 0.55),
      borderWidth: 0.6,
    });

    stampPage.drawText('Firmado electrónicamente por:', {
      x: stampX + PADDING,
      y: stampY + STAMP_H - 14,
      size: 9,
      font: boldFont,
      color: rgb(0.08, 0.08, 0.08),
    });

    const formattedDate = this.formatSignedAt(data.signedAt);

    const textLines = [
      `Nombre: ${data.signerName}`,
      `Cédula de Identidad: ${data.signerDocumentNumber}`,
      `Email: ${data.signerEmail}`,
      `Fecha: ${formattedDate}`,
      `IP: ${data.ipAddress}`,
      `ID del documento: ${data.documentId}`,
      `Token: ${data.tokenHash}`,
    ];

    const LINE_H = 11;
    const textStartY = stampY + STAMP_H - 28;

    for (let i = 0; i < textLines.length; i++) {
      stampPage.drawText(textLines[i], {
        x: stampX + PADDING,
        y: textStartY - i * LINE_H,
        size: 7.5,
        font,
        color: rgb(0.1, 0.1, 0.15),
        maxWidth: textW,
      });
    }

    stampPage.drawText('Escanee el QR para verificar la validez de este documento.', {
      x: stampX + PADDING,
      y: stampY + 10,
      size: 7,
      font,
      color: rgb(0.32, 0.32, 0.32),
      maxWidth: textW,
    });

    // QR code aligned to the right, similar to the provided reference.
    const qrX = stampX + stampW - QR_SIZE - PADDING;
    const qrY = stampY + 10;
    stampPage.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: QR_SIZE,
      height: QR_SIZE,
    });

    // Firma dibujada por el firmante, arriba del QR en la misma columna derecha.
    await this.drawSignatureImage(pdfDoc, stampPage, data.signatureImageBytes, {
      x: stampX + stampW - SIG_W - PADDING,
      y: stampY + STAMP_H - PADDING - SIG_H,
      width: SIG_W,
      height: SIG_H,
    });

    return Buffer.from(await pdfDoc.save());
  }

  /** Dibuja la imagen de la firma centrada dentro de un recuadro con borde, preservando su proporción. */
  private async drawSignatureImage(
    pdfDoc: PDFDocument,
    page: PDFPage,
    imageBytes: Buffer | undefined,
    box: { x: number; y: number; width: number; height: number },
  ): Promise<void> {
    page.drawRectangle({
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.75, 0.75, 0.75),
      borderWidth: 0.5,
    });

    if (!imageBytes) return;

    try {
      const image = await pdfDoc.embedPng(imageBytes);
      const scale = Math.min(box.width / image.width, box.height / image.height, 1);
      const drawW = image.width * scale;
      const drawH = image.height * scale;
      page.drawImage(image, {
        x: box.x + (box.width - drawW) / 2,
        y: box.y + (box.height - drawH) / 2,
        width: drawW,
        height: drawH,
      });
    } catch (err) {
      console.warn('[SignaturePdfStampService] No se pudo embeber la imagen de la firma (no crítico):', err);
    }
  }

  /**
   * Formatea la fecha/hora de firma en la zona horaria fija de la plataforma
   * (DEFAULT_STAMP_TIMEZONE) en vez de la zona horaria del servidor.
   */
  private formatSignedAt(date: Date, timezone: string = DEFAULT_STAMP_TIMEZONE): string {
    const tz = timezone || DEFAULT_STAMP_TIMEZONE;

    let day = '--';
    let month = '--';
    let year = '----';
    let hours = '--';
    let minutes = '--';

    try {
      const parts = new Intl.DateTimeFormat('es-CL', {
        timeZone: tz,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(date);

      const get = (type: string) => parts.find((p) => p.type === type)?.value;
      day = get('day') ?? day;
      month = get('month') ?? month;
      year = get('year') ?? year;
      hours = get('hour') ?? hours;
      minutes = get('minute') ?? minutes;
    } catch {
      // Zona horaria inválida — se mantiene el respaldo "--" y se sigue con GMT+0 abajo.
    }

    let tzLabel = 'GMT+0';
    try {
      const offsetParts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'shortOffset',
      }).formatToParts(date);
      tzLabel = offsetParts.find((p) => p.type === 'timeZoneName')?.value ?? tzLabel;
    } catch {
      // Zona horaria inválida — se mantiene "GMT+0".
    }

    return `${day}/${month}/${year} a las ${hours}:${minutes} - TZ: ${tzLabel}`;
  }

  /** Devuelve los bytes del PDF consolidado ya estampado — no escribe nada, eso lo decide quien llama. */
  async stampConsolidatedPdf(target: StampTarget, data: ConsolidatedStampData): Promise<Buffer> {
    const pdfBytes = await this.readBytes(target);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Single QR for the whole document
    const qrBuffer: Buffer = await QRCode.toBuffer(data.verifyUrl || 'N/A', {
      errorCorrectionLevel: 'M',
      width: 200,
      margin: 1,
    });
    const qrImage = await pdfDoc.embedPng(qrBuffer);

    const pages = pdfDoc.getPages();
    const { width: docWidth } = pages[pages.length - 1].getSize();

    const MARGIN = 20;
    const PADDING = 8;
    const QR_SIZE = 70;
    const HEADER_H = QR_SIZE + 20; // tall enough to fit the QR with vertical padding
    const SIGNER_ROW_H = 60; // per signer (rect + gap below), no QR needed
    const ROW_SIG_W = 80;
    const ROW_SIG_H = 36;

    const pageHeight = MARGIN * 2
      + HEADER_H
      + 14 + data.signers.length * SIGNER_ROW_H
      + 21; // footer

    const stampPage = pdfDoc.addPage([docWidth, pageHeight]);

    stampPage.drawRectangle({
      x: 0, y: 0,
      width: docWidth, height: pageHeight,
      color: rgb(0.98, 0.98, 0.98),
    });

    const contentX = MARGIN;
    const contentW = docWidth - MARGIN * 2;
    // Header text stays left of the QR
    const headerTextW = contentW - QR_SIZE - PADDING * 2;

    // ── QR: top-right corner, drawn independently ──
    const qrX = contentX + contentW - QR_SIZE;
    const qrY = pageHeight - MARGIN - QR_SIZE;
    stampPage.drawImage(qrImage, { x: qrX, y: qrY, width: QR_SIZE, height: QR_SIZE });

    // y cursor descends from top
    let y = pageHeight - MARGIN;

    // ── HEADER ──
    y -= 9;
    stampPage.drawText('FIRMADO ELECTRÓNICAMENTE', {
      x: contentX, y, size: 9, font: boldFont, color: rgb(0.08, 0.08, 0.08),
    });
    y -= 5;

    stampPage.drawLine({
      start: { x: contentX, y }, end: { x: contentX + headerTextW, y },
      thickness: 0.6, color: rgb(0.7, 0.7, 0.7),
    });
    y -= 7;

    stampPage.drawText(`ID del documento: ${data.documentId}`, {
      x: contentX, y, size: 7, font, color: rgb(0.35, 0.35, 0.35), maxWidth: headerTextW,
    });
    y -= 11;

    stampPage.drawText(`Completado el: ${this.formatSignedAt(data.completedAt)}`, {
      x: contentX, y, size: 7, font, color: rgb(0.35, 0.35, 0.35), maxWidth: headerTextW,
    });
    y -= 11;

    stampPage.drawText('Escanee el QR para verificar la autenticidad de este documento.', {
      x: contentX, y, size: 6.5, font, color: rgb(0.45, 0.45, 0.45), maxWidth: headerTextW,
    });

    // Advance y past the full header section (including QR height)
    y = pageHeight - MARGIN - HEADER_H;

    // ── SIGNERS (compact rows, no individual QR) ──
    stampPage.drawText('FIRMANTES', {
      x: contentX, y, size: 8, font: boldFont, color: rgb(0.2, 0.2, 0.2),
    });
    y -= 14;

    const rowTextW = contentW - PADDING * 3 - ROW_SIG_W;

    for (const signer of data.signers) {
      const rectBottom = y - (SIGNER_ROW_H - PADDING);
      stampPage.drawRectangle({
        x: contentX, y: rectBottom,
        width: contentW, height: SIGNER_ROW_H - PADDING,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.75, 0.75, 0.75),
        borderWidth: 0.5,
      });

      // Firma dibujada por el firmante, a la derecha de la fila.
      await this.drawSignatureImage(pdfDoc, stampPage, signer.signatureImageBytes, {
        x: contentX + contentW - PADDING - ROW_SIG_W,
        y: rectBottom + (SIGNER_ROW_H - PADDING - ROW_SIG_H) / 2,
        width: ROW_SIG_W,
        height: ROW_SIG_H,
      });

      let ty = y - PADDING;

      ty -= 9;
      stampPage.drawText(signer.signerName, {
        x: contentX + PADDING, y: ty, size: 9, font: boldFont,
        color: rgb(0.08, 0.08, 0.08), maxWidth: rowTextW,
      });

      ty -= 11;
      stampPage.drawText(`${signer.signerEmail}  |  Cédula de Identidad: ${signer.signerDocumentNumber}`, {
        x: contentX + PADDING, y: ty, size: 7, font,
        color: rgb(0.2, 0.2, 0.2), maxWidth: rowTextW,
      });

      ty -= 10;
      stampPage.drawText(
        `Fecha: ${this.formatSignedAt(signer.signedAt)}  |  IP: ${signer.ipAddress}`,
        { x: contentX + PADDING, y: ty, size: 7, font, color: rgb(0.2, 0.2, 0.2), maxWidth: rowTextW },
      );

      ty -= 10;
      const shortToken = signer.tokenHash.length > 48
        ? `${signer.tokenHash.substring(0, 48)}...`
        : signer.tokenHash;
      stampPage.drawText(`Token: ${shortToken}`, {
        x: contentX + PADDING, y: ty, size: 6.5, font,
        color: rgb(0.45, 0.45, 0.45), maxWidth: rowTextW,
      });

      y -= SIGNER_ROW_H;
    }

    // ── FOOTER ──
    y -= 5;
    stampPage.drawLine({
      start: { x: contentX, y }, end: { x: contentX + contentW, y },
      thickness: 0.4, color: rgb(0.8, 0.8, 0.8),
    });
    y -= 8;

    stampPage.drawText(`Verificar en: ${data.verifyUrl}`, {
      x: contentX, y, size: 6.5, font, color: rgb(0.45, 0.45, 0.45), maxWidth: contentW,
    });

    return Buffer.from(await pdfDoc.save());
  }

  private resolveLocalPath(filePath: string): string {
    if (path.isAbsolute(filePath)) return filePath;
    const uploadDir = process.env.FILE_STORAGE_LOCAL_PATH ?? './uploads';
    const normalized = path.normalize(filePath);
    const normalizedDir = path.normalize(uploadDir);
    if (normalized.startsWith(normalizedDir + path.sep)) return normalized;
    return path.join(uploadDir, filePath);
  }

  private getBucket(): Bucket {
    const bucketName = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_DEFAULT_REGION;
    const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY;

    if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
      throw new ServerError('S3 configuration incomplete');
    }

    return new Bucket({
      bucket: bucketName,
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  private async readBytes(target: StampTarget): Promise<Buffer> {
    if (target.storage === 's3') {
      return this.getBucket().downloadFile({ source: target.path });
    }
    return fs.promises.readFile(this.resolveLocalPath(target.path));
  }
}
