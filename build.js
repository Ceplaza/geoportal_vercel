const fs = require('fs');

const appJs = fs.readFileSync('app.js', 'utf8');

const replacements = {
  '@@SUPABASE_URL@@': process.env.SUPABASE_URL || '',
  '@@SUPABASE_KEY@@': process.env.SUPABASE_KEY || ''
};

let result = appJs;
for (const [placeholder, value] of Object.entries(replacements)) {
  if (!value) {
    console.warn(`WARNING: Environment variable for ${placeholder} is not set`);
  }
  result = result.split(placeholder).join(value);
}

fs.writeFileSync('app.js', result);
console.log('Build completed: credentials injected');
