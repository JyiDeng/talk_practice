import * as vite from 'vite';
import { defineConfig, loadConfigFromFile } from 'vite';
import path from 'path';

const env = { command: 'serve', mode: 'development' } as const;
const configFile = path.resolve(__dirname, 'vite.config.ts');
const result = await loadConfigFromFile(env, configFile);
const userConfig = result?.config ?? {};

const viteVersionInfo = {
  version: vite.version,
  rollupVersion: (vite as { rollupVersion?: string }).rollupVersion ?? null,
  rolldownVersion: (vite as { rolldownVersion?: string }).rolldownVersion ?? null,
  isRolldownVite: 'rolldownVersion' in vite,
};

export default defineConfig({
  ...userConfig,
  define: {
    __VITE_INFO__: JSON.stringify(viteVersionInfo),
    ...(userConfig.define ?? {}),
  },
  cacheDir: path.resolve(__dirname, 'node_modules/.vite'),
});
