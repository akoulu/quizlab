import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QUESTIONS } from '../data/questions';
import type { QuizSettings } from '../domain/quiz.models';
import { QuizService } from './quiz.service';

describe('QuizService', () => {
  let service: QuizService;

  const settings: QuizSettings = {
    category: 'general',
    difficulty: 'easy',
    questionCount: 2,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [QuizService],
    });

    service = TestBed.inject(QuizService);
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('should start in the idle phase with zero score', () => {
    expect(service.state().phase).toBe('idle');
    expect(service.state().score).toBe(0);
    expect(service.state().questions).toHaveLength(0);
    expect(service.currentQuestion()).toBeNull();
    expect(service.progress()).toBe(0);
  });

  it('should report the number of available questions', () => {
    const expectedCount = QUESTIONS.filter(
      (question) =>
        question.category === settings.category && question.difficulty === settings.difficulty,
    ).length;

    expect(service.getAvailableQuestionCount(settings.category, settings.difficulty)).toBe(
      expectedCount,
    );
  });

  it('should start a quiz with the requested settings', () => {
    service.startQuiz(settings);

    expect(service.state().phase).toBe('playing');
    expect(service.state().settings).toEqual(settings);
    expect(service.state().questions).toHaveLength(2);
    expect(service.state().currentQuestionIndex).toBe(0);
    expect(service.state().selectedAnswerId).toBeNull();
    expect(service.state().answers).toHaveLength(0);
    expect(service.state().startedAt).not.toBeNull();
    expect(service.currentQuestion()).not.toBeNull();
  });

  it('should reject a question count below one', () => {
    expect(() => service.startQuiz({ ...settings, questionCount: 0 })).toThrowError(RangeError);

    expect(service.state().phase).toBe('idle');
  });

  it('should reject a non-integer question count', () => {
    expect(() => service.startQuiz({ ...settings, questionCount: 1.5 })).toThrowError(RangeError);
  });

  it('should reject more questions than are available', () => {
    const available = service.getAvailableQuestionCount(settings.category, settings.difficulty);

    expect(() =>
      service.startQuiz({
        ...settings,
        questionCount: available + 1,
      }),
    ).toThrowError(RangeError);

    expect(service.state().phase).toBe('idle');
  });

  it('should preserve answer options when starting a quiz', () => {
    service.startQuiz(settings);

    for (const question of service.state().questions) {
      const originalQuestion = QUESTIONS.find((item) => item.id === question.id);

      expect(originalQuestion).toBeDefined();
      expect(question.options).toHaveLength(originalQuestion!.options.length);
      expect(question.options.map((option) => option.id).sort()).toEqual(
        originalQuestion!.options.map((option) => option.id).sort(),
      );
      expect(question.options.some((option) => option.id === question.correctAnswerId)).toBe(true);
    }
  });

  it('should reject an answer ID that does not exist', () => {
    service.startQuiz(settings);

    expect(() => service.submitAnswer('invalid-answer-id')).toThrowError(
      'Вибраний варіант відповіді не існує.',
    );

    expect(service.state().phase).toBe('playing');
    expect(service.state().answers).toHaveLength(0);
  });

  it('should record a correct answer and increase the score', () => {
    service.startQuiz(settings);

    const question = service.currentQuestion()!;

    service.submitAnswer(question.correctAnswerId);

    expect(service.state().phase).toBe('answered');
    expect(service.state().selectedAnswerId).toBe(question.correctAnswerId);
    expect(service.state().answers).toHaveLength(1);
    expect(service.state().answers[0].isCorrect).toBe(true);
    expect(service.state().score).toBe(1);
    expect(service.progress()).toBe(50);
  });

  it('should record an incorrect answer without increasing the score', () => {
    service.startQuiz(settings);

    const question = service.currentQuestion()!;
    const wrongOption = question.options.find((option) => option.id !== question.correctAnswerId)!;

    service.submitAnswer(wrongOption.id);

    expect(service.state().phase).toBe('answered');
    expect(service.state().answers[0].isCorrect).toBe(false);
    expect(service.state().score).toBe(0);
  });

  it('should not record a second answer for the same question', () => {
    service.startQuiz(settings);

    const question = service.currentQuestion()!;
    const firstAnswer = question.correctAnswerId;
    const secondAnswer = question.options.find((option) => option.id !== firstAnswer)!.id;

    service.submitAnswer(firstAnswer);
    service.submitAnswer(secondAnswer);

    expect(service.state().answers).toHaveLength(1);
    expect(service.state().answers[0].selectedAnswerId).toBe(firstAnswer);
    expect(service.state().score).toBe(1);
  });

  it('should move to the next question and reset the selection', () => {
    service.startQuiz(settings);

    const firstQuestion = service.currentQuestion()!;

    service.submitAnswer(firstQuestion.correctAnswerId);
    service.nextQuestion();

    expect(service.state().phase).toBe('playing');
    expect(service.state().currentQuestionIndex).toBe(1);
    expect(service.state().selectedAnswerId).toBeNull();
    expect(service.currentQuestion()?.id).not.toBe(firstQuestion.id);
    expect(service.state().answers).toHaveLength(1);
  });

  it('should complete the quiz after the final answer', () => {
    service.startQuiz(settings);

    for (let i = 0; i < settings.questionCount; i++) {
      const question = service.currentQuestion()!;

      service.submitAnswer(question.correctAnswerId);
      service.nextQuestion();
    }

    expect(service.state().phase).toBe('completed');
    expect(service.state().finishedAt).not.toBeNull();
    expect(service.progress()).toBe(100);
  });

  it('should calculate the final result correctly', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-27T10:00:00.000Z'));

    service.startQuiz(settings);

    const firstQuestion = service.currentQuestion()!;
    service.submitAnswer(firstQuestion.correctAnswerId);
    service.nextQuestion();

    vi.advanceTimersByTime(21_000);

    const secondQuestion = service.currentQuestion()!;
    const wrongOption = secondQuestion.options.find(
      (option) => option.id !== secondQuestion.correctAnswerId,
    )!;

    service.submitAnswer(wrongOption.id);
    service.nextQuestion();

    expect(service.getResult()).toEqual({
      totalQuestions: 2,
      correctAnswers: 1,
      incorrectAnswers: 1,
      score: 1,
      percentage: 50,
      durationSeconds: 21,
    });
  });

  it('should return null when the quiz is not completed', () => {
    service.startQuiz(settings);

    expect(service.getResult()).toBeNull();
  });

  it('should reset the quiz to the initial state', () => {
    service.startQuiz(settings);

    const question = service.currentQuestion()!;
    service.submitAnswer(question.correctAnswerId);

    service.resetQuiz();

    expect(service.state().phase).toBe('idle');
    expect(service.state().questions).toHaveLength(0);
    expect(service.state().currentQuestionIndex).toBe(0);
    expect(service.state().selectedAnswerId).toBeNull();
    expect(service.state().answers).toHaveLength(0);
    expect(service.state().score).toBe(0);
    expect(service.state().startedAt).toBeNull();
    expect(service.state().finishedAt).toBeNull();
    expect(service.currentQuestion()).toBeNull();
    expect(service.progress()).toBe(0);
    expect(service.getResult()).toBeNull();
  });

  it('should reject a negative question count', () => {
    expect(() => service.startQuiz({ ...settings, questionCount: -1 })).toThrowError(RangeError);

    expect(service.state().phase).toBe('idle');
  });

  it('should reject NaN as a question count', () => {
    expect(() =>
      service.startQuiz({
        ...settings,
        questionCount: Number.NaN,
      }),
    ).toThrowError(RangeError);

    expect(service.state().phase).toBe('idle');
  });

  it('should preserve the current session if a new quiz configuration is invalid', () => {
    service.startQuiz(settings);

    const previousState = service.state();

    expect(() =>
      service.startQuiz({
        ...settings,
        questionCount: 999,
      }),
    ).toThrowError(RangeError);

    expect(service.state()).toBe(previousState);
  });

  it('should ignore an answer submitted before the quiz starts', () => {
    service.submitAnswer('any-answer-id');

    expect(service.state().phase).toBe('idle');
    expect(service.state().answers).toHaveLength(0);
    expect(service.state().score).toBe(0);
  });

  it('should ignore nextQuestion when the current question has not been answered', () => {
    service.startQuiz(settings);

    const initialQuestion = service.currentQuestion();

    service.nextQuestion();

    expect(service.state().phase).toBe('playing');
    expect(service.state().currentQuestionIndex).toBe(0);
    expect(service.currentQuestion()?.id).toBe(initialQuestion?.id);
    expect(service.state().answers).toHaveLength(0);
  });

  it('should ignore additional answers after the quiz is completed', () => {
    service.startQuiz(settings);

    for (let i = 0; i < settings.questionCount; i++) {
      const question = service.currentQuestion()!;

      service.submitAnswer(question.correctAnswerId);
      service.nextQuestion();
    }

    const completedState = service.state();

    service.submitAnswer('any-answer-id');

    expect(service.state()).toBe(completedState);
    expect(service.state().phase).toBe('completed');
    expect(service.state().answers).toHaveLength(settings.questionCount);
    expect(service.state().score).toBe(settings.questionCount);
  });

  it('should start a quiz with externally supplied questions', () => {
    const questions = QUESTIONS.slice(0, 2);
    service.startQuizWithQuestions(questions);
    expect(service.state().phase).toBe('playing');
    expect(service.state().questions).toHaveLength(2);
    expect(service.state().currentQuestionIndex).toBe(0);
    expect(service.state().selectedAnswerId).toBeNull();
    expect(service.state().answers).toHaveLength(0);
    expect(service.state().startedAt).not.toBeNull();
    expect(service.currentQuestion()).not.toBeNull();

    for (const question of service.state().questions) {
      expect(question.options.some((option) => option.id === question.correctAnswerId)).toBe(true);
    }
  });

  it('should reject an empty set of externally supplied questions', () => {
    expect(() => service.startQuizWithQuestions([])).toThrowError(RangeError);
    expect(service.state().phase).toBe('idle');
  });

  it('should reject duplicate question IDs', () => {
    const question = QUESTIONS[0];
    expect(() => service.startQuizWithQuestions([question, question])).toThrowError(
      'ID запитань мають бути непорожніми й унікальними.',
    );
    expect(service.state().phase).toBe('idle');
  });

  it('should reject questions with fewer than two answer options', () => {
    const question = QUESTIONS[0];
    const invalidQuestion = {
      ...question,
      options: [question.options[0]],
      correctAnswerId: question.options[0].id,
    };

    expect(() => service.startQuizWithQuestions([invalidQuestion])).toThrowError(
      'Кожне запитання повинно мати щонайменше два варіанти відповіді.',
    );
    expect(service.state().phase).toBe('idle');
  });

  it('should reject a correct answer ID that does not exist', () => {
    const question = QUESTIONS[0];
    const invalidQuestion = {
      ...question,
      correctAnswerId: 'missing-answer-id',
    };

    expect(() => service.startQuizWithQuestions([invalidQuestion])).toThrowError(
      'Правильна відповідь повинна посилатися на наявний варіант.',
    );
    expect(service.state().phase).toBe('idle');
  });

  it('should preserve the current session when supplied questions are invalid', () => {
    service.startQuiz({
      category: 'general',
      difficulty: 'easy',
      questionCount: 2,
    });

    const previousState = service.state();
    expect(() => service.startQuizWithQuestions([])).toThrowError(RangeError);
    expect(service.state()).toBe(previousState);
  });
});
