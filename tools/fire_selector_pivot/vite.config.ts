import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = path.resolve(rootDir, '../..');
const pivotsFilePath = path.resolve(
  repoRoot,
  'catnip_app/src/replicas/fire-selector-pivots.json',
);

const REPLICA_TYPES = ['M4', 'AK'] as const;

function isFireSelectorPivot(value: unknown): value is { x: number; y: number } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.x === 'number' &&
    typeof record.y === 'number' &&
    record.x >= 0 &&
    record.x <= 1 &&
    record.y >= 0 &&
    record.y <= 1
  );
}

function isValidPivotsPayload(body: unknown): body is Record<(typeof REPLICA_TYPES)[number], { x: number; y: number }> {
  if (typeof body !== 'object' || body === null) {
    return false;
  }

  const record = body as Record<string, unknown>;
  for (const type of REPLICA_TYPES) {
    if (!isFireSelectorPivot(record[type])) {
      return false;
    }
  }
  return true;
}

async function readRequestBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function savePivotsApiPlugin(): Plugin {
  return {
    name: 'save-pivots-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/save-pivots' || req.method !== 'POST') {
          next();
          return;
        }

        try {
          const raw = await readRequestBody(req);
          const body: unknown = JSON.parse(raw);

          if (!isValidPivotsPayload(body)) {
            sendJson(res, 400, {
              ok: false,
              error: 'Expected JSON with M4 and AK pivots (x, y in 0–1).',
            });
            return;
          }

          const output = `${JSON.stringify(body, null, 2)}\n`;
          await fs.writeFile(pivotsFilePath, output, 'utf8');
          sendJson(res, 200, { ok: true });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          sendJson(res, 500, { ok: false, error: message });
        }
      });
    },
  };
}

export default defineConfig({
  root: rootDir,
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
  resolve: {
    alias: {
      '@catnip/pivot-math': path.resolve(
        repoRoot,
        'catnip_app/src/replicas/fire-selector-pivot-math.ts',
      ),
    },
  },
  plugins: [savePivotsApiPlugin()],
});
