import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { isRbacEnabled, loadUser } from '@shared/utils/requests';
import { UnauthorizedError } from '@shared/domain/errors';

export async function auth(req: Request, res: Response, next: NextFunction) {
  await init(req);
  const session = req.auth!;
  const cookies = session.cookies!;
  const user = session.user;

  // Get groupId from cookie
  if (user) {
    if (cookies?.groupId) {
      const groupId = parseInt(decodeURIComponent(cookies.groupId.trim()));
      const belongsToGroup = user.groups?.some(g => g.id === groupId);
      if (belongsToGroup) {
        session.groupId = groupId;
      }
    } else if (user.groups && user.groups.length > 0) {
      session.groupId = user.groups[0].id;
    }
  }

  return next();
}

async function init(req: Request): Promise<void> {
  if (!isRbacEnabled(req)) {
    // Si RBAC está deshabilitado, intentar cargar un usuario al azar, pero si no hay usuarios, continuar sin usuario
    try {
      return await loadUser(req, "random");
    } catch {
      // Si no hay usuarios disponibles, continuar sin usuario
      return;
    }
  }
  // Buscamos el token
  const token = req.auth?.token;
  if (!token) throw new UnauthorizedError('No token provided');

  // Support for user-id: bypass token
  if (process.env.NODE_ENV !== 'production' && token.startsWith('user-id:')) {
    const userId = token.split('user-id:')[1];
    return loadUser(req, userId);
  }

  // Si es un token normal, lo decodificamos para obtener el ID de usuario.
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET environment variable is not set');
    const { userId } = jwt.verify(token, jwtSecret) as { userId?: string };
    return loadUser(req, userId);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw error;
  }
}
