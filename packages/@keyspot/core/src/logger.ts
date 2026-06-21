const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

export interface Logger {
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
}

function formatArgs(extra: unknown[]): string {
  return extra.length > 0 ? ' ' + extra.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') : '';
}

const consoleLogger: Logger = {
  info: (msg, ...args) => console.log(`[${new Date().toISOString()}] [INFO] ${msg}${formatArgs(args)}`),
  warn: (msg, ...args) => console.warn(`[${new Date().toISOString()}] [WARN] ${msg}${formatArgs(args)}`),
  error: (msg, ...args) => console.error(`[${new Date().toISOString()}] [ERROR] ${msg}${formatArgs(args)}`),
  debug: (msg, ...args) => {
    if (!isProduction) console.log(`[${new Date().toISOString()}] [DEBUG] ${msg}${formatArgs(args)}`);
  },
};

let pinoLogger: Logger | null = null;

try {
  // Attempt to use pino — silently fall back to console if unavailable
  const pinoMod = await import('pino');
  const level = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
  if (pinoMod && pinoMod.default) {
    const instance = pinoMod.default({
      level,
      transport: isProduction ? undefined : { target: 'pino-pretty', options: { colorize: true } },
    });
    pinoLogger = {
      info: (msg, ...args) => instance.info(args.length > 0 ? { extra: args } : undefined, msg),
      warn: (msg, ...args) => instance.warn(args.length > 0 ? { extra: args } : undefined, msg),
      error: (msg, ...args) => instance.error(args.length > 0 ? { extra: args } : undefined, msg),
      debug: (msg, ...args) => instance.debug(args.length > 0 ? { extra: args } : undefined, msg),
    };
    consoleLogger.info('Using pino logger');
  }
} catch {
  // pino not available — using console fallback
}

export const logger: Logger = pinoLogger ?? consoleLogger;
