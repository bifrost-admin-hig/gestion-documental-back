import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { DateUtils } from '@shared/utils/date';
import { ValidationError } from '@shared/domain/errors';

export const validateRequest = (schema: ObjectSchema, convert?: boolean) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      convert,
      context: { today: DateUtils.todayString() },
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new ValidationError('Validation failed', details);
    }

    req.body = value;
    next();
  };
};

export const asyncHandler = <R = unknown>(fn: (req: Request, res: Response, next: NextFunction) => R) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
