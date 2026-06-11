#!/usr/bin/env node
// Wrapper around `next dev` that:
//   1. Kills any other Next.js processes on port 3000 (stale servers cause CSS to vanish)
//   2. Clears .next/cache so Tailwind always recompiles fresh
//   3. Starts next dev

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Kill stale next dev processes
try {
  // Find node processes whose command line contains "next"
  const out = execSync(
    'wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /format:csv 2>nul',
    { encoding: 'utf8', shell: 'cmd.exe' }
  );
  out.split('\n').forEach(line => {
    if (line.toLowerCase().includes('next') && !line.includes(process.pid)) {
      const parts = line.split(',');
      const pid = parseInt(parts[parts.length - 1]);
      if (pid && !isNaN(pid) && pid !== process.pid) {
        try {
          process.kill(pid, 'SIGTERM');
          console.log(`[dev] Killed stale Next.js process ${pid}`);
        } catch {}
      }
    }
  });
} catch {}

// 2. Clear .next/cache
const cacheDir = path.join(__dirname, '..', '.next', 'cache');
try {
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log('[dev] Cleared .next/cache');
} catch {}

// 3. Start next dev
console.log('[dev] Starting Next.js dev server...\n');
const child = spawn('npx', ['next', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, '..'),
});

child.on('exit', code => process.exit(code ?? 0));
process.on('SIGINT', () => { child.kill('SIGINT'); });
process.on('SIGTERM', () => { child.kill('SIGTERM'); });
