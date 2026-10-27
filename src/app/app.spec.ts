import { TestBed } from '@angular/core/testing';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  function createFixture() {
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();

    return fixture;
  }

  async function stabilize(fixture: ReturnType<typeof createFixture>): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function findButton(fixture: ReturnType<typeof createFixture>, text: string): HTMLButtonElement {
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));

    const button = buttons.find((item) => item.textContent?.includes(text));

    if (!button) {
      throw new Error(`Не знайдено кнопку: "${text}"`);
    }

    return button;
  }

  it('should create the app', () => {
    const fixture = createFixture();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the QuizLab heading', async () => {
    const fixture = createFixture();

    await stabilize(fixture);

    const heading = (fixture.nativeElement as HTMLElement).querySelector('h1');

    expect(heading?.textContent).toContain('Перевір свої знання.');
    expect(heading?.textContent).toContain('Відкрий нове.');
  });

  it('should render quiz configuration controls', async () => {
    const fixture = createFixture();

    await stabilize(fixture);

    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(content).toContain('Створи свою вікторину');
    expect(content).toContain('Обери категорію');
    expect(content).toContain('Обери складність');
    expect(content).toContain('Кількість запитань');
  });

  it('should start a quiz when the start button is clicked', async () => {
    const fixture = createFixture();

    await stabilize(fixture);
    findButton(fixture, 'Почати вікторину').click();
    await stabilize(fixture);

    expect(fixture.componentInstance['quiz'].state().phase).toBe('playing');

    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(content).toContain('Час перевірити знання');
  });

  it('should display feedback after selecting an answer', async () => {
    const fixture = createFixture();

    await stabilize(fixture);
    findButton(fixture, 'Почати вікторину').click();
    await stabilize(fixture);

    const quiz = fixture.componentInstance['quiz'];
    const question = quiz.currentQuestion();

    expect(question).not.toBeNull();

    const answerButton = findButton(fixture, question!.options[0].text);

    answerButton.click();
    await stabilize(fixture);

    expect(quiz.state().phase).toBe('answered');

    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(content).toContain(question!.explanation);
    expect(content).toContain('Наступне запитання');
  });

  it('should disable answer options after an answer is submitted', async () => {
    const fixture = createFixture();

    await stabilize(fixture);
    findButton(fixture, 'Почати вікторину').click();
    await stabilize(fixture);

    const quiz = fixture.componentInstance['quiz'];
    const question = quiz.currentQuestion()!;

    findButton(fixture, question.options[0].text).click();
    await stabilize(fixture);

    for (const option of question.options) {
      expect(findButton(fixture, option.text).disabled).toBe(true);
    }
  });

  it('should advance to the next question', async () => {
    const fixture = createFixture();

    await stabilize(fixture);
    findButton(fixture, 'Почати вікторину').click();
    await stabilize(fixture);

    const quiz = fixture.componentInstance['quiz'];

    findButton(fixture, quiz.currentQuestion()!.options[0].text).click();
    await stabilize(fixture);

    findButton(fixture, 'Наступне запитання').click();
    await stabilize(fixture);

    expect(quiz.state().phase).toBe('playing');
    expect(quiz.state().currentQuestionIndex).toBe(1);
    expect(quiz.state().selectedAnswerId).toBeNull();
  });

  it('should show the result screen after the final question', async () => {
    const fixture = createFixture();

    await stabilize(fixture);
    findButton(fixture, 'Почати вікторину').click();
    await stabilize(fixture);

    const quiz = fixture.componentInstance['quiz'];

    for (let index = 0; index < 2; index++) {
      const question = quiz.currentQuestion()!;

      findButton(fixture, question.options[0].text).click();
      await stabilize(fixture);

      const buttonLabel = index === 1 ? 'Побачити результат' : 'Наступне запитання';

      findButton(fixture, buttonLabel).click();
      await stabilize(fixture);
    }

    expect(quiz.state().phase).toBe('completed');

    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(content).toContain('Вікторину завершено');
    expect(content).toContain('Правильні відповіді');
  });

  it('should restart the quiz from the result screen', async () => {
    const fixture = createFixture();

    await stabilize(fixture);
    findButton(fixture, 'Почати вікторину').click();
    await stabilize(fixture);

    const quiz = fixture.componentInstance['quiz'];

    for (let index = 0; index < 2; index++) {
      const question = quiz.currentQuestion()!;

      findButton(fixture, question.options[0].text).click();
      await stabilize(fixture);

      findButton(fixture, index === 1 ? 'Побачити результат' : 'Наступне запитання').click();

      await stabilize(fixture);
    }

    findButton(fixture, 'Спробувати ще раз').click();
    await stabilize(fixture);

    expect(quiz.state().phase).toBe('idle');
    expect(quiz.state().answers).toHaveLength(0);

    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(content).toContain('Створи свою вікторину');
  });
});

