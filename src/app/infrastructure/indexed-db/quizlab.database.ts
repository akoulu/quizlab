export const QUIZLAB_DB_NAME = 'quizlab';
export const QUIZLAB_DB_VERSION = 1;

export const QUIZZES_STORE = 'quizzes';
export const QUESTIONS_STORE = 'questions';
export const ATTEMPTS_STORE = 'attempts';

export function openQuizLabDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is unavailable in this environment.'));
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const request = indexedDB.open(QUIZLAB_DB_NAME, QUIZLAB_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(QUIZZES_STORE)) {
        const store = db.createObjectStore(QUIZZES_STORE, {
          keyPath: 'id',
        });

        store.createIndex('source', 'source', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(QUESTIONS_STORE)) {
        const store = db.createObjectStore(QUESTIONS_STORE, {
          keyPath: 'id',
        });

        store.createIndex('quizId', 'quizId', { unique: false });
        store.createIndex('quizCategoryDifficulty', ['quizId', 'category', 'difficulty'], {
          unique: false,
        });
      }

      if (!db.objectStoreNames.contains(ATTEMPTS_STORE)) {
        const store = db.createObjectStore(ATTEMPTS_STORE, {
          keyPath: 'id',
        });

        store.createIndex('quizId', 'quizId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('startedAt', 'startedAt', { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      if (settled) {
        db.close();
        return;
      }

      settled = true;
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onerror = () => {
      if (settled) {
        return;
      }

      settled = true;
      reject(request.error ?? new Error('Failed to open QuizLab database.'));
    };

    request.onblocked = () => {
      if (settled) {
        return;
      }

      settled = true;
      reject(new Error('Opening QuizLab database is blocked by another connection.'));
    };
  });
}
