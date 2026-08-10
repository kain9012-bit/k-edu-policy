import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

const DATA_DIR = path.resolve(__dirname, 'data');

/**
 * 수집기가 만드는 data/*.json 을 화면에 그대로 물려주는 플러그인.
 *
 * data/ 는 파이썬 수집 스크립트가 쓰는 폴더라 public/ 으로 옮기지 않는다.
 * 대신 개발 중에는 /data/* 요청을 그 폴더로 흘려보내고,
 * 빌드할 때는 dist/data/ 로 복사한다.
 */
function serveCollectedData(): Plugin {
  // 화면이 실제로 읽는 파일만 내보낸다. infolist_raw.json(65MB) 같은 중간 산출물은 제외.
  const SHIPPED = ['documents.json', 'infolist.json', 'budget.json'];

  return {
    name: 'serve-collected-data',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];
        const m = url.match(/^\/data\/([\w.-]+\.json)$/);
        if (!m) return next();

        const file = path.join(DATA_DIR, m[1]);
        if (!fs.existsSync(file)) return next();

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        fs.createReadStream(file).pipe(res);
      });
    },

    closeBundle() {
      const out = path.resolve(__dirname, 'dist/data');
      fs.mkdirSync(out, { recursive: true });
      for (const name of SHIPPED) {
        const src = path.join(DATA_DIR, name);
        if (!fs.existsSync(src)) {
          this.warn(`data/${name} 이 없습니다. 수집 스크립트를 먼저 실행하세요.`);
          continue;
        }
        fs.copyFileSync(src, path.join(out, name));
        const mb = (fs.statSync(src).size / 1024 / 1024).toFixed(1);
        console.log(`  data/${name} → dist/data/${name} (${mb}MB)`);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    // GitHub Pages 하위 경로(/저장소이름/)에서도 동작하도록 상대경로로 빌드한다.
    base: './',

    plugins: [react(), tailwindcss(), serveCollectedData()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1200,
    },

    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {
              // 20MB짜리 수집 데이터는 감시 대상에서 뺀다.
              ignored: ['**/data/**', '**/legacy/**'],
            },
    },
  };
});
