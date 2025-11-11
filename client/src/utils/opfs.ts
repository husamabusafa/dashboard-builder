import type { DashboardState } from '../types/types';

type FileHandleWritable = FileSystemFileHandle & { createWritable: () => Promise<FileSystemWritableFileStream> };

const nav = (typeof navigator !== 'undefined' ? (navigator as unknown as Navigator & { storage?: { getDirectory?: () => Promise<FileSystemDirectoryHandle> } }) : undefined);
const OPFS_AVAILABLE = !!(nav?.storage?.getDirectory);

function safeLog(...args: unknown[]) {
  try { console.log('[OPFS][Dashboard]', ...args); } catch { return; }
}
function safeError(...args: unknown[]) {
  try { console.error('[OPFS][Dashboard]', ...args); } catch { return; }
}

async function getRootDir(): Promise<FileSystemDirectoryHandle | null> {
  if (!OPFS_AVAILABLE || !nav?.storage?.getDirectory) return null;
  try {
    const root: FileSystemDirectoryHandle = await nav.storage.getDirectory();
    return root;
  } catch (e) {
    safeError('getRootDir failed', e);
    return null;
  }
}

async function getOrCreateDirectory(parent: FileSystemDirectoryHandle, name: string): Promise<FileSystemDirectoryHandle> {
  return await parent.getDirectoryHandle(name, { create: true });
}

async function getOrCreateFile(parent: FileSystemDirectoryHandle, name: string): Promise<FileSystemFileHandle> {
  return await parent.getFileHandle(name, { create: true });
}

async function fileExists(parent: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await parent.getFileHandle(name, { create: false });
    return true;
  } catch {
    return false;
  }
}

function lsKeyLatest(chatId: string) { return `hsafa:dashboards:${chatId}:latest`; }
function lsKeyVersion(chatId: string, messageId: string) { return `hsafa:dashboards:${chatId}:versions:${messageId}`; }

export type SavedDashboardVersion = {
  chatId: string;
  messageId: string;
  dashboard: DashboardState;
  updatedAt: string;
};

