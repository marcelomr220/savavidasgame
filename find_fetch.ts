import fs from 'fs';
import path from 'path';

function search(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (file !== '.git' && file !== '.vite') {
            search(fullPath);
          }
        } else {
          if (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs') || file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('fetch =') || content.includes('fetch=') || content.includes('window.fetch') || content.includes('global.fetch') || content.includes('globalThis.fetch')) {
              if (!fullPath.includes('node_modules/typescript') && !fullPath.includes('node_modules/vite')) {
                 console.log(fullPath);
              }
            }
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

search('.');
