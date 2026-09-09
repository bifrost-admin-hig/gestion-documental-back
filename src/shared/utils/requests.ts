import { User } from '@domains/user/entities/user.entity';
import { UserRepository } from '@domains/user/repositories/user.repository';
import { UnauthorizedError } from '@shared/domain/errors';
import { TypeOrmUserRepository } from '@shared/infrastructure/repositories/typeorm-user.repository';
import { NextFunction, Request, Response } from 'express';
import { randomElement } from './array';

// Extend the Request type to include the user property
declare module 'express-serve-static-core' {
  interface Request {
    auth: Auth;
  }
}

export interface Auth {
  cookies?: Cookies;
  token?: string;
  user?: User;
  userId?: string;
  permissions?: string[];
  groupId?: number;
  contractId?: string;
}

export type Cookies = Record<string, string>;

function getHeader(headers: Request['headers'] | undefined, headerName: string): string | undefined {
  const value = headers?.[headerName];
  if (Array.isArray(value)) return value.join(',');
  return value?.toLowerCase();
}

function getHeaderToken(headers?: Request['headers']): string | undefined {
  const authHeader = headers?.authorization;
  if (!authHeader || typeof authHeader !== 'string') return undefined;
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return undefined;
}

export const getToken = (req: Request): string | undefined => (
  req.auth?.cookies?.token ?? getHeaderToken(req.headers)
);

/**
 * Se puede habilitar o deshabilitar RBAC con variable de entorno ENABLE_RBAC o con el header x-enable-rbac.
 * - En desarrollo y pruebas, el header tiene prioridad, y puede habilitar/deshabilitar RBAC.
 * - En producción, la variable de entorno tiene prioridad, y el header solo puede habilitar RBAC si está inactiva.
 */
export function isRbacEnabled(req: Request): boolean {
  const enable = getHeader(req.headers, 'x-enable-rbac');
  if (process.env.NODE_ENV === 'production') {
    return process.env.ENABLE_RBAC === 'true' || enable === 'true';
  }
  return enable ? enable === 'true' : process.env.ENABLE_RBAC === 'true';
}

export function parseCookies(req: Request): Cookies {
  const cookieHeader = req.headers.cookie;
  const cookies: Cookies = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return cookies;
  const pairs = cookieHeader.split(';');
  pairs.forEach(pair => {
    const [key, value] = pair.trim().split('=');
    cookies[key] = value;
  });
  return cookies;
}

export function authInit(req: Request, _res: Response, next: NextFunction): void {
  req.auth ??= {};

  req.auth.cookies = parseCookies(req);
  req.auth.token = req.auth?.cookies?.token ?? getHeaderToken(req.headers);
  if (process.env.NODE_ENV !== 'production' && req.auth.token?.startsWith('user-id:')) {
    req.auth.userId = req.auth.token.split('user-id:')[1];
  }

  return next();
}

export async function loadUser(req: Request, id?: string): Promise<void> {
  if (req.auth.userId) {
    id = req.auth.userId;
  }
  if (!id) throw new UnauthorizedError('User not found');

  const userRepository: UserRepository = new TypeOrmUserRepository();
  if (id === "random") {
    const user = await userRepository.findAll().then(randomElement);
    if (!user) throw new UnauthorizedError('No users available');
    req.auth!.user = user;
  } else {
    const user = await userRepository.findById(id);
    if (!user) throw new UnauthorizedError('User not found');
    req.auth!.user = user;
  }
}
