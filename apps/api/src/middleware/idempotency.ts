import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Idempotency Record
 * §SYNC-07: Ambiguous network failures (request sent, response lost in transit).
 * When a mobile or web client sends a mutation, if the connection drops before receiving
 * the response, the client retries with the same Idempotency-Key. UniTrack detects the duplicate
 * key and serves the cached response without re-executing the database write.
 */
interface IdempotencyRecord {
  status: 'IN_PROGRESS' | 'COMPLETED';
  statusCode: number;
  body: any;
  createdAt: number;
}

// 24 hours in milliseconds per docs/api-specification.md §13
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * In-memory idempotency cache keyed by:
 * `${userId}:${method}:${endpointPath}:${idempotencyKey}`
 *
 * NOTE ON MULTI-INSTANCE LIMITATION:
 * This in-memory store is local to the current Node.js process. In a horizontally-scaled,
 * multi-container deployment (e.g. multiple Cloud Run or Kubernetes pods behind a round-robin load
 * balancer), requests with the same key routed to different pods would not share this cache
 * unless backed by Redis or PostgreSQL. Documented for Phase 7 deployment planning.
 */
const idempotencyStore = new Map<string, IdempotencyRecord>();

/**
 * Clear expired records periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (now - record.createdAt > IDEMPOTENCY_TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
}, 60 * 60 * 1000).unref(); // unref so it does not keep test processes alive

/**
 * Express middleware supporting the Idempotency-Key header on POST requests.
 */
export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'POST') {
    return next();
  }

  const rawKey = req.headers['idempotency-key'];
  if (!rawKey) {
    return next();
  }

  const idempotencyKey = Array.isArray(rawKey) ? rawKey[0] : rawKey;
  if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim().length === 0) {
    return next();
  }

  const authReq = req as AuthRequest;
  const userId = authReq.user?.id || 'anon';
  // Scope key to user, HTTP method, and exact endpoint path (ISS-01 fix)
  const endpointPath = `${req.baseUrl || ''}${req.path}`;
  const cacheKey = `${userId}:${req.method}:${endpointPath}:${idempotencyKey.trim()}`;

  const cached = idempotencyStore.get(cacheKey);
  if (cached) {
    if (cached.status === 'IN_PROGRESS') {
      res.status(409).json({
        error: {
          code: 'IDEMPOTENT_REQUEST_IN_PROGRESS',
          message: 'An identical request is currently processing. Please retry shortly.',
        },
      });
      return;
    }

    // Return cached response immediately without re-executing
    res.setHeader('X-Cache-Lookup', 'HIT');
    res.setHeader('Idempotency-Key', idempotencyKey);
    res.status(cached.statusCode).json(cached.body);
    return;
  }

  // Register in-progress entry
  idempotencyStore.set(cacheKey, {
    status: 'IN_PROGRESS',
    statusCode: 200,
    body: null,
    createdAt: Date.now(),
  });

  // Track if response finished cleanly
  let isCleanlyCompleted = false;

  // Intercept json response
  const originalJson = res.json.bind(res);
  res.json = (body: any): Response => {
    isCleanlyCompleted = true;
    // ISS-01 fix: Only cache successful responses (2xx).
    // If a request fails with 4xx or 5xx, do NOT cache the error, allowing safe client retries.
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyStore.set(cacheKey, {
        status: 'COMPLETED',
        statusCode: res.statusCode,
        body,
        createdAt: Date.now(),
      });
    } else {
      idempotencyStore.delete(cacheKey);
    }

    res.setHeader('Idempotency-Key', idempotencyKey);
    return originalJson(body);
  };

  // If connection closes prematurely without a completed response, clean up lock
  res.on('close', () => {
    if (!isCleanlyCompleted) {
      const record = idempotencyStore.get(cacheKey);
      if (record && record.status === 'IN_PROGRESS') {
        idempotencyStore.delete(cacheKey);
      }
    }
  });

  next();
}

/**
 * Helper to clear cache in testing
 */
export function resetIdempotencyStore(): void {
  idempotencyStore.clear();
}
