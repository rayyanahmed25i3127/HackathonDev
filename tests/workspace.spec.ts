import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Good morning, Rayyan ☀' })).toBeVisible();
});
test('create, acknowledge, record a note, and persist a lead', async ({ page }) => {
  await page.getByRole('button', { name: 'New lead', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill('Taylor Demo');
  await dialog.getByLabel('Company', { exact: false }).fill('Demo Company');
  await dialog.getByLabel('Email address').fill('taylor@example.com');
  await dialog.getByLabel('Phone number').fill('+14155551234');
  await dialog.getByLabel('Opportunity value').fill('12500');
  await dialog.getByRole('button', { name: 'Create lead' }).click();
  await expect(page.getByRole('status')).toContainText('Taylor Demo');
  await page.getByRole('link', { name: 'Leads', exact: true }).click();
  await page.getByPlaceholder('Search leads…').fill('Taylor Demo');
  await page.getByRole('button', { name: 'Open Taylor Demo' }).click();
  await page.getByRole('button', { name: 'Acknowledge lead' }).click();
  await expect(page.getByRole('dialog').getByText('Acknowledged', { exact: true })).toBeVisible();
  await page.getByLabel('Add a note', { exact: true }).fill('Follow up after discovery call.');
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByText('Follow up after discovery call.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.reload();
  await page.getByPlaceholder('Search leads…').fill('Taylor Demo');
  await expect(page.getByText('Taylor Demo', { exact: true })).toBeVisible();
});
test('pipeline changes stage and enforces required custom fields', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Custom fields', exact: true }).click();
  await page.getByRole('button', { name: 'Add field', exact: true }).click();
  await page.getByLabel('Field name').fill('Contract code');
  await page.getByLabel('Required when entering stage').selectOption('Proposal');
  await page.getByRole('button', { name: 'Create field' }).click();
  await page.goto('/pipeline');
  await page.getByLabel('Stage for Olivia Rhye').selectOption('Proposal');
  await expect(page.getByRole('alert')).toContainText('Contract code');
  const drawer = page.getByRole('dialog');
  await drawer.getByLabel('Contract code').fill('TEST-2026');
  await drawer.getByLabel('Contract code').blur();
  await drawer.getByLabel('Pipeline stage').selectOption('Proposal');
  await expect(drawer.getByText('Proposal', { exact: true }).first()).toBeVisible();
});
test('three-way filters, empty results, and dynamic saved lists', async ({ page }) => {
  await page.goto('/leads');
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByLabel('All stages').selectOption('New');
  await page.getByLabel('All owners').selectOption('rayyan');
  await page.getByLabel('All sources').selectOption('Website');
  await page.getByRole('button', { name: 'Save list' }).click();
  await page.getByLabel('List name').fill('Rayyan website leads');
  await page.getByRole('dialog').getByRole('button', { name: 'Save list' }).click();
  await expect(page.getByRole('button', { name: 'Rayyan website leads' })).toBeVisible();
  await page.getByPlaceholder('Search leads…').fill('not a customer');
  await expect(page.getByRole('heading', { name: 'No matching records' })).toBeVisible();
});
test('booking catches conflicts; integrations never fake success', async ({ page }) => {
  await page.goto('/calendar');
  await page.getByRole('button', { name: 'Book appointment' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Appointment title').fill('Conflicting demo meeting');
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('relay-demo-v1')!));
  const existing = state.appointments.find((a: { ownerId: string }) => a.ownerId === 'rayyan');
  const dt = new Date(existing.start);
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await dialog.getByLabel('Date & time').fill(local);
  await dialog.getByRole('button', { name: 'Save demo appointment' }).click();
  await expect(page.getByRole('alert')).toContainText('Overlaps');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.goto('/integrations');
  await expect(page.getByText('Not connected', { exact: true })).toHaveCount(4);
  await page.getByRole('button', { name: 'Connection setup' }).first().click();
  await page.getByRole('button', { name: 'Check connection' }).click();
  await expect(page.getByRole('status')).toContainText('No credentials were submitted');
});
test('all routes render on mobile without document overflow', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    '/',
    '/leads',
    '/pipeline',
    '/recovery',
    '/contacts',
    '/companies',
    '/conversations',
    '/payments',
    '/calendar',
    '/team',
    '/integrations',
    '/audit',
    '/settings',
    '/login',
    '/signup',
    '/forgot-password',
    '/capture',
  ]) {
    await page.goto(route);
    await expect(
      page.locator('main h1, .auth-form-content h2, .capture-card h1').first(),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }
  await page.goto('/');
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Pipeline', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Turn conversations into wins.' })).toBeVisible();
});

test('absence reassigns pending leads and retains acknowledged ownership', async ({ page }) => {
  await page.goto('/team');
  await page.getByLabel('Availability for Rayyan Ahmed').selectOption('Offline');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const d = JSON.parse(localStorage.getItem('relay-demo-v1')!);
        return d.leads.find((l: { name: string }) => l.name === 'Olivia Rhye').ownerId;
      }),
    )
    .not.toBe('rayyan');
  const owner = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('relay-demo-v1')!);
    return d.leads.find((l: { name: string }) => l.name === 'Demi Wilkinson').ownerId;
  });
  expect(owner).toBe('rayyan');
  await page.goto('/audit');
  await expect(page.getByRole('heading', { name: /Olivia Rhye reassigned/ })).toBeVisible();
});

test('User preview scopes records and masks values', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Roles & permissions', exact: true }).click();
  await page.getByLabel('View opportunity values', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Open profile' }).click();
  await page.getByLabel('Preview as a base level').selectOption('User');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.goto('/leads');
  await expect(page.getByRole('table').getByText('Olivia Rhye', { exact: true })).toBeVisible();
  await expect(page.getByRole('table').getByText('Phoenix Baker', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('table').getByText('••••', { exact: true }).first()).toBeVisible();
  await page.goto('/audit');
  await expect(page.getByRole('heading', { name: 'Audit permission required' })).toBeVisible();
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Important moments, delivered' })).toBeVisible();
  await expect(page.getByLabel('Your Telegram chat ID')).toBeVisible();
});

test('public capture stays local and sign-in never claims real authentication', async ({
  page,
}) => {
  await page.goto('/capture');
  await page.getByLabel('Full name').fill('Jordan Capture');
  await page.getByLabel('Email address').fill('jordan@example.com');
  await page.getByLabel('Company', { exact: true }).fill('Capture Co');
  await page.getByLabel('Phone number').fill('+14155550199');
  await page.getByLabel('How can we help?').fill('I would like a consultation.');
  await page.getByRole('button', { name: 'Get in touch' }).click();
  await expect(page.getByRole('heading', { name: 'You’re on our demo list.' })).toBeVisible();
  await page.goto('/leads');
  await page.getByPlaceholder('Search leads…').fill('Jordan Capture');
  await expect(page.getByRole('table').getByText('Jordan Capture', { exact: true })).toBeVisible();
  await page.goto('/login');
  await page.getByLabel('Work email').fill('rayyan@example.com');
  await page.getByLabel('Password', { exact: true }).fill('demo-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText(/No account was created, no session was started/)).toBeVisible();
});
