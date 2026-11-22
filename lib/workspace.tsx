import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { GitHubRepository } from '@/lib/github';

export type Project = {
  id: string;
  name: string;
  prompt: string;
  visibility: 'Private' | 'Public';
  repo: string | null;
  status: 'Draft' | 'In progress' | 'Ready';
  createdAt: string;
  updatedAt: string;
};

export type ActivityEvent = {
  id: string;
  title: string;
  detail: string;
  projectId?: string;
  projectName?: string;
  kind: 'created' | 'prompt' | 'updated';
  createdAt: string;
};

type WorkspaceValue = {
  projects: Project[];
  events: ActivityEvent[];
  hydrated: boolean;
  createProject: (input: { name: string; prompt: string; visibility: 'Private' | 'Public' }) => Promise<Project>;
  addActivity: (event: Omit<ActivityEvent, 'id' | 'createdAt'>) => Promise<void>;
  clearActivity: () => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  importRepository: (repo: GitHubRepository) => Promise<Project>;
  linkRepository: (id: string, repo: GitHubRepository) => Promise<void>;
};

const PROJECTS_KEY = '@micode/projects:v1';
const ACTIVITY_KEY = '@micode/activity:v1';
const WorkspaceContext = createContext<WorkspaceValue | null>(null);

const seedProjects: Project[] = [];
const seedEvents: ActivityEvent[] = [];

export function WorkspaceProvider({ children }: React.PropsWithChildren) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const projectsRef = useRef<Project[]>([]);
  const eventsRef = useRef<ActivityEvent[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [savedProjects, savedEvents] = await Promise.all([
          AsyncStorage.getItem(PROJECTS_KEY),
          AsyncStorage.getItem(ACTIVITY_KEY),
        ]);
        if (!alive) return;
        const loadedProjects = savedProjects ? JSON.parse(savedProjects) as Project[] : seedProjects;
        const loadedEvents = savedEvents ? JSON.parse(savedEvents) as ActivityEvent[] : seedEvents;
        projectsRef.current = loadedProjects;
        eventsRef.current = loadedEvents;
        setProjects(loadedProjects);
        setEvents(loadedEvents);
      } catch {
        if (alive) {
          projectsRef.current = seedProjects;
          eventsRef.current = seedEvents;
          setProjects(seedProjects);
          setEvents(seedEvents);
        }
      } finally {
        if (alive) setHydrated(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  const persistProjects = useCallback(async (next: Project[]) => {
    projectsRef.current = next;
    setProjects(next);
    await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
  }, []);

  const persistEvents = useCallback(async (next: ActivityEvent[]) => {
    eventsRef.current = next;
    setEvents(next);
    await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
  }, []);

  const addActivity = useCallback(async (input: Omit<ActivityEvent, 'id' | 'createdAt'>) => {
    const event: ActivityEvent = { ...input, id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString() };
    await persistEvents([event, ...eventsRef.current].slice(0, 100));
  }, [persistEvents]);

  const clearActivity = useCallback(async () => { await persistEvents([]); }, [persistEvents]);

  const createProject = useCallback(async (input: { name: string; prompt: string; visibility: 'Private' | 'Public' }) => {
    const now = new Date().toISOString();
    const project: Project = { id: `project-${Date.now()}`, ...input, repo: null, status: 'Draft', createdAt: now, updatedAt: now };
    await persistProjects([project, ...projectsRef.current]);
    await addActivity({ title: 'Project created', detail: input.prompt ? 'Created a new project from your idea.' : 'Created a new project workspace.', projectId: project.id, projectName: project.name, kind: 'created' });
    return project;
  }, [persistProjects, addActivity]);

  const renameProject = useCallback(async (id: string, name: string) => {
    const next = projectsRef.current.map(project => project.id === id ? { ...project, name, updatedAt: new Date().toISOString() } : project);
    await persistProjects(next);
    const updated = next.find(project => project.id === id);
    if (updated) await addActivity({ title: 'Project renamed', detail: `Project renamed to ${name}.`, projectId: id, projectName: name, kind: 'updated' });
  }, [persistProjects, addActivity]);

  const deleteProject = useCallback(async (id: string) => {
    const removed = projectsRef.current.find(project => project.id === id);
    await persistProjects(projectsRef.current.filter(project => project.id !== id));
    if (removed) await addActivity({ title: 'Project deleted', detail: 'Removed this project from this device.', projectName: removed.name, kind: 'updated' });
  }, [persistProjects, addActivity]);

  const importRepository = useCallback(async (repo: GitHubRepository) => {
    const existing = projectsRef.current.find(project => project.repo === repo.full_name);
    if (existing) return existing;
    const now = new Date().toISOString();
    const project: Project = { id: `github-${repo.id}`, name: repo.name, prompt: repo.description || '', visibility: repo.private ? 'Private' : 'Public', repo: repo.full_name, status: 'In progress', createdAt: now, updatedAt: repo.updated_at || now };
    await persistProjects([project, ...projectsRef.current]);
    await addActivity({ title: 'GitHub repository imported', detail: `Imported ${repo.full_name} into this workspace.`, projectId: project.id, projectName: project.name, kind: 'created' });
    return project;
  }, [persistProjects, addActivity]);

  const linkRepository = useCallback(async (id: string, repo: GitHubRepository) => {
    const next = projectsRef.current.map(project => project.id === id ? { ...project, repo: repo.full_name, visibility: repo.private ? 'Private' as const : 'Public' as const, status: 'In progress' as const, updatedAt: new Date().toISOString() } : project);
    await persistProjects(next);
    await addActivity({ title: 'GitHub repository connected', detail: `Connected ${repo.full_name}.`, projectId: id, projectName: next.find(project => project.id === id)?.name, kind: 'updated' });
  }, [persistProjects, addActivity]);

  const value = useMemo(() => ({ projects, events, hydrated, createProject, addActivity, clearActivity, renameProject, deleteProject, importRepository, linkRepository }), [projects, events, hydrated, createProject, addActivity, clearActivity, renameProject, deleteProject, importRepository, linkRepository]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return value;
}
