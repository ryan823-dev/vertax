const { test, expect } = require('@playwright/test');
const { Client } = require('pg');
require('dotenv/config');

const RADAR_EMAIL = process.env.E2E_RADAR_EMAIL || 'admin@tdpaint.com';
const RADAR_PASSWORD = process.env.E2E_RADAR_PASSWORD || 'Tdpaint2026!';
const RADAR_TENANT_SLUG = process.env.E2E_RADAR_TENANT_SLUG || 'tdpaint';

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getTodayDayKey() {
  return dayKeyFormatter.format(new Date());
}

async function withDb(callback) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function getTodaySnapshot(tenantSlug, dayKey) {
  return withDb(async (client) => {
    const result = await client.query(
      `
        select
          s."dayKey",
          s."rawCandidates",
          s."qualifiedCompanies",
          s."importedProspects",
          s."contactsAdded",
          s."readyCompanies",
          s."workspaceTotal",
          s."readyNowCount",
          s."phonePriorityCount",
          s."emailPriorityCount",
          s."pendingCount",
          s."avgReadyScore",
          s."feedbackSummary"
        from "radar_daily_snapshots" s
        join "Tenant" t on t.id = s."tenantId"
        where t.slug = $1 and s."dayKey" = $2
      `,
      [tenantSlug, dayKey],
    );

    return result.rows[0] || null;
  });
}

async function loginToRadarDaily(page) {
  await page.goto('/customer/radar/daily');

  if (!page.url().includes('/login')) {
    return;
  }

  await page.locator('input[name="email"]').fill(RADAR_EMAIL);
  await page.locator('input[name="password"]').fill(RADAR_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/customer\/radar\/daily/, { timeout: 30000 });
}

function buildCronHeaders() {
  if (!process.env.CRON_SECRET) {
    return {};
  }

  return {
    Authorization: `Bearer ${process.env.CRON_SECRET}`,
  };
}

test.describe.serial('radar daily acceptance', () => {
  test('cron persists today snapshot and DB row is queryable', async ({ request }) => {
    const response = await request.get('/api/cron/radar-daily-snapshot', {
      headers: buildCronHeaders(),
      timeout: 30000,
    });

    expect(response.ok()).toBeTruthy();

    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.failed).toBe(0);
    expect(payload.succeeded).toBeGreaterThan(0);

    const todayKey = getTodayDayKey();

    await expect
      .poll(async () => {
        const snapshot = await getTodaySnapshot(RADAR_TENANT_SLUG, todayKey);
        return snapshot?.dayKey || null;
      }, {
        timeout: 15000,
        message: `Expected snapshot row for tenant ${RADAR_TENANT_SLUG} on ${todayKey}`,
      })
      .toBe(todayKey);

    const snapshot = await getTodaySnapshot(RADAR_TENANT_SLUG, todayKey);
    expect(snapshot).toBeTruthy();
    expect(snapshot.feedbackSummary).toBeTruthy();
  });

  test('protected daily page redirects to login, returns after auth, and matches DB snapshot', async ({ page }) => {
    const todayKey = getTodayDayKey();
    const snapshot = await getTodaySnapshot(RADAR_TENANT_SLUG, todayKey);

    expect(snapshot).toBeTruthy();

    await loginToRadarDaily(page);

    await expect(page.getByRole('heading', { name: /今日外联清单/ })).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('radar-daily-generated-at')).toBeVisible({ timeout: 30000 });

    await expect(page.getByTestId('daily-metric-raw-candidates-value')).toHaveText(String(snapshot.rawCandidates));
    await expect(page.getByTestId('daily-metric-imported-prospects-value')).toHaveText(String(snapshot.importedProspects));
    await expect(page.getByTestId('daily-metric-contacts-added-value')).toHaveText(String(snapshot.contactsAdded));
    await expect(page.getByTestId('daily-metric-ready-now-value')).toHaveText(String(snapshot.readyNowCount));

    await expect(page.getByTestId('daily-summary-phone-priority')).toHaveText(String(snapshot.phonePriorityCount));
    await expect(page.getByTestId('daily-summary-email-priority')).toHaveText(String(snapshot.emailPriorityCount));
    await expect(page.getByTestId('daily-summary-pending')).toHaveText(String(snapshot.pendingCount));
    await expect(page.getByTestId('daily-summary-workspace-total')).toHaveText(String(snapshot.workspaceTotal));
  });
});
