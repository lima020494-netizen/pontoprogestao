<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Ponto Pro Gestão data: Supabase is the source of truth (tables empregador, funcionarios, pontos, logs, escala isolated by email_dono; dados/feriados by conta); localStorage is only an offline cache and punches go through a pending queue — so kiosk devices and phones share the same data and never lose offline punches.
- Monthly employee sheet links use opaque, expiring, server-validated tokens; never expose owner email or employee PIN in URLs.
- Licensing state (licencas/app_config) is written only by the /api/public/licenca server route; the dev panel requires the admin role (user_roles) plus master PIN, checked server-side — client code can't grant itself access.
- Keep legacy storage namespaces and the HTML entry URL stable during rebranding to preserve offline punches, sessions, and existing sheet links; app logo defaults use the versioned CDN pointer asset.
- All A4 outputs use shared local jsPDF AutoTable generators; screen/PDF calculations match. Thermal receipts alone use browser/native/RawBT printing; BLE ESC/POS needs a supported GATT service and never claims InnerPrinter compatibility.
- Monthly sheet summary rows are derived once from existing daily and bank results and reused by the screen and official PDF; period bank movement stays distinct from accumulated balance to avoid divergent totals.
- Sheets share presentation, company weekday/Saturday hours and palette with AutoTable; A4 signatures remain on the main sheet and overflowing notes go into an appendix.
- Marketing uses marketing_site_content; identity/About use app_settings with legacy app_config fallback. Writes require master+admin+PIN through the license endpoint; /conheca reads existing app_config plans, never a duplicate plan store. Root and /conheca share a storefront; root forwards legacy recovery tokens.
- Dismissed manager onboarding is stored in an account-scoped legacy namespace key so one company's choice cannot hide another company's onboarding.
- Preserve hardware IDs; normalize regulatory copy on read.
- Kiosk libraries are version-pinned static files; offline cache excludes API/auth/company data.
- Drawer closes before deferred render; home uses gestor-hub and gestor-body without duplicate IDs or cloud-replacing session caches.
- Holidays/rest use zero planned time; Sunday/holiday bank uses employer factor, never salary premiums. Generic rest never infers debt.
- Shared occurrence rules drive sheet/bank/XLS and treatment inbox/batch validation to avoid divergent calculations; periods sync/edit/delete as a unit. External work never synthesizes punches; vacation is neutral.
- Export libraries (jspdf/autotable/jszip/xlsx) load on demand via garantirLib(), never in the initial head; every export entry point awaits it first.
- Initial cloud punch load is windowed to the current month (NUVEM_DESDE); garantirHistorico(dataIni) back-fills older punches on demand for sheet, bank, batch and accountant exports.
- Cloud punch reads are paginated; historical backfill includes bank activation/admission and the prior civil day, and bank views/exports calculate only after loading so opening balances reconcile. Daily statements retain zero-movement and pre-activation days without changing stored punches.
- Repeated legacy punch types are normalized chronologically in derived jornada reads only; unique explicit types and fiscal storage remain intact so old manual records calculate consistently across sheet and bank.
- Schedule grid and legacy imports share lerCelulaEscala and canonical TIPOS_ESC values, so menu options and accepted rest-day aliases retain existing calculation semantics.
- Monthly ZIP is an action inside the sheet and adds a BIFF8 analytical workbook; reporting codes and deduction minutes are not eSocial transmission or wage calculation.
- Super Admin lives only at /admin (own layout, master email + admin role + reserve PIN checked by the license endpoint); the client HTML app has no developer screens. Install icons use versioned filenames so installed shortcuts refresh.
- Plans remain in app_config 'planos', validated by plans.ts with default limits; both client and marketing read the same store, and only master+PIN writes.
- Bank debits come only from Folga Compensatória or incomplete shift (early departure): unjustified absence is wage-deduction only with neutral bank balance, and late arrival (atrasoDia, 10-min tolerance) is a Dashboard-only metric, never a bank debit or sheet column.
- Support uses a bottom pill, never a top banner.
- APK aliases share one redirect URL; terminal links to /download.
- Manual overnight type/jornada persist in punch JSON; civil timestamps stay unchanged.
- /gestor and /quiosque reuse the HTML engine via mode-aware iframe and scoped semantic treatment styles; Supabase session and manager PIN guard access, avoiding duplicated fiscal/auth engines.
- Identity schemas normalize legacy color fields to the fixed institutional palette; surface tokens govern light admin/manager and dark kiosk without recoloring official sheets. Known legacy platform logos resolve to the current CDN asset; custom company logos remain untouched.
- Manager kiosk links and QR contain only the same-origin /quiosque URL, never account identifiers or credentials; opening another device still requires the existing company sign-in.
- Manager limits follow plans; hidden reserves never count.
- Accountant closing excludes open/future absences without altering PDF calculations.
- Capacitor hosts HTTPS /quiosque; no native printer bridge.
- Text over dark navy surfaces must be declared with ID-scoped specificity (e.g. `#gestor-body td.dept-head`) so the shared `#gestor-body td/label` color defaults cannot darken it; contrast.test.ts locks every dark surface to AA.
- Stable cloud reads use expiring account-scoped IndexedDB cache with explicit refresh/invalidation; authorization and punches never use this cache, and audit reads paginate on demand to bound egress.
