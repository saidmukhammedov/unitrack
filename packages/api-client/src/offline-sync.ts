import type {
  SyncMutation,
  BatchSyncRequest,
  BatchSyncResponse,
  SyncConflict,
} from '@unitrack/contracts';
import type { UniTrackApiClient } from './index';

export interface OfflineStorageAdapter {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

export class MemoryOfflineAdapter implements OfflineStorageAdapter {
  private storage = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }
}

export class LocalStorageOfflineAdapter implements OfflineStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  }
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  conflicts: SyncConflict[];
  lastError: string | null;
}

export type SyncStateListener = (state: SyncState) => void;

export interface OfflineSyncEngineConfig {
  api: UniTrackApiClient;
  storage?: OfflineStorageAdapter;
  storageKey?: string;
  autoSyncOnReconnect?: boolean;
}

export class OfflineSyncEngine {
  private api: UniTrackApiClient;
  private storage: OfflineStorageAdapter;
  private storageKey: string;
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private lastSyncedAt: string | null = null;
  private conflicts: SyncConflict[] = [];
  private lastError: string | null = null;
  private listeners = new Set<SyncStateListener>();
  private queue: SyncMutation[] = [];
  private initialized: boolean = false;

  constructor(config: OfflineSyncEngineConfig) {
    this.api = config.api;
    this.storage =
      config.storage ||
      (typeof window !== 'undefined' && window.localStorage
        ? new LocalStorageOfflineAdapter()
        : new MemoryOfflineAdapter());
    this.storageKey = config.storageKey || 'unitrack_offline_sync_queue';

    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine ?? true;
      if (config.autoSyncOnReconnect !== false) {
        window.addEventListener('online', () => {
          this.setOnline(true);
        });
        window.addEventListener('offline', () => {
          this.setOnline(false);
        });
      }
    }
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const raw = await this.storage.getItem(this.storageKey);
      if (raw) {
        this.queue = JSON.parse(raw);
      }
      const rawSyncTime = await this.storage.getItem(`${this.storageKey}_last_time`);
      if (rawSyncTime) {
        this.lastSyncedAt = rawSyncTime;
      }
    } catch {
      this.queue = [];
    }
    this.initialized = true;
    this.notifyState();
  }

  private async persistQueue(): Promise<void> {
    try {
      await this.storage.setItem(this.storageKey, JSON.stringify(this.queue));
      if (this.lastSyncedAt) {
        await this.storage.setItem(`${this.storageKey}_last_time`, this.lastSyncedAt);
      }
    } catch {
      // Storage write error handled gracefully
    }
  }

  getState(): SyncState {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.queue.length,
      lastSyncedAt: this.lastSyncedAt,
      conflicts: [...this.conflicts],
      lastError: this.lastError,
    };
  }

  subscribe(listener: SyncStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notifyState(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch {
        // Safe dispatch
      }
    });
  }

  setOnline(online: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = online;
    this.notifyState();
    if (online && wasOffline && this.queue.length > 0) {
      this.sync().catch(() => {});
    }
  }

  async enqueueMutation(
    mutation: Omit<SyncMutation, 'clientMutationId' | 'clientTimestamp'>
  ): Promise<SyncMutation> {
    await this.init();

    const fullMutation: SyncMutation = {
      ...mutation,
      clientMutationId: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      clientTimestamp: new Date().toISOString(),
    };

    this.queue.push(fullMutation);
    await this.persistQueue();
    this.notifyState();

    // If online, immediately attempt synchronization
    if (this.isOnline && !this.isSyncing) {
      this.sync().catch(() => {});
    }

    return fullMutation;
  }

  getPendingMutations(): SyncMutation[] {
    return [...this.queue];
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.persistQueue();
    this.notifyState();
  }

  private syncPromise: Promise<BatchSyncResponse | null> | null = null;

  async sync(): Promise<BatchSyncResponse | null> {
    await this.init();

    if (!this.isOnline) {
      return null;
    }

    if (this.syncPromise) {
      return this.syncPromise;
    }

    this.syncPromise = this.executeSync().finally(() => {
      this.syncPromise = null;
    });

    return this.syncPromise;
  }

  private async executeSync(): Promise<BatchSyncResponse | null> {
    this.isSyncing = true;
    this.lastError = null;
    this.notifyState();

    try {
      const payload: BatchSyncRequest = {
        lastSyncTimestamp: this.lastSyncedAt || undefined,
        mutations: [...this.queue],
      };

      const response = await this.api.batchSync(payload);

      // Remove successfully processed mutations
      const processedSet = new Set(response.processedMutationIds);
      this.queue = this.queue.filter((m) => !processedSet.has(m.clientMutationId));

      // Record conflicts
      if (response.conflicts && response.conflicts.length > 0) {
        this.conflicts = [...response.conflicts];
      }

      this.lastSyncedAt = response.serverTimestamp;
      await this.persistQueue();

      return response;
    } catch (err: any) {
      this.lastError = err.message || 'Sync failed';
      throw err;
    } finally {
      this.isSyncing = false;
      this.notifyState();
    }
  }
}
