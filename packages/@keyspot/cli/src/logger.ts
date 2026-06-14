import chalk from 'chalk';

function stamp(prefix: string, color: ReturnType<typeof chalk.hex>) {
  return (msg: string) => console.log(color(`${prefix} ${msg}`));
}

export const log = {
  scanning: stamp('⬡', chalk.hex('#f59e0b')),
  detected: stamp('✗', chalk.hex('#ef4444')),
  vaulted: stamp('✓', chalk.hex('#10b981')),
  clean: stamp('●', chalk.hex('#00ff41')),
  info: stamp('›', chalk.hex('#f1f5f9')),
  muted: (msg: string) => console.log(chalk.hex('#475569')(`  ${msg}`)),
  error: (msg: string) => console.error(chalk.hex('#ef4444')(`✗ ${msg}`)),
};
