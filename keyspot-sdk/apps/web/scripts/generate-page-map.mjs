import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT_DIR = join(ROOT, 'content');

// Find nextra's placeholder.js
const require = createRequire(import.meta.url);
const nextraPkg = require.resolve('nextra/package.json');
const placeholderPath = join(dirname(nextraPkg), 'dist', 'server', 'page-map', 'placeholder.js');

// Scan content directory for .mdx and .md files
const files = readdirSync(CONTENT_DIR).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));

// Skip index.mdx — it's the landing page, not a doc page
const docFiles = files.filter(f => f !== 'index.mdx');

// Build RouteToFilepath: map from route path to content-relative file path
const mdxPages = {};
for (const file of docFiles) {
  const name = file.replace(/\.(mdx|md)$/, '');
  mdxPages[name] = file;
}

// Build a flat page map
const pageMap = docFiles.map((file) => {
  const name = file.replace(/\.(mdx|md)$/, '');
  return { name, route: `/doc/${name}`, __pagePath: `content/${file}` };
});

// Generate placeholder.js content
const code = `import { normalizePageMap } from 'nextra/page-map'

export const pageMap = normalizePageMap(${JSON.stringify(pageMap, null, 2)})

export const RouteToFilepath = ${JSON.stringify(mdxPages, null, 2)}
`;

writeFileSync(placeholderPath, code, 'utf-8');
console.log(`Generated page map at ${placeholderPath}`);
console.log(`  ${docFiles.length} doc pages mapped`);
