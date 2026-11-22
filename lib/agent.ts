import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getGitHubToken } from '@/lib/github';

const URL_KEY = 'micode.agent.url.v1';
const TOKEN_KEY = 'micode.agent.token.v1';

export async function getAgentConfig() {
  const baseUrl = await AsyncStorage.getItem(URL_KEY);
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  return { baseUrl: (baseUrl || '').replace(/\/$/, ''), token: token || '' };
}

export async function saveAgentConfig(baseUrl: string, token: string) {
  const clean = baseUrl.trim().replace(/\/$/, '');
  if (!(clean.startsWith('https://') || clean.startsWith('http://'))) throw new Error('Enter a valid server URL beginning with https:// (or http:// for local development).');
  await AsyncStorage.setItem(URL_KEY, clean);
  if (token.trim()) await SecureStore.setItemAsync(TOKEN_KEY, token.trim());
}

async function request<T>(path: string, init: RequestInit = {}) {
  const config = await getAgentConfig();
  if (!config.baseUrl || !config.token) throw new Error('Configure the MiCode agent server in Settings first.');
  const githubToken = await getGitHubToken().catch(() => null);
  const response = await fetch(config.baseUrl + path, {
    ...init,
    headers: {
      authorization: 'Bearer ' + config.token,
      'content-type': 'application/json',
      ...(githubToken ? { 'x-github-token': githubToken } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    let message = 'Agent server request failed (' + response.status + ').';
    try { message = (await response.json()).error || message; } catch {}
    throw new Error(message);
  }
  return response;
}

export async function checkAgentServer() {
  const config = await getAgentConfig();
  if (!config.baseUrl) throw new Error('Enter the agent server URL first.');
  const response = await fetch(config.baseUrl + '/v1/status', { headers: { authorization: 'Bearer ' + config.token } });
  if (!response.ok) throw new Error('Agent server connection or access token is invalid (' + response.status + ').');
  return response.json();
}

export async function installRenewableRuntime(repository: string) {
  const response = await request('/v1/github/install-runtime', { method: 'POST', body: JSON.stringify({ repository }) });
  return response.json() as Promise<{ ok: boolean; repository: string; workflow: string; handoffMinutes: number; files: Array<{ path: string; sha?: string }> }>;
}

export async function createAgentSession(repository: string) {
  const response = await request('/v1/sessions', { method: 'POST', body: JSON.stringify({ repository }) });
  return response.json() as Promise<{ sessionId: string; repository: string }>;
}

export async function publishAgentChanges(sessionId: string, branch?: string) { const response = await request('/v1/sessions/publish', { method: 'POST', body: JSON.stringify({ sessionId, branch }) }); return response.json() as Promise<{ ok: boolean; branch: string; repository: string }>; }

export async function runTerminal(sessionId: string, command: string) {
  const response = await request('/v1/terminal', { method: 'POST', body: JSON.stringify({ sessionId, command }) });
  return response.json() as Promise<{ output: string }>;
}

export async function buildPreview(sessionId: string, buildCommand = 'npm run build') {
  const response = await request('/v1/preview/build', { method: 'POST', body: JSON.stringify({ sessionId, buildCommand }) });
  return response.json() as Promise<{ ok: boolean; output: string; message: string; previewUrl?: string }>;
}

export async function listPullRequests(repository: string) {
  const [owner, repo] = repository.split('/');
  const response = await request('/v1/github/pulls?owner=' + encodeURIComponent(owner) + '&repo=' + encodeURIComponent(repo));
  return response.json() as Promise<Array<{ number: number; title: string; html_url: string; state: string; user: { login: string }; head: { ref: string }; base: { ref: string } }>>;
}

export async function createPullRequest(input: { repository: string; title: string; body: string; head: string; base: string; draft?: boolean }) {
  const response = await request('/v1/github/pulls', { method: 'POST', body: JSON.stringify(input) });
  return response.json() as Promise<{ number: number; html_url: string; title: string }>;
}

export async function listWorkflows(repository: string) {
  const [owner, repo] = repository.split('/');
  const response = await request('/v1/github/actions/workflows?owner=' + encodeURIComponent(owner) + '&repo=' + encodeURIComponent(repo));
  return response.json() as Promise<{ workflows: Array<{ id: number; name: string; path: string; state: string }> }>;
}

export async function dispatchWorkflow(input: { repository: string; workflowId: number; ref: string; inputs?: Record<string, string> }) {
  const response = await request('/v1/github/actions/dispatch', { method: 'POST', body: JSON.stringify(input) });
  return response.json();
}

export async function listWorkflowRuns(repository: string) {
  const [owner, repo] = repository.split('/');
  const response = await request('/v1/github/actions/runs?owner=' + encodeURIComponent(owner) + '&repo=' + encodeURIComponent(repo));
  return response.json() as Promise<{ workflow_runs: Array<{ id: number; name: string; status: string; conclusion: string | null; html_url: string; created_at: string; head_branch: string }> }>;
}

export async function streamAgent(sessionId: string, prompt: string, onEvent: (event: string, data: any) => void) {
  const config = await getAgentConfig();
  if (!config.baseUrl || !config.token) throw new Error('Configure the MiCode agent server in Settings first.');
  const githubToken = await getGitHubToken().catch(() => null);
  const response = await fetch(config.baseUrl + '/v1/agent/stream', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + config.token, 'content-type': 'application/json', ...(githubToken ? { 'x-github-token': githubToken } : {}) },
    body: JSON.stringify({ sessionId, prompt }),
  });
  if (!response.ok) throw new Error((await response.text()).slice(0, 1000) || 'Agent request failed.');
  if (!response.body) throw new Error('Streaming is not supported by this network connection.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() || '';
    for (const frame of frames) {
      const lines = frame.split('\n');
      const event = lines.find(line => line.startsWith('event:'))?.slice(6).trim() || 'message';
      const data = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n');
      if (data) {
        let parsed: any;
        try { parsed = JSON.parse(data); } catch { continue; }
        onEvent(event, parsed);
      }
    }
  }
}
