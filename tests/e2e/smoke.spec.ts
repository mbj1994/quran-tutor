import { expect, test, type Page } from '@playwright/test';
import { getCheckoutConfirmationState } from '../../lib/payments/checkoutStatus';
import {
  buildDonationCheckoutSessionParams,
  resolveDonationReceiptEmail,
} from '../../lib/payments/donationCheckout';
import {
  getUserSubscriptionStatus,
  normalizeSubscriptionState,
} from '../../lib/payments/subscriptionStatus';

const RAW_ERROR_TEXT = /duplicate key value violates|An error has occurred confirming the Checkout Session|DailyIframe instances are not allowed|column does not exist|Supabase error/i;
const PAGE_CRASH_TEXT = /Application error|Internal Server Error|This page could not be found/i;

const parentCredentials = {
  email: process.env.E2E_PARENT_EMAIL,
  password: process.env.E2E_PARENT_PASSWORD,
};
const scholarCredentials = {
  email: process.env.E2E_SCHOLAR_EMAIL,
  password: process.env.E2E_SCHOLAR_PASSWORD,
};
const adminCredentials = {
  email: process.env.E2E_ADMIN_EMAIL,
  password: process.env.E2E_ADMIN_PASSWORD,
};

test.describe('payment state helpers', () => {
  test('builds custom donation Checkout parameters without a Stripe customer or price id', () => {
    const donationParams = buildDonationCheckoutSessionParams({
      amountCents: 4250,
      donorEmail: 'donor@example.com',
      userId: 'parent-123',
      siteUrl: 'https://quran-tutor.example',
    });

    expect(donationParams).toMatchObject({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Quran Tutor Donation' },
            unit_amount: 4250,
          },
          quantity: 1,
        },
      ],
      customer_email: 'donor@example.com',
      metadata: {
        purpose: 'donation',
        donor_email: 'donor@example.com',
        amount_cents: '4250',
      },
      success_url:
        'https://quran-tutor.example/donation?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://quran-tutor.example/donation',
    });
    expect(donationParams).not.toHaveProperty('customer');
    expect(donationParams.line_items?.[0]).not.toHaveProperty('price');
  });

  test('prefers a donor-entered receipt email for anonymous and logged-in donations', () => {
    expect(
      resolveDonationReceiptEmail(' Donor@Example.com ', 'parent@example.com')
    ).toBe('donor@example.com');
    expect(resolveDonationReceiptEmail('', 'parent@example.com')).toBe(
      'parent@example.com'
    );
    expect(resolveDonationReceiptEmail('donor@example.com', null)).toBe(
      'donor@example.com'
    );
  });

  test('maps donation checkout states without conflating delayed payments and errors', () => {
    expect(getCheckoutConfirmationState('complete', 'unpaid')).toBe('pending');
    expect(getCheckoutConfirmationState('complete', 'paid')).toBe('success');
    expect(
      getCheckoutConfirmationState('complete', 'no_payment_required')
    ).toBe('success');
    expect(getCheckoutConfirmationState('open', 'unpaid')).toBe('incomplete');
    expect(getCheckoutConfirmationState('expired', 'unpaid')).toBe('expired');
  });

  test('keeps the working subscription confirmation inputs unchanged', () => {
    expect(getCheckoutConfirmationState('complete', 'paid')).toBe('success');
    expect(getCheckoutConfirmationState('complete', 'unpaid')).toBe('pending');
  });

  test('normalizes subscription records consistently', () => {
    expect(normalizeSubscriptionState('active')).toBe('active');
    expect(normalizeSubscriptionState('trialing')).toBe('active');
    expect(normalizeSubscriptionState('pending')).toBe('pending');
    expect(normalizeSubscriptionState(null)).toBe('inactive');
  });

  test('returns inactive for an anonymous user without querying', async () => {
    const queryMustNotRun = {
      from() {
        throw new Error('Anonymous subscription lookup queried Supabase.');
      },
    };

    await expect(
      getUserSubscriptionStatus(queryMustNotRun as never, null)
    ).resolves.toEqual({
      state: 'inactive',
      subscription: null,
      error: null,
    });
  });
});

async function expectHealthyPage(page: Page) {
  const body = page.locator('body');
  await expect(body).toBeVisible();
  await expect(body).not.toContainText(RAW_ERROR_TEXT);
  await expect(body).not.toContainText(PAGE_CRASH_TEXT);
}

