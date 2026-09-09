import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../domain/errors';

export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    details?: unknown;
    timestamp: string;
    path: string;
  };
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const timestamp = new Date().toISOString();

  if (process.env.LOG_ERRORS !== 'false') {
    console.error(`[${timestamp}] ${error.name || 'Error'}: ${error.message}`, {
      stack: error.stack,
      path: req.originalUrl,
      method: req.method,
    });
  }

  if (error instanceof DomainError) {
    error.response(res, { timestamp });
  } else {
    res.status(500).json({
      error: {
        message: error.message || 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp,
        path: req.originalUrl,
      },
    });
  }
};
