import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  ViewChild,
} from '@angular/core';

import type { CategoryId, DifficultyId, QuizQuestion } from './domain/quiz.types';

import type { Question, Quiz, QuizSettings } from './domain/quiz.models';
import type { QuizId } from './domain/quiz.types';
import { QuizApplicationService } from './application/quiz-application.service';
import { QuizService } from './services/quiz.service';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly quiz = inject(QuizService);
  private readonly injector = inject(Injector);
  private readonly quizApplication = inject(QuizApplicationService);

  protected readonly customQuizzes = signal<readonly Quiz[]>([]);
  protected readonly customQuizzesLoading = signal(false);
  protected readonly customQuizzesNotice = signal('');

  constructor() {
    void this.loadPublishedQuizzes();
  }

  protected async loadPublishedQuizzes(): Promise<void> {
    this.customQuizzesLoading.set(true);
    this.customQuizzesNotice.set('');

    try {
      const quizzes = await this.quizApplication.getAll();

      this.customQuizzes.set(
        quizzes.filter((item) => item.source === 'user' && item.status === 'published'),
      );
    } catch (error: unknown) {
      this.customQuizzesNotice.set(
        error instanceof Error ? error.message : 'Не вдалося завантажити користувацькі вікторини.',
      );
    } finally {
      this.customQuizzesLoading.set(false);
    }
  }

  protected async startCustomQuiz(quiz: Quiz): Promise<void> {
    this.customQuizzesNotice.set('');

    try {
      const questions = await this.quizApplication.getPublishedQuestions(quiz.id);
      const runtimeQuestions = questions.map((question) => this.toRuntimeQuestion(question));

      this.quiz.startQuizWithQuestions(runtimeQuestions);
      this.notice.set('');
      this.focusAfterRender('question');
    } catch (error: unknown) {
      this.customQuizzesNotice.set(
        error instanceof Error ? error.message : 'Не вдалося розпочати користувацьку вікторину.',
      );
    }
  }

  private toRuntimeQuestion(question: Question): QuizQuestion {
    return {
      id: question.id,
      category: question.category,
      difficulty: question.difficulty,
      question: question.text,
      options: question.options.map((option) => ({
        id: option.id,
        text: option.text,
      })),
      correctAnswerId: question.correctAnswerId,
      explanation: question.explanation,
    };
  }

  @ViewChild('settingsHeading')
  private settingsHeading?: ElementRef<HTMLElement>;

  @ViewChild('questionHeading')
  private questionHeading?: ElementRef<HTMLElement>;

  @ViewChild('resultsHeading')
  private resultsHeading?: ElementRef<HTMLElement>;

  private focusAfterRender(target: 'settings' | 'question' | 'results'): void {
    afterNextRender(
      () => {
        const headings = {
          settings: this.settingsHeading,
          question: this.questionHeading,
          results: this.resultsHeading,
        };

        headings[target]?.nativeElement.focus();
      },
      { injector: this.injector },
    );
  }

  protected readonly categories = [
    {
      id: 'general' as const,
      title: 'Загальні знання',
      description: 'Потроху про все',
      icon: '🌍',
    },
    { id: 'science' as const, title: 'Наука', description: 'Відкриття та факти', icon: '🧪' },
    { id: 'history' as const, title: 'Історія', description: 'Події та цивілізації', icon: '🏛️' },
    { id: 'technology' as const, title: 'Технології', description: 'IT та інновації', icon: '💻' },
  ];

  protected readonly difficulties = [
    { id: 'easy' as const, title: 'Легко', description: 'Розминка' },
    { id: 'medium' as const, title: 'Середньо', description: 'Є над чим подумати' },
    { id: 'hard' as const, title: 'Складно', description: 'Справжній виклик' },
  ];

  protected readonly selectedCategory = signal<CategoryId>('general');
  protected readonly selectedDifficulty = signal<DifficultyId>('easy');
  protected readonly questionCount = signal(2);
  protected readonly notice = signal('');

  protected readonly availableQuestionCount = computed(() =>
    this.quiz.getAvailableQuestionCount(this.selectedCategory(), this.selectedDifficulty()),
  );

  protected readonly questionCounts = computed(() =>
    Array.from({ length: this.availableQuestionCount() }, (_, index) => index + 1),
  );

  protected readonly result = computed(() => this.quiz.getResult());

  protected selectCategory(id: CategoryId): void {
    this.selectedCategory.set(id);
    this.adjustQuestionCount();
    this.notice.set('');
  }

  protected selectDifficulty(id: DifficultyId): void {
    this.selectedDifficulty.set(id);
    this.adjustQuestionCount();
    this.notice.set('');
  }

  protected selectQuestionCount(count: number): void {
    this.questionCount.set(count);
    this.notice.set('');
  }

  protected startQuiz(): void {
    const settings: QuizSettings = {
      category: this.selectedCategory(),
      difficulty: this.selectedDifficulty(),
      questionCount: this.questionCount(),
    };

    try {
      this.quiz.startQuiz(settings);
      this.notice.set('');
      this.focusAfterRender('question');
    } catch (error: unknown) {
      this.notice.set(error instanceof Error ? error.message : 'Не вдалося розпочати вікторину.');
    }
  }

  protected selectAnswer(answerId: string): void {
    this.quiz.submitAnswer(answerId);
  }

  protected nextQuestion(): void {
    this.quiz.nextQuestion();

    const phase = this.quiz.state().phase;

    if (phase === 'completed') {
      this.focusAfterRender('results');
    } else if (phase === 'playing') {
      this.focusAfterRender('question');
    }
  }

  protected restartQuiz(): void {
    this.quiz.resetQuiz();
    this.notice.set('');
    this.focusAfterRender('settings');
  }

  protected isAnswerCorrect(answerId: string): boolean {
    return this.quiz.currentQuestion()?.correctAnswerId === answerId;
  }

  protected isAnswerSelected(answerId: string): boolean {
    return this.quiz.state().selectedAnswerId === answerId;
  }

  protected categoryTitle(id: CategoryId): string {
    return this.categories.find((category) => category.id === id)?.title ?? id;
  }

  protected difficultyTitle(id: DifficultyId): string {
    return this.difficulties.find((difficulty) => difficulty.id === id)?.title ?? id;
  }

  protected formatDuration(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  private adjustQuestionCount(): void {
    const available = this.availableQuestionCount();

    if (this.questionCount() > available) {
      this.questionCount.set(available);
    }

    if (available === 0) {
      this.questionCount.set(0);
    } else if (this.questionCount() < 1) {
      this.questionCount.set(1);
    }
  }
}
