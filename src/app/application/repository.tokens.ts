import { InjectionToken } from '@angular/core';

import type { QuizRepository } from '../domain/quiz.repository';
import type { QuestionRepository } from '../domain/question.repository';
import type { AttemptRepository } from '../domain/attempt.repository';
import type { QuizContentRepository } from '../domain/quiz-content.repository';

export const QUIZ_REPOSITORY = new InjectionToken<QuizRepository>('QUIZ_REPOSITORY');

export const QUESTION_REPOSITORY = new InjectionToken<QuestionRepository>('QUESTION_REPOSITORY');

export const ATTEMPT_REPOSITORY = new InjectionToken<AttemptRepository>('ATTEMPT_REPOSITORY');

export const QUIZ_CONTENT_REPOSITORY = new InjectionToken<QuizContentRepository>(
  'QUIZ_CONTENT_REPOSITORY',
);
