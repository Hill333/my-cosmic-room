import { expect, test } from '@playwright/test';

/** M0 smoke: first launch → language → room card → S1 → back; language persists across reload. */
test.describe('S0 title and room choice', () => {
  test('first launch asks for a language, then opens a room and remembers the choice', async ({
    page,
  }) => {
    await page.goto('/');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('lang-nl')).toBeVisible();
    await dialog.getByTestId('lang-nl').click();
    await expect(dialog).toBeHidden();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('My Cosmic Room');
    await expect(page.getByTestId('room-card-space')).toContainText('Ruimtespeelkamer');
    await expect(page.getByTestId('room-card-sweet')).toContainText('Zoete speelkamer');
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');

    // Keyboard only: the last-used card is pre-focused, Enter opens it (SPEC §3.3, §13.1).
    await expect(page.getByTestId('room-card-space')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ruimtespeelkamer');
    await expect(page.getByTestId('collected')).toContainText('0 / 12 verzameld');

    await page.getByTestId('rooms-button').click();
    await expect(page.getByTestId('room-card-sweet')).toBeVisible();
    await page.getByTestId('room-card-sweet').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zoete speelkamer');

    // Autosave: reload keeps the language and the last room, and skips the overlay.
    await page.waitForTimeout(400);
    await page.reload();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
    await expect(page.getByTestId('room-card-sweet')).toBeFocused();
  });

  test('language switch on S0 changes the text immediately', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('lang-en').click();
    await page.getByTestId('switch-tr').click();
    await expect(page.getByTestId('room-card-space')).toContainText('Uzay Oyun Odası');
    await expect(page.getByTestId('switch-tr')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('switch-en').click();
    await expect(page.getByTestId('room-card-space')).toContainText('Space Playroom');
  });
});
