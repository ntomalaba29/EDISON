import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const bodyParserPath = require.resolve('body-parser/package.json');
const iconvLitePath = require.resolve('iconv-lite/package.json', {
  paths: [path.dirname(bodyParserPath)],
});
const iconvLitePackage = JSON.parse(fs.readFileSync(iconvLitePath, 'utf8'));
const browserMappings = iconvLitePackage.browser;

if (browserMappings && typeof browserMappings === 'object') {
  let changed = false;
  // Cloudflare's bundler otherwise replaces these Node modules with empty browser shims.
  for (const modulePath of ['./lib/extend-node', './lib/streams']) {
    if (browserMappings[modulePath] === false) {
      delete browserMappings[modulePath];
      changed = true;
    }
  }

  if (changed) {
    if (Object.keys(browserMappings).length === 0) {
      delete iconvLitePackage.browser;
    }
    fs.writeFileSync(iconvLitePath, `${JSON.stringify(iconvLitePackage, null, 4)}\n`);
  }
}
