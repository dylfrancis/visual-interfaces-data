import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/visual-interfaces-data/project-1/',
  build: {
    outDir: '../../docs/project-1',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        docs: resolve(__dirname, 'docs.html'),
      },
    },
  },
});
