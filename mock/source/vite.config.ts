import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import fs from 'node:fs';

// Serve parent repo's HSK3.0_新版样卷 folder & ../images during local dev
function serveSamplePaperAssets() {
  const repoRoot = path.resolve(__dirname, '../..');
  const sampleRoot = path.join(repoRoot, 'HSK3.0_新版样卷');
  const imagesRoot = path.resolve(__dirname, '../images');
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
  };

  return {
    name: 'serve-sample-paper-assets',
    configureServer(server: { middlewares: { use: Function } }) {
      server.middlewares.use('/images', (req: any, res: any, next: any) => {
        const rawUrl = (req.url || '').split('?')[0];
        let decoded = rawUrl;
        try {
          decoded = decodeURIComponent(rawUrl);
        } catch {
          return next();
        }
        const filePath = path.join(imagesRoot, decoded);
        if (!filePath.startsWith(imagesRoot) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          return next();
        }
        const ext = path.extname(filePath).toLowerCase();
        const stat = fs.statSync(filePath);
        res.writeHead(200, {
          'Content-Type': mimeTypes[ext] || 'application/octet-stream',
          'Content-Length': stat.size,
        });
        fs.createReadStream(filePath).pipe(res);
      });

      server.middlewares.use('/HSK3.0_新版样卷', (req: any, res: any, next: any) => {
        const rawUrl = (req.url || '').split('?')[0];
        let decoded = rawUrl;
        try {
          decoded = decodeURIComponent(rawUrl);
        } catch {
          return next();
        }
        const filePath = path.join(sampleRoot, decoded);
        if (!filePath.startsWith(sampleRoot) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          return next();
        }
        const ext = path.extname(filePath).toLowerCase();
        const stat = fs.statSync(filePath);
        const mime = mimeTypes[ext] || 'application/octet-stream';

        const range = req.headers.range;
        if (range) {
          const match = /bytes=(\d+)-(\d*)/.exec(range);
          if (match) {
            const start = Number(match[1]);
            const end = match[2] ? Number(match[2]) : stat.size - 1;
            res.writeHead(206, {
              'Content-Range': `bytes ${start}-${end}/${stat.size}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': end - start + 1,
              'Content-Type': mime,
            });
            fs.createReadStream(filePath, { start, end }).pipe(res);
            return;
          }
        }

        res.writeHead(200, {
          'Content-Type': mime,
          'Content-Length': stat.size,
          'Accept-Ranges': 'bytes',
        });
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [react(), tailwindcss(), serveSamplePaperAssets()],
  build: {
    outDir: '..',
    emptyOutDir: false,
    assetsDir: 'assets',
  },
});
