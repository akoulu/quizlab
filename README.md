# QuizLab

A modern, responsive quiz application built with Angular, TypeScript, and Tailwind CSS.

QuizLab lets users configure a quiz, answer questions, receive immediate feedback, and review their results in a clean, accessible interface.

## Features

- **Quiz configuration** — choose a category, difficulty level, and number of questions.
- **Multiple categories** — General Knowledge, Science, History, and Technology.
- **Three difficulty levels** — Easy, Medium, and Hard.
- **Randomized quizzes** — questions and answer options are shuffled for each session.
- **Immediate feedback** — see whether an answer is correct and read an explanation when available.
- **Progress tracking** — monitor quiz progress and your current score.
- **Results summary** — view your score, percentage, correct and incorrect answers, and completion time.
- **Responsive UI** — layouts adapt to different screen sizes.
- **Accessibility** — semantic HTML, accessible interaction states, keyboard focus management, and automated accessibility tests.

## Tech Stack

| Technology | Purpose |
| --- | --- |
| Angular | Application framework |
| TypeScript | Type-safe application logic |
| Angular Signals | Reactive state management |
| Tailwind CSS | Utility-first styling |
| Lucide Angular | Icon library |
| Vitest | Unit testing |
| Playwright | End-to-end testing |
| axe-core | Automated accessibility testing |

## Getting Started

### Prerequisites

- Node.js
- npm

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/akoulu/quizlab.git
cd quizlab
npm ci
```

### Run the application

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200) in your browser.

## Testing

### Unit tests

Run the Angular unit test suite once:

```bash
npx ng test --watch=false
```

### Production build

```bash
npm run build
```

### End-to-end tests

Run the Playwright test suite:

```bash
npx playwright install
npm run e2e
```

The E2E suite covers Chromium, Firefox, and WebKit. Accessibility checks are included in the Playwright tests.

## Project Structure

```text
src/
└── app/
    ├── data/
    │   └── questions.ts
    ├── domain/
    │   ├── quiz.models.ts
    │   └── quiz.types.ts
    ├── services/
    │   ├── quiz.service.ts
    │   └── quiz.service.spec.ts
    ├── app.ts
    ├── app.html
    ├── app.css
    └── app.spec.ts
e2e/
├── accessibility.spec.ts
├── example.spec.ts
└── quiz.spec.ts
.github/
└── workflows/
    └── playwright.yml
```

- `data/` contains the quiz question dataset.
- `domain/` defines the core quiz types and models.
- `services/` contains quiz session logic and its unit tests.
- `app.ts`, `app.html`, and `app.css` implement the application interface.
- `e2e/` contains browser-based tests.
- `.github/workflows/` contains the GitHub Actions workflow.

## Architecture

QuizLab separates quiz domain logic from the presentation layer.

The `QuizService` manages the quiz session, answer validation, scoring, question navigation, progress, and result calculation. Angular Signals provide reactive state, while the standalone root component handles user interactions and renders the appropriate application screen.

Quiz questions are currently stored locally in TypeScript. The application does not currently require a backend or database.

## Continuous Integration

GitHub Actions runs the Playwright E2E suite on pushes and pull requests targeting `main` or `master`.

The workflow installs dependencies, installs the required Playwright browsers, executes the tests, and uploads the HTML test report as an artifact.

## Current Scope

QuizLab is an actively developed project. The current version focuses on the core quiz-taking experience, domain logic, responsive UI, and automated testing.

## License

No license has been specified yet. All rights are reserved by default unless a license is added to this repository.

## Deployment

QuizLab is deployed on Vercel.
