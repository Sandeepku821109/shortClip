import { Request, Response, NextFunction } from 'express';
import { allowedMimeTypes, allowedExtensions, config } from '../config';
import path from 'path';

export function validateUpload(req: Request, res: Response, next: NextFunction): void {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const file = req.file;

  // Validate MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    res.status(400).json({
      error: 'Invalid file type',
      allowedTypes: allowedMimeTypes,
    });
    return;
  }

  // Validate extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    res.status(400).json({
      error: 'Invalid file extension',
      allowedExtensions,
    });
    return;
  }

  next();
}