import { defineConfig } from 'vitest/config';
import path from 'path';
export default defineConfig({
    resolve: {
        alias: {
            '@roadsidelab/keyspot-sdk': path.resolve(__dirname, 'packages/keyspot-sdk/src'),
            '@roadsidelab/keyspot-sdk/adapters': path.resolve(__dirname, 'packages/@keyspot/adapters/src'),
            '@roadsidelab/keyspot-sdk/frameworks': path.resolve(__dirname, 'packages/@keyspot/frameworks/src'),
            '@roadsidelab/keyspot-sdk/cli': path.resolve(__dirname, 'packages/@keyspot/cli/src'),
            // Internal aliases (resolved through meta-package)
            '@roadsidelab/keyspot-core': path.resolve(__dirname, 'packages/@keyspot/core/src'),
            '@roadsidelab/keyspot-vault': path.resolve(__dirname, 'packages/@keyspot/vault/src'),
            '@roadsidelab/keyspot-vault/circuit-breaker-adapter': path.resolve(__dirname, 'packages/@keyspot/vault/src/circuit-breaker-adapter.ts'),
            '@roadsidelab/keyspot-patterns': path.resolve(__dirname, 'packages/@keyspot/patterns/src'),
            '@roadsidelab/keyspot-adapters': path.resolve(__dirname, 'packages/@keyspot/adapters/src'),
            '@roadsidelab/keyspot-frameworks': path.resolve(__dirname, 'packages/@keyspot/frameworks/src'),
            '@roadsidelab/keyspot-cli': path.resolve(__dirname, 'packages/@keyspot/cli/src'),
            '@roadsidelab/keyspot-server': path.resolve(__dirname, 'packages/@keyspot/server/src/app.ts'),
            '@roadsidelab/keyspot-server/metrics': path.resolve(__dirname, 'packages/@keyspot/server/src/metrics.ts'),
            // Subpath exports for core
            '@roadsidelab/keyspot-core/scanner': path.resolve(__dirname, 'packages/@keyspot/core/src/scanner.ts'),
            '@roadsidelab/keyspot-core/taint': path.resolve(__dirname, 'packages/@keyspot/core/src/taint.ts'),
            '@roadsidelab/keyspot-core/worker': path.resolve(__dirname, 'packages/@keyspot/core/src/worker.ts'),
            '@roadsidelab/keyspot-core/security': path.resolve(__dirname, 'packages/@keyspot/core/src/security.ts'),
            '@roadsidelab/keyspot-core/telemetry': path.resolve(__dirname, 'packages/@keyspot/core/src/telemetry.ts'),
            '@roadsidelab/keyspot-core/compliance': path.resolve(__dirname, 'packages/@keyspot/core/src/compliance.ts'),
            '@roadsidelab/keyspot-core/circuit-breaker': path.resolve(__dirname, 'packages/@keyspot/core/src/circuit-breaker.ts'),
            '@roadsidelab/keyspot-core/errors': path.resolve(__dirname, 'packages/@keyspot/core/src/errors.ts'),
            '@roadsidelab/keyspot-core/logger': path.resolve(__dirname, 'packages/@keyspot/core/src/logger.ts'),
        }
    },
    plugins: [
        {
            name: 'resolve-js-to-ts',
            enforce: 'pre',
            resolveId(source, _importer) {
                if (source.endsWith('.js')) {
                    const tsSource = source.replace(/\.js$/, '.ts');
                    return this.resolve(tsSource, _importer, { skipSelf: true })
                        .then(resolved => resolved || null);
                }
                return null;
            }
        }
    ],
    test: {
        globals: true,
        environment: 'node',
        env: {
            JWT_SECRET: 'test-jwt-secret-for-vitest',
            MIGRATION_SECRET: 'test-migration-secret-for-vitest',
            X402_JWT_SECRET: 'test-x402-jwt-secret-for-vitest',
        },
        include: ['tests/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: [
                'packages/@keyspot/core/src/**/*.ts',
                'packages/@keyspot/vault/src/**/*.ts',
                'packages/@keyspot/patterns/src/**/*.ts',
                'packages/@keyspot/frameworks/src/**/*.ts',
            ],
            exclude: ['**/*.test.ts', '**/*.spec.ts', '**/dist/**'],
            thresholds: {
                statements: 80,
                branches: 70,
                functions: 75,
                lines: 80,
            }
        }
    }
});
//# sourceMappingURL=vitest.config.js.map