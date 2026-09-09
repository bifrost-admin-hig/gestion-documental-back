import { Response } from 'express';

export class DomainError extends Error {
  readonly name: string;
  constructor(
    message: string,
    readonly status: number = 400,
    readonly code: string = 'DOMAIN_ERROR',
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  response(res: Response, data?: Record<string, unknown>) {
    const { message, code, status } = this;
    return res.status(status).json({
      message, // Also include message at top level for backward compatibility
      error: { message, code, ...data },
      success: false,
    });
  }
}

export class ValidationError extends DomainError {
  constructor(
    message: string,
    readonly details?: string | Record<string, unknown> | Array<Record<string, unknown>>,
  ) {
    if (typeof details === 'string') {
      details = { field: details };
    }
    super(message, 400, 'VALIDATION_ERROR');
  }

  response(res: Response, data?: Record<string, unknown>) {
    const { details } = this;
    return super.response(res, { details, ...data });
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id?: string) {
    const message = `${resource}${id ? ` with id ${id}` : ''} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message?: string) {
    message = message ? `Unauthorized: ${message}` : 'Unauthorized access';
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends DomainError {
  constructor(message?: string) {
    message = message ? `Forbidden: ${message}` : 'Forbidden access';
    super(message, 403, 'FORBIDDEN');
  }
}

export class RouteError extends DomainError {
  constructor(readonly path: string) {
    const message = `Route ${path} not found`;
    super(message, 400, 'ROUTE_NOT_FOUND');
  }

  response(res: Response, data?: Record<string, unknown>): Response<any, Record<string, any>> {
    return super.response(res, { path: this.path, ...data });
  }
}

export class ServerError extends DomainError {
  constructor(message?: string) {
    message = message ? `Server error: ${message}` : 'Internal server error';
    super(message, 500, 'SERVER_ERROR');
  }
}
