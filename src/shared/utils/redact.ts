const MASK = '******';

/**
 * Reemplaza toda ocurrencia literal de `secret` dentro de `content` por una máscara fija
 * de asteriscos, sin revelar su longitud real. Se usa para censurar códigos de verificación
 * antes de persistir el contenido de un correo/SMS ya enviado, evitando guardar el código
 * en texto plano en la base de datos.
 */
export function redactSecret(content: string | null | undefined, secret: string): string | null {
  if (content === null || content === undefined) return null;
  if (!secret) return content;
  return content.split(secret).join(MASK);
}
