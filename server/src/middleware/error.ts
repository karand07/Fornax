import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  console.error('Unhandled error:', err);

  if (err instanceof ZodError) {
    const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    res.status(400).json({ error: errorMessages || 'Validation error' });
    return;
  }

  if (err instanceof Error) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
    return;
  }

  res.status(500).json({ error: 'Internal Server Error' });
}

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errorMsg = result.error.errors.map((e) => `${e.path.join('.') || 'body'}: ${e.message}`).join(', ');
      res.status(400).json({ error: errorMsg });
      return;
    }
    req.body = result.data;
    next();
  };
}
