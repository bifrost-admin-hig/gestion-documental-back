import { ValidationError } from '@shared/domain/errors';

const PNG_DATA_URL_PREFIX = 'data:image/png;base64,';
const PNG_MAGIC_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Decodifica y valida una imagen de firma dibujada en canvas, enviada como data URL PNG.
 * Rechaza cualquier cosa que no sea un PNG real dentro del tope de tamaño permitido —
 * este dato llega también desde endpoints públicos (firma externa), sin autenticación.
 */
export function decodeSignatureImage(dataUrl: string, maxBytes = 300 * 1024): Buffer {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith(PNG_DATA_URL_PREFIX)) {
    throw new ValidationError('La imagen de la firma debe ser un PNG válido');
  }

  const base64 = dataUrl.slice(PNG_DATA_URL_PREFIX.length);
  const buffer = Buffer.from(base64, 'base64');

  if (buffer.length === 0 || !buffer.subarray(0, PNG_MAGIC_BYTES.length).equals(PNG_MAGIC_BYTES)) {
    throw new ValidationError('La imagen de la firma debe ser un PNG válido');
  }

  if (buffer.length > maxBytes) {
    throw new ValidationError('La imagen de la firma es demasiado grande');
  }

  return buffer;
}
