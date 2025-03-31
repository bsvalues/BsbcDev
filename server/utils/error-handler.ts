import { NextFunction, Request, Response } from 'express';
import { log } from '../vite';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

/**
 * Error interface that will be used to format error responses
 */
export interface AppError {
  message: string;
  status?: number;
  code?: string;
  error?: Error | unknown;
  details?: Record<string, any>;
}

/**
 * Format error for API responses
 * Sanitizes error object to only include safe information for client
 */
export function formatError(error: AppError): Record<string, any> {
  const response: Record<string, any> = {
    message: error.message,
    status: error.status || 500,
    code: error.code || 'INTERNAL_ERROR'
  };

  // Add detailed validation errors if available
  if (error.details) {
    response.details = error.details;
  }

  return response;
}

/**
 * Global error handling middleware
 */
export function errorHandler(err: Error | AppError, req: Request, res: Response, next: NextFunction) {
  // Log the error
  log(`Error: ${err.message}`, 'error');
  if ((err as AppError).error) {
    console.error((err as AppError).error);
  } else {
    console.error(err);
  }

  // If the error is a Zod validation error, format it specially
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    return res.status(400).json(formatError({
      message: 'Validation error',
      status: 400,
      code: 'VALIDATION_ERROR',
      details: { fields: validationError.details },
      error: err
    }));
  }

  // If it's our custom error type with status
  if ((err as AppError).status) {
    const appError = err as AppError;
    return res.status(appError.status || 500).json(formatError(appError));
  }

  // Default error response for unexpected errors
  res.status(500).json(formatError({
    message: 'An unexpected error occurred',
    status: 500,
    code: 'INTERNAL_ERROR',
    error: err
  }));
}

/**
 * Handler for when routes are not found
 */
export function notFoundHandler(req: Request, res: Response) {
  log(`Route not found: ${req.method} ${req.originalUrl}`, 'error');
  
  res.status(404).json(formatError({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    status: 404,
    code: 'NOT_FOUND'
  }));
}

/**
 * Creates an error with proper structure for the error handler
 */
export function createError(message: string, status = 500, code?: string, details?: Record<string, any>, error?: Error): AppError {
  return {
    message,
    status,
    code,
    details,
    error
  };
}