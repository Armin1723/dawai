# MediFlow AI — Known Issues & Technical Debt

> Track bugs, debt, performance concerns, and future improvements. Newest first.

## Technical Debt

- [ ] **Auth requires a live Supabase project** — until the user supplies credentials, auth/data
      calls fail gracefully but are not testable end-to-end. (Blocking item, not debt per se.)
- [ ] **No tests yet** — Vitest + Playwright are in the roadmap (Phase 9). Foundation shipped without
      a test harness; set one up before modules grow.
- [ ] **Placeholder routes** for POS/inventory/purchases/etc. must be replaced by real modules.
- [ ] **Type safety on DB rows** — a generated `types/database.ts` (supabase gen types) should replace
      hand-written types once the real project exists.

## Known Bugs

- (none reported yet)

## Performance Concerns

- [ ] Dashboard chart data is computed client-side from mock/local data; switch to server-side
      aggregation (SQL views) for real scale.
- [ ] Ensure tables use pagination/virtualization before inventories grow to tens of thousands of rows.

## Future Improvements

- Offline queue for POS (IndexedDB), OCR prescriptions, WhatsApp invoices, multi-store, mobile app.
- Edge caching and image optimization strategy once product images land.
- Full audit-log viewer UI (schema is ready).
