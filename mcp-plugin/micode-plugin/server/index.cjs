#!/usr/bin/env node
'use strict';
// MiCode local MCP executor. Uses only Node.js built-ins and newline-delimited JSON-RPC.
// All file operations are confined to configured workspace roots. VPS operations use SSH/SCP.
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const readline = require('node:readline');

const parseList = (v) => (v || path.join(os.homedir(), 'Projects')).split(path.delimiter).filter(Boolean).map(p => path.resolve(p));
const ROOTS = parseList(process.env.MICODE_WORKSPACES);
const DEFAULT_ROOT = process.env.MICODE_DEFAULT_WORKSPACE ? path.resolve(process.env.MICODE_DEFAULT_WORKSPACE) : ROOTS[0];
const MAX_READ = 1024 * 1024;
const MAX_OUTPUT = 100_000;
const MAX_TIMEOUT = 120_000;
const BLOCKED = [/(^|[;&|\s])rm\s+-rf\s+\//i, /:\s*\(\)\s*\{\s*:\s*\|\s*:/, /mkfs\./i, /\bdd\s+if=.*\bof=\/dev\//i, /\bshutdown\b|\breboot\b/i, />\s*\/dev\/sd[a-z]/i];

function err(message) { throw new Error(message); }
function workspaceRoot(workspace) {
  const candidate = path.resolve(workspace || DEFAULT_ROOT || '');
  if (!candidate || !ROOTS.some(root => candidate === root || candidate.startsWith(root + path.sep))) err('Workspace is outside configured MICODE_WORKSPACES. Configure an allowed root first.');
  return candidate;
}
function safePath(workspace, relativePath) {
  const root = workspaceRoot(workspace);
  if (typeof relativePath !== 'string' || !relativePath.trim()) err('path is required');
  const target = path.resolve(root, relativePath);
  if (target !== root && !target.startsWith(root + path.sep)) err('Path traversal blocked');
  return { root, target };
}
async function ensureNoSymlinkEscape(root, target) {
  let cur = target;
  while (cur !== root && cur.startsWith(root + path.sep)) {
    try {
      const st = await fsp.lstat(cur);
      if (st.isSymbolicLink()) {
        const real = await fsp.realpath(cur);
        if (real !== root && !real.startsWith(root + path.sep)) err('Symlink escapes workspace root');
      }
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
    cur = path.dirname(cur);
  }
}
function textResult(value) { return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] }; }
function getWorkspace(a) { return workspaceRoot(a.workspace); }
async function walk(root, dir, out, opts = {}) {
  if (out.length >= (opts.limit || 2000)) return;
  let entries; try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const ent of entries) {
    if (out.length >= (opts.limit || 2000)) break;
    if (['.git', 'node_modules', '.next', 'dist', 'build', '.venv', '__pycache__'].includes(ent.name) && !opts.includeIgnored) continue;
    const full = path.join(dir, ent.name); const rel = path.relative(root, full);
    if (ent.isDirectory()) { out.push({ path: rel + '/', type: 'directory' }); await walk(root, full, out, opts); }
    else if (ent.isFile()) out.push({ path: rel, type: 'file', size: (await fsp.stat(full)).size });
  }
}
function sshArgs(host, command, cwd) {
  if (!/^[a-zA-Z0-9_.@:-]+$/.test(host || '')) err('Invalid SSH host alias. Use an alias configured in ~/.ssh/config.');
  const remote = `cd ${quotePosix(cwd || '.') } && ${command}`;
  return ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', host, remote];
}
function quotePosix(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }
function runProcess(bin, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd: opts.cwd, env: process.env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timedOut = false;
    child.stdout.on('data', d => { if (stdout.length < MAX_OUTPUT) stdout += d.toString().slice(0, MAX_OUTPUT - stdout.length); });
    child.stderr.on('data', d => { if (stderr.length < MAX_OUTPUT) stderr += d.toString().slice(0, MAX_OUTPUT - stderr.length); });
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 1500).unref(); }, Math.min(Math.max(opts.timeout || 30000, 1000), MAX_TIMEOUT));
    child.on('error', e => { clearTimeout(timer); reject(e); });
    child.on('close', code => { clearTimeout(timer); resolve({ exit_code: code, stdout, stderr, timed_out: timedOut }); });
  });
}
const tools = [
  { name:'list_workspaces', description:'List configured local project roots.', inputSchema:{type:'object',properties:{},additionalProperties:false} },
  { name:'list_files', description:'List files and directories in a local workspace. Skips common generated/dependency directories by default.', inputSchema:{type:'object',properties:{workspace:{type:'string'},path:{type:'string',default:'.'},limit:{type:'integer',minimum:1,maximum:5000},include_ignored:{type:'boolean'}},additionalProperties:false} },
  { name:'read_file', description:'Read a UTF-8 text file (up to 1 MiB) inside a configured workspace.', inputSchema:{type:'object',properties:{workspace:{type:'string'},path:{type:'string'}},required:['path'],additionalProperties:false} },
  { name:'read_multiple_files', description:'Read several UTF-8 files from one workspace.', inputSchema:{type:'object',properties:{workspace:{type:'string'},paths:{type:'array',items:{type:'string'},minItems:1,maxItems:20}},required:['paths'],additionalProperties:false} },
  { name:'write_file', description:'Create or overwrite a UTF-8 file inside a workspace. Use only after reviewing intended changes.', inputSchema:{type:'object',properties:{workspace:{type:'string'},path:{type:'string'},content:{type:'string'},create_directories:{type:'boolean',default:true}},required:['path','content'],additionalProperties:false} },
  { name:'update_file', description:'Replace an exact text occurrence in a UTF-8 file. Set replace_all for multiple matches.', inputSchema:{type:'object',properties:{workspace:{type:'string'},path:{type:'string'},old_text:{type:'string'},new_text:{type:'string'},replace_all:{type:'boolean'}},required:['path','old_text','new_text'],additionalProperties:false} },
  { name:'delete_file', description:'Delete one file inside a workspace. Never use for broad cleanup; confirm with the user first.', inputSchema:{type:'object',properties:{workspace:{type:'string'},path:{type:'string'},confirm:{type:'boolean'}},required:['path','confirm'],additionalProperties:false} },
  { name:'create_directory', description:'Create a directory inside a workspace.', inputSchema:{type:'object',properties:{workspace:{type:'string'},path:{type:'string'}},required:['path'],additionalProperties:false} },
  { name:'move_path', description:'Move or rename a file or directory within the same workspace.', inputSchema:{type:'object',properties:{workspace:{type:'string'},from:{type:'string'},to:{type:'string'},confirm:{type:'boolean'}},required:['from','to','confirm'],additionalProperties:false} },
  { name:'search_files', description:'Find file paths by case-insensitive glob-like substring or regular expression.', inputSchema:{type:'object',properties:{workspace:{type:'string'},query:{type:'string'},regex:{type:'boolean'},limit:{type:'integer',minimum:1,maximum:1000}},required:['query'],additionalProperties:false} },
  { name:'search_content', description:'Search text files for a literal string or regular expression; skips binary and generated directories.', inputSchema:{type:'object',properties:{workspace:{type:'string'},query:{type:'string'},regex:{type:'boolean'},case_sensitive:{type:'boolean'},limit:{type:'integer',minimum:1,maximum:1000}},required:['query'],additionalProperties:false} },
  { name:'execute_command', description:'Run a command in a local workspace without a shell. Commands with shell metacharacters are rejected; use explicit executables and argument arrays. Destructive/production commands require user approval.', inputSchema:{type:'object',properties:{workspace:{type:'string'},command:{type:'string'},args:{type:'array',items:{type:'string'}},timeout_ms:{type:'integer',minimum:1000,maximum:120000}},required:['command'],additionalProperties:false} },
  { name:'git_status', description:'Show Git status for a local workspace.', inputSchema:{type:'object',properties:{workspace:{type:'string'}},additionalProperties:false} },
  { name:'git_diff', description:'Show Git diff, optionally for a specific path.', inputSchema:{type:'object',properties:{workspace:{type:'string'},path:{type:'string'},staged:{type:'boolean'}},additionalProperties:false} },
  { name:'git_log', description:'Show recent Git commits.', inputSchema:{type:'object',properties:{workspace:{type:'string'},limit:{type:'integer',minimum:1,maximum:100}},additionalProperties:false} },
  { name:'ssh_execute', description:'Run a command on a VPS through an SSH host alias in ~/.ssh/config. Remote cwd must be an absolute path. Use read-only commands first; obtain explicit approval before changing remote files or services.', inputSchema:{type:'object',properties:{host:{type:'string'},remote_path:{type:'string'},command:{type:'string'},timeout_ms:{type:'integer',minimum:1000,maximum:120000}},required:['host','remote_path','command'],additionalProperties:false} },
  { name:'ssh_list_files', description:'List files on a VPS using SSH. Host must be an alias in ~/.ssh/config; path must be absolute.', inputSchema:{type:'object',properties:{host:{type:'string'},remote_path:{type:'string'},limit:{type:'integer',minimum:1,maximum:1000}},required:['host','remote_path'],additionalProperties:false} },
  { name:'ssh_read_file', description:'Read a text file on a VPS using SSH (limited output).', inputSchema:{type:'object',properties:{host:{type:'string'},remote_path:{type:'string'}},required:['host','remote_path'],additionalProperties:false} },
  { name:'ssh_write_file', description:'Write a text file on a VPS over SSH using stdin. Requires confirm=true after explicit user approval.', inputSchema:{type:'object',properties:{host:{type:'string'},remote_path:{type:'string'},content:{type:'string'},confirm:{type:'boolean'}},required:['host','remote_path','content','confirm'],additionalProperties:false} }
];

