import { readdirSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Every bare import used under src/, so the dev server bundles all libraries up front instead of discovering them late. */
function appDependencies(dir = 'src', found = new Set<string>()): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) appDependencies(path, found)
    else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name)) {
      for (const m of readFileSync(path, 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"]([^'".\/][^'"]*)['"]/g)) {
        if (!m[1].startsWith('node:') && !m[1].endsWith('.json')) found.add(m[1])
      }
    }
  }
  return [...found]
}

export default defineConfig({
  plugins: [react()],
  // The dependency cache lives in the temp dir, not node_modules: a restored or half-copied node_modules/.vite
  // leaves a cache whose index says "ready" while the bundles are missing, which blanks the whole page.
  cacheDir: join(tmpdir(), 'vite-cache-canvas'),
  optimizeDeps: { force: true, include: [...appDependencies(), 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
  server: { allowedHosts: true },
})
