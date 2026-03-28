// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],                 // ReactのJSX変換
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },  // "@/..." エイリアス
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      // 計測対象にするプロバイダ
      provider: 'v8',
      // 出力するレポート形式
      reporter: ['text', 'json', 'html'],
      // 計測対象に含めるファイル
      include: ['src/**/*.{ts,tsx}'],
      // 計測対象から除外するファイル
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/types/index.ts',
        'src/test/setup.ts',
        '**/*.test.{ts,tsx}',
      ],
      // テストされていないファイルもカバレッジに含める
      all: true,
    },
  },
});