# Quran Tutor production readiness checklist

Use this checklist before each partner-testing or production deployment. Store all secrets in the deployment platform; never add real keys to the repository.

## Environment configuration

- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is configured as a server-only secret.
- [ ] Stripe test or live keys are configured for the target environment.
- [ ] Stripe subscription and donation price IDs are configured.
- [ ] `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint for the target environment.
- [ ] `DAILY_API_KEY` and `DAILY_DOMAIN` are configured.
- [ ] All required environment variables are added to the correct Vercel environments.
- [ ] Supabase site URL and redirect URLs include the deployed app URLs.

## Release checks

- [ ] `pnpm lint` passes.
- [ ] `pnpm build` passes.
- [ ] PWA installation is tested on a supported Android device and iPhone.
- [ ] Parent sign-in, learner, class, and dashboard flows are tested.
- [ ] Scholar sign-in, class management, roster, and progress flows are tested.
- [ ] Student access and class-view flows are tested.
- [ ] Admin access and scholar approval flows are tested.
- [ ] Subscription checkout and confirmation are tested with the intended Stripe mode.
- [ ] Donation checkout and confirmation are tested with the intended Stripe mode.
- [ ] Daily classroom access is tested for scholars, parents, and students.
- [ ] Recording creation and private recording access are tested.
- [ ] Private class links and recordings are not exposed in public pages or logs.
- [ ] Parent supervision and recording-use reminders are visible in the live learning flow.

## Final review

- [ ] Partner-test accounts contain only appropriate test data.
- [ ] Browser and server logs contain no unexpected errors.
- [ ] Mobile layouts are reviewed at common phone widths.
- [ ] Payment, classroom, and authentication fallbacks show friendly messages.
