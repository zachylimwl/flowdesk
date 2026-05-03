export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found.') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden.') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized.') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict.') {
    super(message, 409, 'CONFLICT')
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed.') {
    super(message, 422, 'VALIDATION_ERROR')
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request.') {
    super(message, 400, 'BAD_REQUEST')
  }
}

export class GoneError extends AppError {
  constructor(message = 'Gone.') {
    super(message, 410, 'GONE')
  }
}
