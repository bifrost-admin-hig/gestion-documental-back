import { createHmac, randomInt, timingSafeEqual } from 'crypto';

export interface SignatureTokenData {
  documentId: string;
  userId: string;
  signedAt: Date;
  ipAddress: string;
}

export class SignatureCryptoService {
  private readonly secret: string;

  constructor() {
    const secret = process.env.SIGNATURE_SECRET;
    if (!secret) {
      throw new Error('El servicio de firma electrónica no está disponible en este momento.');
    }
    this.secret = secret;
  }

  /**
   * Genera un código OTP de 6 dígitos criptográficamente seguro.
   */
  generateOtpCode(): string {
    return String(randomInt(0, 999999)).padStart(6, '0');
  }

  /**
   * Hashea el código OTP usando HMAC-SHA256 con el ID de la firma como contexto.
   * Evita ataques de rainbow table sobre códigos de 6 dígitos.
   */
  hashCode(code: string, signatureId: string): string {
    return createHmac('sha256', `${this.secret}:${signatureId}`)
      .update(code)
      .digest('hex');
  }

  /**
   * Verifica un código OTP contra su hash almacenado usando comparación en tiempo constante.
   */
  verifyCode(code: string, storedHash: string, signatureId: string): boolean {
    const computedHash = this.hashCode(code, signatureId);
    try {
      return timingSafeEqual(
        Buffer.from(computedHash, 'hex'),
        Buffer.from(storedHash, 'hex'),
      );
    } catch {
      return false;
    }
  }

  /**
   * Genera el token hash final de la firma (HMAC-SHA256) vinculando
   * el documento, el usuario, el momento exacto y la IP del firmante.
   */
  generateTokenHash(data: SignatureTokenData): string {
    const payload = `${data.documentId}:${data.userId}:${data.signedAt.getTime()}:${data.ipAddress}`;
    return createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');
  }
}
