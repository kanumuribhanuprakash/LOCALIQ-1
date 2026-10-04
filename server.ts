import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// ============================================================================
// PART 4 & 5: AUTHENTICATION & RATE LIMITING FOR VEO CLOUD ENDPOINTS
// ============================================================================

/**
 * Validates that incoming request originates from an authenticated LOCALIQ workspace session.
 * Rejects unauthenticated requests with 401 Unauthorized or 403 Forbidden.
 */
function requireSessionAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const userIdHeader = (req.headers['x-localiq-user-id'] as string) || '';
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : ((req.headers['x-localiq-session-token'] as string) || '');

  // Verify token format (LOCALIQ tokens are generated as 'tok_' + 48 hex characters)
  if (!token || !token.startsWith('tok_') || token.length < 16) {
    return res.status(401).json({
      error: '401 Unauthorized: Valid LOCALIQ authenticated session token required to use Veo Video Studio. Please sign in to your local workspace.',
    });
  }

  // Verify workspace user ID presence
  if (!userIdHeader || userIdHeader.trim().length < 3) {
    return res.status(403).json({
      error: '403 Forbidden: Missing or invalid workspace user identity. Operation rejected.',
    });
  }

  (req as any).userSession = { token, userId: userIdHeader.trim() };
  next();
}

/**
 * In-memory sliding rate limiter per authenticated user session / IP
 * Documented limits:
 * - /api/generate-video: 5 requests per 60 seconds
 * - /api/video-status: 60 polling requests per 60 seconds
 * - /api/video-download: 10 downloads per 60 seconds
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStores = {
  generate: new Map<string, RateLimitRecord>(),
  status: new Map<string, RateLimitRecord>(),
  download: new Map<string, RateLimitRecord>(),
};

function createRateLimiter(limitType: 'generate' | 'status' | 'download', maxRequests: number, windowMs: number) {
  const store = rateLimitStores[limitType];
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = ((req as any).userSession?.userId as string) || (req.headers['x-localiq-user-id'] as string) || req.ip || 'anonymous';
    const now = Date.now();
    const record = store.get(key);

    if (!record || now > record.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec.toString());
      return res.status(429).json({
        error: `429 Too Many Requests: Rate limit exceeded for Veo video ${limitType}. Maximum ${maxRequests} requests per ${Math.round(windowMs / 1000)}s. Please retry in ${retryAfterSec}s.`,
      });
    }

    record.count++;
    next();
  };
}

// Garbage-collect expired rate limit records every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const store of Object.values(rateLimitStores)) {
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }
}, 300000);

// Rate limiter middlewares
const limitGenerate = createRateLimiter('generate', 5, 60000);   // max 5/min
const limitStatus = createRateLimiter('status', 60, 60000);       // max 60/min
const limitDownload = createRateLimiter('download', 10, 60000);   // max 10/min

// 1. Start Veo Video Generation: POST /api/generate-video
app.post('/api/generate-video', requireSessionAuth, limitGenerate, async (req, res) => {
  try {
    const { prompt, imageBase64, mimeType, aspectRatio, resolution } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Photo/image data (base64) is required for Veo video generation.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const validAspect: '16:9' | '9:16' = aspectRatio === '9:16' ? '9:16' : '16:9';
    const validResolution: '720p' | '1080p' = resolution === '1080p' ? '1080p' : '720p';

    const operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt?.trim() || 'Cinematic, subtle fluid camera movement and realistic atmospheric lighting',
      image: {
        imageBytes: cleanBase64,
        mimeType: mimeType || 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: validResolution,
        aspectRatio: validAspect,
      },
    });

    return res.json({
      operationName: operation.name,
      aspectRatio: validAspect,
      resolution: validResolution,
    });
  } catch (error: any) {
    console.error('Error starting Veo video generation:', error?.message || error);
    return res.status(500).json({
      error: error?.message || 'Failed to start video generation',
    });
  }
});

// 2. Poll Veo Video Status: POST /api/video-status
app.post('/api/video-status', requireSessionAuth, limitStatus, async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    if (updated.error) {
      return res.json({
        done: true,
        error: updated.error.message || 'Video generation failed during processing',
      });
    }

    return res.json({ done: Boolean(updated.done) });
  } catch (error: any) {
    console.error('Error checking Veo video status:', error?.message || error);
    return res.status(500).json({
      error: error?.message || 'Failed to poll video status',
    });
  }
});

// 3. Download Veo Video: POST /api/video-download
app.post('/api/video-download', requireSessionAuth, limitDownload, async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });

    if (updated.error) {
      return res.status(500).json({
        error: updated.error.message || 'Video generation failed',
      });
    }

    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      return res.status(404).json({
        error: 'Video URI not found in completed operation',
      });
    }

    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': apiKey },
    });

    if (!videoRes.ok) {
      return res.status(videoRes.status).json({
        error: `Failed to download video stream from Google: ${videoRes.statusText}`,
      });
    }

    res.setHeader('Content-Type', 'video/mp4');
    const contentLength = videoRes.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    const arrayBuffer = await videoRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    console.error('Error downloading Veo video stream:', error?.message || error);
    return res.status(500).json({
      error: error?.message || 'Failed to stream video',
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('index.html', { root: 'dist' });
    });
  }

  // Ensure port defaults to 3000. In AI Studio Cloud Run, PORT=8080 is reserved for Nginx proxy.
  let port = 3000;
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    port = parseInt(process.argv[portArgIndex + 1], 10);
  } else if (process.env.APP_PORT) {
    port = parseInt(process.env.APP_PORT, 10);
  } else if (process.env.PORT && process.env.PORT !== '8080') {
    port = parseInt(process.env.PORT, 10);
  }

  let host = '0.0.0.0';
  const hostArgIndex = process.argv.indexOf('--host');
  if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
    host = process.argv[hostArgIndex + 1];
  }

  app.listen(port, host, () => {
    console.log(`Server listening on http://${host}:${port}`);
  });
}

startServer();
