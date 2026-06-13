const fs = require('fs');
const path = require('path');

const filesToPatch = [
  'node_modules/dompurify/dist/purify.es.mjs',
  'node_modules/dompurify/dist/purify.cjs.js',
  'node_modules/dompurify/dist/purify.js',
];

for (const relativePath of filesToPatch) {
  const filePath = path.join(__dirname, '..', relativePath);

  if (!fs.existsSync(filePath)) {
    continue;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const patched = original
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('//# sourceMappingURL='))
    .join('\n');

  if (patched !== original) {
    fs.writeFileSync(filePath, patched, 'utf8');
    console.log(`Patched ${relativePath}`);
  }
}
