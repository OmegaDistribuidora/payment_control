export class HttpError extends Error {
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function badRequest(message: string, details?: Record<string, unknown>): never {
  throw new HttpError(400, message, details);
}

export function forbidden(message: string): never {
  throw new HttpError(403, message);
}

export function notFound(message: string): never {
  throw new HttpError(404, message);
}

export function notImplemented(message: string): never {
  throw new HttpError(501, message);
}
