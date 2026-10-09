// Persistent conversion queue in IndexedDB. Input videos and finished MP3s are stored
// as Blobs so the queue survives reloads, app restarts and Android killing the tab.

export type JobStatus =
  | "queued"
  | "converting"
  | "paused"
  | "interrupted"
  | "resuming"
  | "completed"
  | "failed"
  | "cancelled";

export interface JobRecord {
  id: string;
  name: string;
  size: number;
  ext: string;
  outName: string;
  status: JobStatus;
  progress: number;
  error?: string;
  attempts: number;
  createdAt: number;
  input?: Blob; // removed once a valid MP3 is stored
  output?: Blob; // only set together with status "completed"
}

const DB = "v2mp3";
const STORE = "jobs";
let dbp: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbp = null;
        reject(req.error);
      };
    });
  }
  return dbp;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const t = d.transaction(STORE, mode);
        const r = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(r ? (r.result as T) : (undefined as T));
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

export const getAllJobs = () =>
  tx<JobRecord[]>("readonly", (s) => s.getAll()).then((r) => r.sort((a, b) => a.createdAt - b.createdAt));
export const getJob = (id: string) => tx<JobRecord | undefined>("readonly", (s) => s.get(id));
export const putJob = (j: JobRecord) => tx("readwrite", (s) => void s.put(j));
export const deleteJob = (id: string) => tx("readwrite", (s) => void s.delete(id));
export const clearJobs = () => tx("readwrite", (s) => void s.clear());

/** Atomically patch metadata (never touches blobs unless given). */
export async function patchJob(id: string, patch: Partial<JobRecord>) {
  const d = await db();
  return new Promise<void>((resolve, reject) => {
    const t = d.transaction(STORE, "readwrite");
    const s = t.objectStore(STORE);
    const g = s.get(id);
    g.onsuccess = () => {
      if (g.result) s.put({ ...g.result, ...patch });
    };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

/** True if bytes start with an ID3 tag or an MPEG audio frame sync. */
export function looksLikeMp3(b: Uint8Array) {
  if (b.length < 128) return false;
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return true;
  return b[0] === 0xff && (b[1]! & 0xe0) === 0xe0;
}
