import { Request, Response, NextFunction } from 'express';
import { isRbacEnabled } from '@shared/utils/requests';
import { ForbiddenError, UnauthorizedError } from '@shared/domain/errors';

export const authorize = (
  required?: string | string[],
) => async (req: Request, _res: Response, next: NextFunction) => {
  if (!isRbacEnabled(req)) return next();
  req.auth = req.auth || {};

  const user = req.auth.user;
  if (!user) throw new UnauthorizedError();

  req.auth.permissions = user.getPermissionNames(true);
  if (!required || user.can(required)) return next();

  throw new ForbiddenError();
};
