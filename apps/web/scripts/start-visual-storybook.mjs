#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const run = (command, args = []) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, CI: '1' },
    });

    child.on('exit', code => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });

    child.on('error', reject);
  });

const main = async () => {
  await run('pnpm', ['run', 'storybook:build']);

  await import(path.resolve(__dirname, './serve-storybook.mjs'));
};

main().catch(error => {
  console.error('[visual] Failed to start Storybook static server', error);
  process.exit(1);
});