async function openPage(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response, `Expected a document response for ${path}`).not.toBeNull();
  expect(response!.status(), `Expected ${path} to load`).toBeLessThan(400);
  await expectHealthyPage(page);
}

async function signIn(
  page: Page,
  credentials: { email?: string; password?: string },
  destination: RegExp
) {
  await openPage(page, '/login');
  await page.getByLabel('Email').fill(credentials.email!);
  await page.getByLabel('Password').fill(credentials.password!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(destination);
  await expectHealthyPage(page);
}

test.describe('public pages', () => {
  const pages = [
    { path: '/', heading: /Help your child grow with the Qur.*an/i },
    { path: '/classes', heading: /Browse Live Qur.*an Classes/i },
    { path: '/student', heading: /Welcome, young learner!/i },
    { path: '/login', heading: /Welcome back/i },
    { path: '/donation', heading: /Donation/i },
  ];

  for (const publicPage of pages) {
    test(`${publicPage.path} loads without an obvious crash`, async ({ page }) => {
      await openPage(page, publicPage.path);
      await expect(page.getByRole('heading', { name: publicPage.heading }).first()).toBeVisible();
    });
  }

  test('direct password reset page offers a new recovery link', async ({ page }) => {
    await openPage(page, '/auth/update-password');
    await expect(
      page.getByText(
        'Please use the reset link from your email or request a new one.'
      )
    ).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Send a new reset link' })
    ).toBeVisible();
  });

  test('expired password reset page shows a friendly error', async ({ page }) => {
    await openPage(page, '/auth/update-password?error=expired');
    await expect(
      page.getByText(
        'This password reset link has expired. Please request a new one.'
      )
    ).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Send a new reset link' })
    ).toBeVisible();
  });

  test('anonymous donor can enter an amount and receipt email', async ({ page }) => {
    await openPage(page, '/donation');
    await expect(page.getByLabel('Donation amount (USD)')).toHaveValue('25');
    await expect(page.getByLabel('Receipt email')).toBeVisible();
    await page.getByLabel('Donation amount (USD)').fill('42.50');
    await page.getByLabel('Receipt email').fill('donor@example.com');
    await expect(page.getByLabel('Donation amount (USD)')).toHaveValue('42.50');
    await expect(page.getByLabel('Receipt email')).toHaveValue(
      'donor@example.com'
    );
    await expect(
      page.getByRole('button', { name: 'Continue to Donation' })
    ).toBeVisible();
  });
});

test('parent authentication and core parent pages', async ({ page }) => {
  test.skip(
    !parentCredentials.email || !parentCredentials.password,
    'Set E2E_PARENT_EMAIL and E2E_PARENT_PASSWORD to run the parent smoke test.'
  );

  await signIn(page, parentCredentials, /\/dashboard(?:\?.*)?$/);
  await expect(page.getByRole('heading', { name: 'Family Dashboard' })).toBeVisible();

  const navigation = page.locator('header');
  for (const linkName of [
    'Family Dashboard',
    'Children',
    'Browse Classes',
    'My Live Classes',
    'Billing',
  ]) {
    await expect(navigation.getByRole('link', { name: linkName, exact: true })).toBeVisible();
  }

  const parentPages = [
    { path: '/learners', heading: 'Children' },
    { path: '/classes', heading: /Browse Live Qur.*an Classes/i },
    { path: '/my-classes', heading: 'My Live Classes' },
    { path: '/subscription', heading: 'Billing' },
  ];

  for (const parentPage of parentPages) {
    await openPage(page, parentPage.path);
    await expect(page.getByRole('heading', { name: parentPage.heading }).first()).toBeVisible();
  }

  await openPage(page, '/payments');
  await expect(page.getByRole('heading', { name: 'Payment Checkout' })).toBeVisible();
  await expect(
    page
      .getByRole('button', { name: 'Subscribe' })
      .or(page.getByText('Subscription active', { exact: true }))
      .or(page.getByText(/Your bank payment is processing/))
      .first()
  ).toBeVisible();
  await page.getByRole('button', { name: 'Logout' }).click();
  await page.waitForURL(/\/login(?:\?.*)?$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('student access opens a learner-only view', async ({ page }) => {
  test.skip(
    !process.env.E2E_STUDENT_ACCESS_CODE,
    'Set E2E_STUDENT_ACCESS_CODE to run the student access smoke test.'
  );

  await openPage(page, '/student');
  await page.getByLabel('Student access code').fill(process.env.E2E_STUDENT_ACCESS_CODE!);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Assalamu alaikum')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My Live Classes' })).toBeVisible();
  await expectHealthyPage(page);

  const joinLinks = page.getByRole('link', { name: 'Join Live Class' });
  for (let index = 0; index < (await joinLinks.count()); index += 1) {
    await expect(joinLinks.nth(index)).toHaveAttribute('href', /^\/live\/classes\/[^/]+$/);
  }

  const navigation = page.locator('header');
  await expect(navigation.getByRole('link', { name: 'Family Dashboard', exact: true })).toHaveCount(0);
  await expect(navigation.getByRole('link', { name: 'Billing', exact: true })).toHaveCount(0);
});

