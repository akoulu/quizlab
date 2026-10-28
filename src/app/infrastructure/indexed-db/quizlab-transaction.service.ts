import { Injectable } from '@angular/core';

import { QuizLabDatabaseService } from './quizlab-database.service';
import { transactionToPromise } from './indexed-db.helpers';

@Injectable({ providedIn: 'root' })
export class QuizLabTransactionService {
  constructor(private readonly databaseService: QuizLabDatabaseService) {}

  async run(
    storeNames: readonly string[],
    mode: IDBTransactionMode,
    operation: (transaction: IDBTransaction) => void,
  ): Promise<void> {
    if (storeNames.length === 0) {
      throw new Error('At least one object store is required for a transaction.');
    }

    const db = await this.databaseService.getDatabase();
    const transaction = db.transaction([...storeNames], mode);
    const completed = transactionToPromise(transaction);

    try {
      operation(transaction);
    } catch (error: unknown) {
      try {
        transaction.abort();
      } catch {
        // The transaction may already be inactive.
      }

      try {
        await completed;
      } catch {
        // Preserve the original operation error.
      }

      throw error;
    }

    await completed;
  }
}
