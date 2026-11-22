import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const file = path.join(process.cwd(), '.env');
if (fs.existsSync(file)) {
  console.log('Existing agent-server .env preserved.');
} else {
  const example = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf8');
  const configured = example.replace('replace-with-a-long-random-secret', randomBytes(48).toString('hex'));
  fs.writeFileSync(file, configured, { mode: 0o600, flag: 'wx' });
  console.log('Created agent-server/.env with a random MICODE_SERVER_TOKEN (mode 0600).');
  console.log('Read MICODE_SERVER_TOKEN from this file and paste it into MiCode Settings > MiCode agent server.');
  console.log('Add your AI provider API key to AI_API_KEY before using the coding agent.');
}