async function call(name, a) {
  if (name === 'list_workspaces') return textResult(ROOTS.map(root => ({path:root, exists:fs.existsSync(root)})));
  if (name === 'list_files') { const root=getWorkspace(a); const {target}=safePath(root,a.path||'.'); await ensureNoSymlinkEscape(root,target); const out=[]; await walk(root,target,out,{limit:a.limit||500,includeIgnored:!!a.include_ignored}); return textResult(out); }
  if (name === 'read_file') { const {root,target}=safePath(a.workspace,a.path); await ensureNoSymlinkEscape(root,target); const st=await fsp.stat(target); if(st.size>MAX_READ) err('File exceeds 1 MiB; use a targeted search or a smaller file.'); return textResult(await fsp.readFile(target,'utf8')); }
  if (name === 'read_multiple_files') { const root=getWorkspace(a), out={}; for(const p of a.paths){const {target}=safePath(root,p); await ensureNoSymlinkEscape(root,target); const st=await fsp.stat(target); if(st.size>MAX_READ) {out[p]='[Skipped: exceeds 1 MiB]';continue;} out[p]=await fsp.readFile(target,'utf8');} return textResult(out); }
  if (name === 'write_file') { const {root,target}=safePath(a.workspace,a.path); await ensureNoSymlinkEscape(root,target); if(a.create_directories!==false) await fsp.mkdir(path.dirname(target),{recursive:true}); await fsp.writeFile(target,a.content,{encoding:'utf8',flag:'w'}); return textResult({written:a.path,bytes:Buffer.byteLength(a.content)}); }
  if (name === 'update_file') { const {root,target}=safePath(a.workspace,a.path); await ensureNoSymlinkEscape(root,target); let s=await fsp.readFile(target,'utf8'); if(!a.old_text) err('old_text cannot be empty'); if(!s.includes(a.old_text)) err('old_text was not found; file left unchanged'); const count=s.split(a.old_text).length-1; if(count>1&&!a.replace_all) err(`Found ${count} matches; set replace_all=true or provide a more specific old_text.`); s=a.replace_all?s.split(a.old_text).join(a.new_text):s.replace(a.old_text,a.new_text); await fsp.writeFile(target,s,'utf8'); return textResult({updated:a.path,replacements:a.replace_all?count:1}); }
  if (name === 'delete_file') { if(a.confirm!==true) err('Deletion requires confirm=true after explicit user approval.'); const {root,target}=safePath(a.workspace,a.path); await ensureNoSymlinkEscape(root,target); const st=await fsp.lstat(target); if(!st.isFile()) err('delete_file only deletes regular files; directories are not supported.'); await fsp.unlink(target); return textResult({deleted:a.path}); }
  if (name === 'create_directory') { const {root,target}=safePath(a.workspace,a.path); await ensureNoSymlinkEscape(root,target); await fsp.mkdir(target,{recursive:true}); return textResult({created:a.path}); }
  if (name === 'move_path') { if(a.confirm!==true) err('Move/rename requires confirm=true after explicit user approval.'); const {root,target:src}=safePath(a.workspace,a.from), {target:dst}=safePath(root,a.to); await ensureNoSymlinkEscape(root,src); await ensureNoSymlinkEscape(root,dst); await fsp.mkdir(path.dirname(dst),{recursive:true}); await fsp.rename(src,dst); return textResult({moved:a.from,to:a.to}); }
  if (name === 'search_files' || name === 'search_content') { const root=getWorkspace(a), files=[]; await walk(root,root,files,{limit:10000}); const re=a.regex?new RegExp(a.query,a.case_sensitive?'':'i'):null; const matches=[]; for(const f of files){if(f.type!=='file')continue; if(name==='search_files'){const ok=re?re.test(f.path):f.path.toLowerCase().includes(a.query.toLowerCase()); if(ok)matches.push(f.path);} else {const {target}=safePath(root,f.path); if(f.size>512000)continue; let s;try{s=await fsp.readFile(target,'utf8');if(s.includes('\0'))continue;}catch{continue;} const lines=s.split(/\r?\n/); for(let i=0;i<lines.length;i++){let ok;try{ok=re?re.test(lines[i]):(a.case_sensitive?lines[i].includes(a.query):lines[i].toLowerCase().includes(a.query.toLowerCase()));}catch(e){throw new Error('Invalid regular expression: '+e.message);} if(ok){matches.push({path:f.path,line:i+1,text:lines[i].slice(0,500)});if(matches.length>=(a.limit||100))break;}}} if(matches.length>=(a.limit||100))break;} return textResult(matches); }
  if (name === 'execute_command') { const root=getWorkspace(a), cmd=a.command; if(!/^[a-zA-Z0-9_./-]+$/.test(cmd)) err('Use a simple executable name/path and pass arguments separately; shell syntax is disabled.'); const args=a.args||[]; if(args.some(x=>typeof x!=='string'))err('All args must be strings'); const joined=[cmd,...args].join(' '); if(BLOCKED.some(r=>r.test(joined)))err('Potentially destructive command blocked by MiCode safety policy.'); return textResult(await runProcess(cmd,args,{cwd:root,timeout:a.timeout_ms||30000})); }
  if (name === 'git_status' || name === 'git_diff' || name === 'git_log') { const root=getWorkspace(a); let args=['status','--short','--branch']; if(name==='git_diff') args=a.staged?['diff','--cached']:['diff']; if(name==='git_diff'&&a.path)args.push('--',a.path); if(name==='git_log')args=['log','-n',String(Math.min(Math.max(a.limit||10,1),100)),'--oneline','--decorate']; return textResult(await runProcess('git',args,{cwd:root,timeout:30000})); }
  if (name === 'ssh_execute') { if(!path.isAbsolute(a.remote_path))err('remote_path must be absolute'); if(/[\n\r]/.test(a.command))err('Multiline remote commands are not accepted.'); if(BLOCKED.some(r=>r.test(a.command)))err('Potentially destructive remote command blocked.'); return textResult(await runProcess('ssh',sshArgs(a.host,a.command,a.remote_path),{timeout:a.timeout_ms||30000})); }
  if (name === 'ssh_list_files') { if(!path.isAbsolute(a.remote_path))err('remote_path must be absolute'); const n=Math.min(Math.max(a.limit||300,1),1000); const cmd=`find . -maxdepth 4 -mindepth 1 -printf '%y %p\\n' | head -n ${n}`; return textResult(await runProcess('ssh',sshArgs(a.host,cmd,a.remote_path),{timeout:30000})); }
  if (name === 'ssh_read_file') { if(!path.isAbsolute(a.remote_path))err('remote_path must be absolute'); return textResult(await runProcess('ssh',['-o','BatchMode=yes','-o','ConnectTimeout=10',a.host,`cat -- ${quotePosix(a.remote_path)}`],{timeout:30000})); }
  if (name === 'ssh_write_file') { if(a.confirm!==true)err('Remote writes require confirm=true after explicit user approval.'); if(!path.isAbsolute(a.remote_path))err('remote_path must be absolute'); const b=Buffer.from(a.content).toString('base64'); const cmd=`printf %s ${quotePosix(b)} | base64 -d > ${quotePosix(a.remote_path)}`; return textResult(await runProcess('ssh',['-o','BatchMode=yes','-o','ConnectTimeout=10',a.host,cmd],{timeout:30000})); }
  err('Unknown tool: '+name);
}

function send(obj) { process.stdout.write(JSON.stringify(obj)+'\n'); }
const rl=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
rl.on('line', async line => {
  let msg; try { msg=JSON.parse(line); } catch { return; }
  if (!msg || typeof msg !== 'object') return;
  if (msg.method === 'notifications/initialized' || msg.method?.startsWith('notifications/')) return;
  const id=msg.id;
  try {
    let result;
    if(msg.method==='initialize') result={protocolVersion:msg.params?.protocolVersion||'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'micode',version:'0.1.0'}};
    else if(msg.method==='ping') result={};
    else if(msg.method==='tools/list') result={tools};
    else if(msg.method==='tools/call') { const a=msg.params?.arguments||{}; try {result=await call(msg.params?.name,a);} catch(e){result={content:[{type:'text',text:e.message}],isError:true};} }
    else if(msg.method==='resources/list') result={resources:[]};
    else if(msg.method==='prompts/list') result={prompts:[]};
    else throw new Error('Method not found: '+msg.method);
    if(id!==undefined)send({jsonrpc:'2.0',id,result});
  } catch(e) { if(id!==undefined)send({jsonrpc:'2.0',id,error:{code:-32603,message:e.message}}); }
});
