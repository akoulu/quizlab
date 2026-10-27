import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('початковий екран не має порушень автоматичного аудиту доступності', async ({ page }) => {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

test('екран вікторини не має порушень автоматичного аудиту доступності', async ({ page }) => {
  await page.getByRole('button', { name: /Почати вікторину/ }).click();

  await expect(page.locator('h2[tabindex="-1"]')).toBeVisible();

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

test('екран результатів не має порушень автоматичного аудиту доступності', async ({ page }) => {
  await page.getByRole('button', { name: /Почати вікторину/ }).click();

  await page.locator('button[aria-pressed]').first().click();
  await page.getByRole('button', { name: /Наступне запитання/ }).click();

  await page.locator('button[aria-pressed]').first().click();
  await page.getByRole('button', { name: /Побачити результат/ }).click();

  await expect(page.getByRole('heading', { name: 'Чудова робота!' })).toBeVisible();

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

test('після початку вікторини фокус переходить на заголовок запитання', async ({ page }) => {
  await page.getByRole('button', { name: /Почати вікторину/ }).click();

  const questionHeading = page.locator('h2[tabindex="-1"]');

  await expect(questionHeading).toBeVisible();
  await expect(questionHeading).toBeFocused();
});

test('після переходу до наступного запитання фокус оновлюється', async ({ page }) => {
  await page.getByRole('button', { name: /Почати вікторину/ }).click();

  await page.locator('button[aria-pressed]').first().click();
  await page.getByRole('button', { name: /Наступне запитання/ }).click();

  const questionHeading = page.locator('h2[tabindex="-1"]');

  await expect(questionHeading).toBeVisible();
  await expect(questionHeading).toBeFocused();
});

test('після завершення вікторини фокус переходить на результати', async ({ page }) => {
  await page.getByRole('button', { name: /Почати вікторину/ }).click();

  await page.locator('button[aria-pressed]').first().click();
  await page.getByRole('button', { name: /Наступне запитання/ }).click();

  await page.locator('button[aria-pressed]').first().click();
  await page.getByRole('button', { name: /Побачити результат/ }).click();

  const resultsHeading = page.getByRole('heading', {
    name: 'Чудова робота!',
  });

  await expect(resultsHeading).toBeVisible();
  await expect(resultsHeading).toBeFocused();
});

test('після перезапуску фокус повертається до налаштувань', async ({ page }) => {
  await page.getByRole('button', { name: /Почати вікторину/ }).click();

  await page.getByRole('button', { name: /QuizLab/ }).click();

  const settingsHeading = page.getByRole('heading', {
    name: 'Створи свою вікторину',
  });

  await expect(settingsHeading).toBeVisible();
  await expect(settingsHeading).toBeFocused();
});
