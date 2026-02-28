## RevenueCat Subscription Checklist (Android)

- [ ] Monthly purchase upgrades user to `PREMIUM` and sets `subscriptionInterval=monthly`.
- [ ] Yearly purchase upgrades user to `PREMIUM` and sets `subscriptionInterval=yearly`.
- [ ] After purchase, `/api/auth/sync-plan` receives RevenueCat `customerInfo` and updates expiration metadata.
- [ ] "Manage/cancel" button opens `https://play.google.com/store/account/subscriptions`.
- [ ] Cancellation keeps `PREMIUM` access while `subscriptionExpiresAt` is in the future.
- [ ] RevenueCat `CANCELLATION` webhook marks `subscriptionWillRenew=false`.
- [ ] RevenueCat `EXPIRATION` webhook downgrades plan to `FREE`.
- [ ] Restore purchases rehydrates premium status and metadata.
- [ ] Invalid webhook token is rejected with `401`.