test('approved scholar can open teaching pages', async ({ page }) => {
  test.skip(
    !scholarCredentials.email || !scholarCredentials.password,
    'Set E2E_SCHOLAR_EMAIL and E2E_SCHOLAR_PASSWORD to run the scholar smoke test.'
  );

  await signIn(page, scholarCredentials, /\/scholar\/overview(?:\?.*)?$/);
  await expect(page.getByRole('heading', { name: 'Scholar Home' })).toBeVisible();
  await expect(page.locator('header').getByRole('link', { name: 'Teaching Classes' })).toBeVisible();

  await openPage(page, '/scholar/classes');
  await expect(page.getByRole('heading', { name: 'Teaching Classes' })).toBeVisible();

  const joinLinks = page.getByRole('link', { name: 'Join Live Class' });
  const classCount = await joinLinks.count();
  for (let index = 0; index < classCount; index += 1) {
    await expect(joinLinks.nth(index)).toHaveAttribute('href', /^\/live\/classes\/[^/]+$/);
  }

  if (classCount > 0) {
    await expect(page.getByRole('link', { name: 'Roster' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Progress' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Recordings' }).first()).toBeVisible();
  } else {
    await expect(page.getByText(/not created any teaching classes yet/i)).toBeVisible();
  }
});

test('admin can open the control center', async ({ page }) => {
  test.skip(
    !adminCredentials.email || !adminCredentials.password,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the admin smoke test.'
  );

  await signIn(page, adminCredentials, /\/admin(?:\?.*)?$/);
  await expect(page.getByRole('heading', { name: 'Admin Control Center' })).toBeVisible();
  await expect(page.locator('header').getByRole('link', { name: 'Admin Dashboard' })).toBeVisible();

  for (const card of ['Parents', 'Scholars', 'Learners', 'Classes', 'Bookings', 'Upcoming']) {
    await expect(page.getByText(card, { exact: true }).first()).toBeVisible();
  }
});

test.describe('route protection', () => {
  test('logged-out user cannot open the admin dashboard', async ({ page }) => {
    await openPage(page, '/admin');
    await expect(page.getByRole('heading', { name: 'You do not have access to this page.' })).toBeVisible();
    await expect(page.getByText('Private admin area')).toBeVisible();
  });

  test('logged-out user cannot enter a sample live classroom route', async ({ page }) => {
    await openPage(page, '/live/classes/00000000-0000-0000-0000-000000000000');
    await expect(page.getByRole('heading', { name: /Classroom (access needed|unavailable)/ })).toBeVisible();
    await expect(page.getByText(/only available|could not find this live class/i)).toBeVisible();
    await expect(page.getByText('Live Qur’an Classroom')).toHaveCount(0);
  });
});

test('PWA manifest and static offline assets are reachable', async ({ request }) => {
  const manifestResponse = await request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = (await manifestResponse.json()) as {
    icons?: Array<{ src: string }>;
  };
  expect(manifest.icons?.length).toBeGreaterThan(0);

  for (const path of ['/sw.js', '/offline.html']) {
    const response = await request.get(path);
    expect(response.ok(), `Expected ${path} to be reachable`).toBeTruthy();
  }

  for (const icon of manifest.icons ?? []) {
    const response = await request.get(icon.src);
    expect(response.ok(), `Expected ${icon.src} to be reachable`).toBeTruthy();
  }
});