export async function saveDashboardVersion(chatId: string, messageId: string, dashboard: DashboardState): Promise<void> {
  const payload: SavedDashboardVersion = {
    chatId,
    messageId,
    dashboard,
    updatedAt: new Date().toISOString(),
  };

  safeLog('saveDashboardVersion start', { chatId, messageId });

  if (OPFS_AVAILABLE) {
    try {
      const root = await getRootDir();
      if (!root) throw new Error('OPFS root unavailable');
      const dashboards = await getOrCreateDirectory(root, 'dashboards');
      const chatDir = await getOrCreateDirectory(dashboards, chatId);
      const versionsDir = await getOrCreateDirectory(chatDir, 'versions');

      const fileName = `${messageId}.json`;
      const fileHandle = await getOrCreateFile(versionsDir, fileName);
      const writable = await (fileHandle as FileHandleWritable).createWritable();
      await writable.write(new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      await writable.close();

      const latestHandle = await getOrCreateFile(chatDir, 'latest.json');
      const latestWritable = await (latestHandle as FileHandleWritable).createWritable();
      await latestWritable.write(new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      await latestWritable.close();

      safeLog('saveDashboardVersion success (OPFS)', { chatId, messageId });
      return;
    } catch (e) {
      safeError('saveDashboardVersion OPFS failed, falling back to localStorage', e);
    }
  }

  try {
    localStorage.setItem(lsKeyVersion(chatId, messageId), JSON.stringify(payload));
    localStorage.setItem(lsKeyLatest(chatId), JSON.stringify(payload));
    safeLog('saveDashboardVersion success (localStorage)', { chatId, messageId });
  } catch (e) {
    safeError('saveDashboardVersion localStorage failed', e);
  }
}

export async function loadDashboardVersion(chatId: string, messageId: string): Promise<DashboardState | null> {
  safeLog('loadDashboardVersion start', { chatId, messageId });

  if (OPFS_AVAILABLE) {
    try {
      const root = await getRootDir();
      if (!root) throw new Error('OPFS root unavailable');
      const dashboards = await getOrCreateDirectory(root, 'dashboards');
      const chatDir = await getOrCreateDirectory(dashboards, chatId);
      const versionsDir = await getOrCreateDirectory(chatDir, 'versions');
      try {
        const versionHandle = await versionsDir.getFileHandle(`${messageId}.json`, { create: false });
        const file = await versionHandle.getFile();
        const text = await file.text();
        const saved: SavedDashboardVersion = JSON.parse(text);
        safeLog('loadDashboardVersion success (OPFS)', { chatId, messageId });
        return saved?.dashboard || null;
      } catch (e) {
        safeError('loadDashboardVersion version file missing (OPFS)', e);
        // fall through to localStorage below
      }
    } catch (e) {
      safeError('loadDashboardVersion OPFS failed', e);
    }
  }

  try {
    const raw = localStorage.getItem(lsKeyVersion(chatId, messageId));
    if (!raw) return null;
    const saved: SavedDashboardVersion = JSON.parse(raw);
    safeLog('loadDashboardVersion success (localStorage)', { chatId, messageId });
    return saved?.dashboard || null;
  } catch (e) {
    safeError('loadDashboardVersion localStorage failed', e);
    return null;
  }
}

export async function loadLatestDashboard(chatId: string): Promise<DashboardState | null> {
  safeLog('loadLatestDashboard start', { chatId });

  if (OPFS_AVAILABLE) {
    try {
      const root = await getRootDir();
      if (!root) throw new Error('OPFS root unavailable');
      const dashboards = await getOrCreateDirectory(root, 'dashboards');
      const chatDir = await getOrCreateDirectory(dashboards, chatId);
      try {
        const latestHandle = await chatDir.getFileHandle('latest.json', { create: false });
        const file = await latestHandle.getFile();
        const text = await file.text();
        const saved: SavedDashboardVersion = JSON.parse(text);
        safeLog('loadLatestDashboard success (OPFS)', { chatId, messageId: saved?.messageId });
        return saved?.dashboard || null;
      } catch (e) {
        safeError('loadLatestDashboard latest.json missing (OPFS)', e);
        // fall through to localStorage below
      }
    } catch (e) {
      safeError('loadLatestDashboard OPFS failed', e);
    }
  }

  try {
    const raw = localStorage.getItem(lsKeyLatest(chatId));
    if (!raw) return null;
    const saved: SavedDashboardVersion = JSON.parse(raw);
    safeLog('loadLatestDashboard success (localStorage)', { chatId, messageId: saved?.messageId });
    return saved?.dashboard || null;
  } catch (e) {
    safeError('loadLatestDashboard localStorage failed', e);
    return null;
  }
}

export async function hasVersion(chatId: string, messageId: string): Promise<boolean> {
  safeLog('hasVersion start', { chatId, messageId, OPFS_AVAILABLE });
  if (OPFS_AVAILABLE) {
    try {
      const root = await getRootDir();
      if (!root) {
        safeLog('hasVersion OPFS root unavailable, falling back to localStorage', { chatId, messageId });
      } else {
        const dashboards = await getOrCreateDirectory(root, 'dashboards');
        const chatDir = await getOrCreateDirectory(dashboards, chatId);
        const versionsDir = await getOrCreateDirectory(chatDir, 'versions');
        const exists = await fileExists(versionsDir, `${messageId}.json`);
        safeLog('hasVersion (OPFS) exists', { chatId, messageId, exists });
        if (exists) return true;
      }
    } catch (e) {
      safeError('hasVersion OPFS check failed, will try localStorage', e);
    }
  }
  try {
    const exists = localStorage.getItem(lsKeyVersion(chatId, messageId)) != null;
    safeLog('hasVersion (localStorage) exists', { chatId, messageId, exists });
    return exists;
  } catch (e) {
    safeError('hasVersion localStorage check failed', e);
    return false;
  }
}

export async function findMostRecentSavedChatId(): Promise<string | null> {
  if (OPFS_AVAILABLE) {
    try {
      const root = await getRootDir();
      if (!root) throw new Error('OPFS root unavailable');
      const dashboards = await getOrCreateDirectory(root, 'dashboards');
      let bestId: string | null = null;
      let bestTime = 0;
      // @ts-ignore
      for await (const [name, handle] of (dashboards as any).entries?.() ?? []) {
        // @ts-ignore
        if (handle?.kind === 'directory') {
          try {
            // @ts-ignore
            const latestHandle = await (handle as FileSystemDirectoryHandle).getFileHandle('latest.json', { create: false });
            const file = await latestHandle.getFile();
            const text = await file.text();
            const saved: SavedDashboardVersion = JSON.parse(text);
            const t = Date.parse(saved?.updatedAt || '');
            if (!Number.isNaN(t) && t > bestTime) { bestTime = t; bestId = name; }
          } catch (e) {
            continue;
          }
        }
      }
      if (bestId) return bestId;
    } catch (e) {
      safeError('findMostRecentSavedChatId OPFS failed', e);
    }
  }
  try {
    let bestId: string | null = null;
    let bestTime = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith('hsafa:dashboards:') && key.endsWith(':latest')) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const saved: SavedDashboardVersion = JSON.parse(raw);
          const t = Date.parse(saved?.updatedAt || '');
          if (!Number.isNaN(t) && t > bestTime && saved?.chatId) { bestTime = t; bestId = saved.chatId; }
        } catch (e) {
          continue;
        }
      }
    }
    return bestId;
  } catch (e) {
    safeError('findMostRecentSavedChatId localStorage failed', e);
    return null;
  }
}

export async function loadMostRecentDashboard(): Promise<{ chatId: string; dashboard: DashboardState } | null> {
  try {
    const chatId = await findMostRecentSavedChatId();
    if (!chatId) return null;
    const dashboard = await loadLatestDashboard(chatId);
    if (!dashboard) return null;
    return { chatId, dashboard };
  } catch (e) {
    safeError('loadMostRecentDashboard failed', e);
    return null;
  }
}
