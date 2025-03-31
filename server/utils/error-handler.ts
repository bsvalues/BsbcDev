import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { log } from '../vite';

export interface ApiError {
  message: string;
  status: number;
  details?: string[];
  code?: string;
}

/**
 * Format different error types into a consistent API error format
 * @param error The error to format
 * @returns Formatted API error
 */
export function formatError(error: any): ApiError {
  // Log the error for server-side tracking
  logError(error);
  
  if (error instanceof ZodError) {
    // Handle Zod validation errors
    const validationError = fromZodError(error);
    return {
      message: validationError.message,
      status: 400,
      details: validationError.details.map(d => d.message)
    };
  }
  
  if (error.status && error.message) {
    // Handle errors that already have status and message
    return {
      message: error.message,
      status: error.status,
      code: error.code
    };
  }
  
  // Default error format
  return {
    message: error.message || 'An unexpected error occurred',
    status: error.statusCode || 500
  };
}

/**
 * Log error details to console for debugging
 * @param error The error to log
 */
function logError(error: any): void {
  // Get error details
  const message = error.message || 'Unknown error';
  const stack = error.stack || '';
  const status = error.status || error.statusCode || 500;
  
  // Log with source context if available
  const source = error.source || 'server';
  log(`Error [${status}]: ${message}\n${stack}`, source);
}

/**
 * Express middleware for centralized error handling
 */
export function errorHandlerMiddleware(err: any, req: any, res: any, next: any) {
  const formattedError = formatError(err);
  
  res.status(formattedError.status).json(formattedError);
}