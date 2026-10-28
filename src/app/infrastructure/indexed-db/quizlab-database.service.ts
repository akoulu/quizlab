import { Injectable } from '@angular/core';

import { openQuizLabDatabase } from './quizlab.database';

@Injectable({ providedIn: 'root' })
export class QuizLabDatabaseService {
  private databasePromise: Promise<IDBDatabase> | null = null;

  getDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) {
      return this.databasePromise;
    }

    const connection = openQuizLabDatabase()
      .then((db) => {
        db.onversionchange = () => {
          db.close();

          if (this.databasePromise === connection) {
            this.databasePromise = null;
          }
        };

        return db;
      })
      .catch((error: unknown) => {
        if (this.databasePromise === connection) {
          this.databasePromise = null;
        }

        throw error;
      });

    this.databasePromise = connection;

    return connection;
  }
}
