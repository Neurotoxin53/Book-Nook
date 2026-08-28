# My Book Nook

My Book Nook is a private, passkey-only reading journal. Its home screen is a
quiet, cover-first library; opening a book reveals a full-screen two-page
journal with editable metadata on the left and a star rating plus rich review
space on the right.

The private beta is hosted at
[my-book-nook.samxl.chatgpt.site](https://my-book-nook.samxl.chatgpt.site).
Public signup, public reviews, and a custom domain are intentionally not part of
this release.

## What is implemented

- Invitation-only, discoverable passkey accounts with required biometric/PIN
  verification, server sessions, second-passkey enrollment, revocation, and
  one-time recovery-key replacement.
- Durable Cloudflare D1 storage for books, editions, library entries, reviews,
  appearances, genres, imports, migrations, credentials, and sessions.
- One-time migration of genuine books from the legacy device-local prototype;
  demo books are excluded and the local copy is retained after confirmation.
- Exact-ISBN, title-plus-author, and title-only lookup through Open Library,
  with editable fields, edition selection, provenance, and manual fallback.
- Local Goodreads CSV parsing, row preview and confirmation, ISBN-first
  matching, protected user edits, idempotent re-import, reporting, and undo.
- A versioned customization registry with 8 bindings, 10 rooms, 8 opened-book
  backgrounds, 6 page treatments, 5 cover treatments, decorations, and accent
  colors.
- 36 curated Google Fonts in 6 groups. Latin WOFF2 assets are pinned,
  integrity-checked, licensed, and self-hosted; only the selected family loads.
- A 25-genre taxonomy plus 10 composable facets, explainable confidence
  scoring, genre-led appearance recipes, and permanent user overrides.
- Responsive dialogs, safe-area support, 44 px mobile controls, visible mobile
  search, two-page phone navigation, focus trapping, keyboard star ratings,
  reduced-motion support, and a shell-only PWA cache.
- Automated unit, build, font-integrity, and Chromium virtual-authenticator
  acceptance tests.

## Local development

Requirements: Node.js 22.13 or newer and pnpm 11.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The Sites development
runtime provides a local D1 database under `.wrangler/`, which is ignored by
Git.

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm check` runs the full sequence when the Chromium runtime is installed.
The end-to-end test creates and deletes only an isolated local test account.

## Authentication configuration

Production requires these private Site environment variables:

- `AUTH_SECRET`: at least 32 random characters.
- `RECOVERY_PEPPER`: an independent high-entropy secret.
- `INVITE_ADMIN_USER_IDS`: comma-separated Sites account IDs allowed to issue
  registration invitations.
- `AUTH_ALLOWED_ORIGINS`: optional additional origins for rehearsing the later
  custom-domain migration.

The initial Site owner can open **Unlock with passkey → Use invitation → Site
owner setup** to issue the first signed invitation while the account database is
empty. The server requires the Sites-authenticated identity for that one-time
bootstrap and enforces the configured admin allowlist after registration.

## Data and privacy boundaries

- The raw Goodreads export never leaves the browser; only normalized,
  reader-confirmed rows are sent to the app API.
- Open Library outages do not block manual book entry or access to saved data.
- Imported/provider data never silently overwrites a field or review edited by
  the reader.
- No email address, password, Google identity, or Apple identity is collected.
- Losing every passkey and the recovery key makes the account unrecoverable.

## Release and architecture notes

- Product versions follow SemVer and are shown only in Settings/About.
- Sites deployment revisions are deliberately separate from product versions.
- Conventional Commits and Release Please maintain future changelogs, tags,
  and GitHub Releases.
- The future native client should use the existing API only after the custom
  domain is stable. Domain migration requires passkey re-enrollment because
  WebAuthn credentials are scoped to their relying-party domain.

See [the roadmap](docs/roadmap.md), [passkey provider ADR](docs/adr/0001-passkey-provider.md),
and [graphic-design brief](docs/brand-brief.md) for the remaining acceptance and
brand work.

Demo cover images use the [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers).
