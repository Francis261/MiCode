import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'micode.github.pat.v1';
const API = 'https://api.github.com';

export type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  updated_at: string;
  language: string | null;
  owner: { login: string; avatar_url?: string };
};

export type GitHubContent = {
  name: string;
  path: string;
  sha: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  size: number;
  html_url: string;
  download_url: string | null;
};

export async function getGitHubToken() {
  if (Platform.OS === 'web') throw new Error('GitHub token storage is supported in the Android and iOS apps, not in a browser.');
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function githubRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getGitHubToken();
  if (!token) throw new Error('Connect your GitHub token in Settings first.');
  const response = await fetch(path.startsWith('http') ? path : API + path, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    let message = `GitHub request failed (${response.status}).`;
    try { const body = await response.json(); if (body.message) message = body.message; } catch {}
    if (response.status === 401) message = 'Your GitHub token is invalid or expired. Reconnect it in Settings.';
    if (response.status === 403) message = 'GitHub denied this action. Check token permissions, rate limits, and organization approval.';
    if (response.status === 404) message = 'GitHub could not find this repository or file. Check repository access.';
    if (response.status === 409) message = 'The repository changed on GitHub. Reload the file and try again.';
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function listGitHubRepositories(page = 1): Promise<GitHubRepository[]> {
  return githubRequest<GitHubRepository[]>(`/user/repos?sort=updated&per_page=50&page=${page}&affiliation=owner,collaborator,organization_member`);
}

export async function createGitHubRepository(input: { name: string; description?: string; isPrivate: boolean }): Promise<GitHubRepository> {
  return githubRequest<GitHubRepository>('/user/repos', {
    method: 'POST',
    body: JSON.stringify({ name: input.name, description: input.description || '', private: input.isPrivate, auto_init: true }),
  });
}

export async function listRepositoryContents(owner: string, repo: string, path = ''): Promise<GitHubContent[]> {
  const safePath = path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  const result = await githubRequest<GitHubContent | GitHubContent[]>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${safePath}`);
  return Array.isArray(result) ? result : [result];
}

export async function readRepositoryFile(owner: string, repo: string, path: string): Promise<string> {
  const safePath = path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  const file = await githubRequest<{ download_url: string | null }>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${safePath}`);
  if (!file.download_url) throw new Error('GitHub did not provide a downloadable file URL.');
  const response = await fetch(file.download_url);
  if (!response.ok) throw new Error('Could not download this repository file.');
  return response.text();
}

function encodeBase64Utf8(value: string) {
  const binary = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_match, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  return btoa(binary);
}

export async function saveRepositoryFile(owner: string, repo: string, path: string, content: string, message: string) {
  const safePath = path.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  const current = await githubRequest<{ sha: string }>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${safePath}`);
  return githubRequest<{ commit: { sha: string; html_url: string } }>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${safePath}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: encodeBase64Utf8(content), sha: current.sha }),
  });
}
