import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

const logger = new Logger('ErrorHandler');

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Unhandled error', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
  });
}