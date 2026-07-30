import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import stateHandler from './api/state';

type LocalApiRequest = IncomingMessage & { body?: unknown };

type LocalApiResponse = {
  setHeader: (name: string, value: string | number | readonly string[]) => void;
  status: (code: number) => LocalApiResponse;
  json: (payload: unknown) => LocalApiResponse;
};

const localApiPlugin: Plugin = {
  name: 'local-neon-api',
  configureServer(server) {
    server.middlewares.use('/api/state', (req, res, next) => {
      if (!['GET', 'PATCH', 'PUT'].includes(req.method || '')) {
        next();
        return;
      }

      const run = async () => {
        const request = req as LocalApiRequest;
        if (request.method !== 'GET') {
          const chunks: Buffer[] = [];
          for await (const chunk of request) {
            chunks.push(Buffer.from(chunk));
          }
          const rawBody = Buffer.concat(chunks).toString('utf8');
          request.body = rawBody ? JSON.parse(rawBody) : {};
        }

        let statusCode = 200;
        const response: LocalApiResponse = {
          setHeader: (name, value) => res.setHeader(name, value),
          status: code => {
            statusCode = code;
            return response;
          },
          json: payload => {
            res.statusCode = statusCode;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(payload));
            return response;
          }
        };

        await stateHandler(request, response);
      };

      void run().catch(error => {
        console.error('Local API error.', error);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Internal server error.' }));
        }
      });
    });
  }
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.DATABASE_URL) process.env.DATABASE_URL = env.DATABASE_URL;
  if (env.POSTGRES_URL) process.env.POSTGRES_URL = env.POSTGRES_URL;

  return {
    plugins: [localApiPlugin, react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
