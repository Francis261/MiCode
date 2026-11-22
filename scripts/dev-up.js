const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const logs = path.join(root, '.runtime');
fs.mkdirSync(logs, { recursive: true });
function launch(name, command, args) {
  const out = fs.openSync(path.join(logs, name + '.log'), 'a');
  const child = spawn(command, args, { cwd: root, detached: true, stdio: ['ignore', out, out], env: process.env });
  child.on('error', e => fs.appendFileSync(path.join(logs, name + '.log'), '\n' + e.message + '\n'));
  child.unref();
  fs.writeFileSync(path.join(logs, name + '.pid'), String(child.pid));
  return child.pid;
}
const metro = launch('metro', process.execPath, [path.join(root, 'node_modules/expo/bin/cli'), 'start', '--host', 'lan', '--port', '8081']);
let ngrok;
try { ngrok = launch('ngrok', 'ngrok', ['http', '8081']); } catch (e) { ngrok = null; }
console.log(JSON.stringify({ metroPid: metro, ngrokPid: ngrok, logs: '.runtime/' }));
