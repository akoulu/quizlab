import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {
  ATTEMPT_REPOSITORY,
  QUIZ_CONTENT_REPOSITORY,
  QUESTION_REPOSITORY,
  QUIZ_REPOSITORY,
} from './application/repository.tokens';
import { IndexedDbAttemptRepository } from './infrastructure/indexed-db/indexed-db-attempt.repository';
import { IndexedDbQuizContentRepository } from './infrastructure/indexed-db/indexed-db-quiz-content.repository';
import { IndexedDbQuestionRepository } from './infrastructure/indexed-db/indexed-db-question.repository';
import { IndexedDbQuizRepository } from './infrastructure/indexed-db/indexed-db-quiz.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    {
      provide: QUIZ_REPOSITORY,
      useExisting: IndexedDbQuizRepository,
    },
    {
      provide: QUESTION_REPOSITORY,
      useExisting: IndexedDbQuestionRepository,
    },
    {
      provide: QUIZ_CONTENT_REPOSITORY,
      useExisting: IndexedDbQuizContentRepository,
    },
    {
      provide: ATTEMPT_REPOSITORY,
      useExisting: IndexedDbAttemptRepository,
    },
  ],
};
