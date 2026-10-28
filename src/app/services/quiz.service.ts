import { computed, Injectable, signal } from '@angular/core';

import type { CategoryId, DifficultyId, QuizAnswer, QuizQuestion } from '../domain/quiz.types';

import type { QuizResult, QuizSessionState, QuizSettings } from '../domain/quiz.models';

import { QUESTIONS } from '../data/questions';

const DEFAULT_SETTINGS: QuizSettings = {
  category: 'general',
  difficulty: 'easy',
  questionCount: 2,
};

const INITIAL_STATE: QuizSessionState = {
  phase: 'idle',
  settings: DEFAULT_SETTINGS,
  questions: [],
  currentQuestionIndex: 0,
  selectedAnswerId: null,
  answers: [],
  score: 0,
  startedAt: null,
  finishedAt: null,
};

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly stateSignal = signal<QuizSessionState>(INITIAL_STATE);

  readonly state = this.stateSignal.asReadonly();

  readonly currentQuestion = computed<QuizQuestion | null>(() => {
    const state = this.stateSignal();

    return state.questions[state.currentQuestionIndex] ?? null;
  });

  readonly progress = computed(() => {
    const state = this.stateSignal();

    if (state.questions.length === 0) {
      return 0;
    }

    return Math.round(
      ((state.currentQuestionIndex +
        (state.phase === 'answered' || state.phase === 'completed' ? 1 : 0)) /
        state.questions.length) *
        100,
    );
  });

  getAvailableQuestionCount(category: CategoryId, difficulty: DifficultyId): number {
    return QUESTIONS.filter(
      (question) => question.category === category && question.difficulty === difficulty,
    ).length;
  }

  startQuiz(settings: QuizSettings): void {
    const availableQuestions = QUESTIONS.filter(
      (question) =>
        question.category === settings.category && question.difficulty === settings.difficulty,
    );

    if (!Number.isInteger(settings.questionCount) || settings.questionCount < 1) {
      throw new RangeError('Кількість запитань має бути додатним цілим числом.');
    }

    if (settings.questionCount > availableQuestions.length) {
      throw new RangeError(
        `Для вибраних налаштувань доступно лише ${availableQuestions.length} запитань.`,
      );
    }

    const questions = shuffle(availableQuestions)
      .slice(0, settings.questionCount)
      .map((question) => ({
        ...question,
        options: shuffle(question.options),
      }));

    this.stateSignal.set({
      phase: 'playing',
      settings: { ...settings },
      questions,
      currentQuestionIndex: 0,
      selectedAnswerId: null,
      answers: [],
      score: 0,
      startedAt: Date.now(),
      finishedAt: null,
    });
  }

  startQuizWithQuestions(questions: readonly QuizQuestion[]): void {
    if (questions.length === 0) {
      throw new RangeError('Вікторина повинна містити хоча б одне запитання.');
    }

    const questionIds = new Set<string>();

    for (const question of questions) {
      if (!question.id.trim() || questionIds.has(question.id)) {
        throw new Error('ID запитань мають бути непорожніми й унікальними.');
      }

      questionIds.add(question.id);

      if (question.options.length < 2) {
        throw new Error('Кожне запитання повинно мати щонайменше два варіанти відповіді.');
      }

      const answerIds = new Set<string>();

      for (const option of question.options) {
        if (!option.id.trim() || answerIds.has(option.id)) {
          throw new Error('ID варіантів відповіді мають бути непорожніми й унікальними.');
        }

        answerIds.add(option.id);
      }

      if (!answerIds.has(question.correctAnswerId)) {
        throw new Error('Правильна відповідь повинна посилатися на наявний варіант.');
      }
    }

    const firstQuestion = questions[0];

    this.stateSignal.set({
      phase: 'playing',
      settings: {
        category: firstQuestion.category,
        difficulty: firstQuestion.difficulty,
        questionCount: questions.length,
      },
      questions: questions.map((question) => ({
        ...question,
        options: shuffle(question.options),
      })),
      currentQuestionIndex: 0,
      selectedAnswerId: null,
      answers: [],
      score: 0,
      startedAt: Date.now(),
      finishedAt: null,
    });
  }

  submitAnswer(answerId: string): void {
    const state = this.stateSignal();
    const question = state.questions[state.currentQuestionIndex];

    if (state.phase !== 'playing' || !question) {
      return;
    }

    const answerExists = question.options.some((option) => option.id === answerId);

    if (!answerExists) {
      throw new Error('Вибраний варіант відповіді не існує.');
    }

    const isCorrect = answerId === question.correctAnswerId;

    const answer: QuizAnswer = {
      questionId: question.id,
      selectedAnswerId: answerId,
      correctAnswerId: question.correctAnswerId,
      isCorrect,
    };

    this.stateSignal.update((current) => ({
      ...current,
      phase: 'answered',
      selectedAnswerId: answerId,
      answers: [...current.answers, answer],
      score: current.score + (isCorrect ? 1 : 0),
    }));
  }

  nextQuestion(): void {
    const state = this.stateSignal();

    if (state.phase !== 'answered') {
      return;
    }

    const isLastQuestion = state.currentQuestionIndex >= state.questions.length - 1;

    if (isLastQuestion) {
      this.stateSignal.update((current) => ({
        ...current,
        phase: 'completed',
        finishedAt: Date.now(),
      }));

      return;
    }

    this.stateSignal.update((current) => ({
      ...current,
      phase: 'playing',
      currentQuestionIndex: current.currentQuestionIndex + 1,
      selectedAnswerId: null,
    }));
  }

  getResult(): QuizResult | null {
    const state = this.stateSignal();

    if (state.phase !== 'completed' || state.startedAt === null) {
      return null;
    }

    const totalQuestions = state.questions.length;
    const correctAnswers = state.score;
    const finishedAt = state.finishedAt ?? Date.now();

    return {
      totalQuestions,
      correctAnswers,
      incorrectAnswers: totalQuestions - correctAnswers,
      score: correctAnswers,
      percentage: totalQuestions === 0 ? 0 : Math.round((correctAnswers / totalQuestions) * 100),
      durationSeconds: Math.max(0, Math.floor((finishedAt - state.startedAt) / 1000)),
    };
  }

  resetQuiz(): void {
    this.stateSignal.set(INITIAL_STATE);
  }
}
