import { Request, Response, NextFunction } from 'express';
import { log } from '../vite';

/**
 * Enhanced request logging middleware that captures detailed information about 
 * the request including response time, status code, method, and path.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Record the start time
  const startTime = process.hrtime();
  
  // Get the request details
  const method = req.method;
  const path = req.originalUrl || req.url;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Log the incoming request
  log(`${method} ${path} - incoming request from ${ip}`, 'info');
  
  // Add X-Response-Time header on the way in (before sending the response)
  // This ensures headers aren't set after they're sent
  res.setHeader('X-Request-Start', Date.now().toString());
  
  // Log response when finished
  res.on('finish', () => {
    // Calculate duration in milliseconds
    const hrTime = process.hrtime(startTime);
    const duration = (hrTime[0] * 1000 + hrTime[1] / 1000000).toFixed(2);
    
    // Get the response status code
    const statusCode = res.statusCode;
    
    // Determine the log category based on status code
    const category = statusCode >= 400 ? 'error' : 'info';
    
    // Create a formatted log message
    const logMessage = `${method} ${path} ${statusCode} - ${duration}ms | IP: ${ip} | UA: ${userAgent.substring(0, 50)}${userAgent.length > 50 ? '...' : ''}`;
    
    // Log with appropriate category
    log(logMessage, category);
  });
  
  // Continue to the next middleware
  next();
}