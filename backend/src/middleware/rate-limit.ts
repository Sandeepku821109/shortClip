import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const uploadRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    error: 'Too many uploads from this IP, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});