import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDocument } from '../src/openapi/document';

const target = join(__dirname, '..', 'openapi.json');
writeFileSync(target, JSON.stringify(buildDocument(), null, 2) + '\n');
console.log(`Wrote ${target}`);
