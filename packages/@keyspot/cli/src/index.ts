#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { performance } from 'node:perf_hooks';
import { setTimeout } from 'node:timers/promises';
import { KeySpot } from '@roadsidelab/keyspot-core';
import { builtInPatterns } from '@roadsidelab/keyspot-patterns';
import { showBanner } from './banner.js';
import { log } from './logger.js';

interface ScanOptions {
  path: string;
  git?: boolean;
  prune?: boolean;
  format?: 'text' | 'json';
}

async function scanFiles(options: ScanOptions): Promise<void> {
  const start = performance.now();
  const guard = new KeySpot({ patterns: builtInPatterns });

  function walkDir(dir: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
          files.push(...walkDir(full));
        }
      } else {
        files.push(full);
      }
    }
    return files;
  }

  const files = walkDir(options.path);
  let totalMatches = 0;
  let prunedCount = 0;

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const matches = await guard.scan(content);
      if (matches.length > 0) {
        totalMatches += matches.length;
        if (options.format === 'json') {
          console.log(JSON.stringify({ file, matches }));
        } else {
          log.scanning(`Scanning ${file}`);
          for (const m of matches) {
            const action = options.prune ? '[PRUNED]' : '[FOUND]';
            log.detected(`${m.type} ${action} (${m.severity}) at ${m.path || 'root'}`);
            log.muted(m.redacted);
          }
          if (options.prune) {
            let pruned = content;
            for (const m of matches) {
              if (m.rawValue) {
                pruned = pruned.replaceAll(m.rawValue, m.redacted);
              }
            }
            prunedCount += matches.length;
            writeFileSync(file, pruned, 'utf-8');
          }
        }
      }
    } catch {
      // Skip binary or unreadable files
    }
  }

  const elapsed = Math.round(performance.now() - start);

  if (options.format !== 'json') {
    if (totalMatches === 0) {
      log.clean(`State sanitised · 0 secrets · ${elapsed}ms`);
    } else {
      log.clean(`State sanitised · ${prunedCount || totalMatches} secret(s) pruned · ${elapsed}ms`);
    }
  }

  if (totalMatches > 0 && !options.prune) {
    process.exitCode = 1;
  }
}

function installHook(): void {
  const hookDir = join(process.cwd(), '.git', 'hooks');
  if (!existsSync(hookDir)) {
    log.error('Not a git repository: no .git/hooks directory found');
    process.exit(1);
  }

  const hookPath = join(hookDir, 'pre-commit');
  const hookContent = `#!/bin/sh
# KeySpot SDK pre-commit hook — scans staged files for secrets
exec npx @roadsidelab/keyspot-sdk/cli scan --git
`;

  writeFileSync(hookPath, hookContent, 'utf-8');
  log.info(`Installed pre-commit hook at ${hookPath}`);
}

async function printHelp(): Promise<void> {
  log.info('KeySpot SDK v2.0.3 — Runtime security for AI agents');
  log.muted('USAGE');
  log.muted('  keyspot scan <path>     Scan files for secrets');
  log.muted('  keyspot install         Install pre-commit hook');
  log.muted('  keyspot --version       Show version');
  log.muted('');
  log.muted('OPTIONS');
  log.muted('  --git        Scan only files changed in the last commit (for pre-commit)');
  log.muted('  --prune      Auto-redact found secrets in-place');
  log.muted('  --json       Output in JSON format');
  log.muted('  --help       Show this help');
}

export async function main(): Promise<void> {
  showBanner();
  await setTimeout(800);

  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    await printHelp();
    return;
  }

  if (args.includes('--version') || args.includes('-v')) {
    log.info('2.0.2');
    return;
  }

  if (args[0] === 'install') {
    installHook();
    return;
  }

  if (args[0] === 'scan' && args[1]) {
    await scanFiles({
      path: resolve(process.cwd(), args[1]),
      git: args.includes('--git'),
      prune: args.includes('--prune'),
      format: args.includes('--json') ? 'json' : 'text',
    });
    return;
  }

  if (args[0] === 'scan' && args.includes('--git')) {
    // Pre-commit mode: scan staged changed files
    const { execSync } = await import('child_process');
    const diffOutput = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    const files = diffOutput.split('\n').filter(Boolean).map(f => join(process.cwd(), f));

    let totalMatches = 0;
    const guard = new KeySpot({ patterns: builtInPatterns });

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const matches = await guard.scan(content);
        if (matches.length > 0) {
          totalMatches += matches.length;
          log.scanning(file);
          for (const m of matches) {
            log.error(`[BLOCKED] ${m.type} (${m.severity})`);
            log.muted(m.redacted);
          }
        }
      } catch { /* skip unreadable */ }
    }

    if (totalMatches > 0) {
      log.clean(`State blocked · ${totalMatches} secret(s) found in staged changes`);
      process.exit(1);
    }
    return;
  }

  log.error('Unknown command. Use --help for usage.');
  process.exit(1);
}

main().catch(err => {
  log.error(`Fatal: ${err}`);
  process.exit(1);
});
