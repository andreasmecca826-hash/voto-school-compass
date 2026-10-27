const DB_NAME = "voto-music";
const STORE_NAME = "tracks";
const TRACK_KEY = "selected";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Impossibile aprire lo storage musicale."));
  });
}

export async function saveLocalTrack(file: File): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(file, TRACK_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Impossibile salvare il brano."));
  });
  db.close();
}

export async function loadLocalTrack(): Promise<File | Blob | null> {
  const db = await openDatabase();
  const value = await new Promise<File | Blob | null>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(TRACK_KEY);
    request.onsuccess = () => resolve((request.result as File | Blob | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Impossibile leggere il brano."));
  });
  db.close();
  return value;
}

export async function removeLocalTrack(): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(TRACK_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Impossibile rimuovere il brano."));
  });
  db.close();
}
