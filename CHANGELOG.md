# Changelog

All notable changes to My Book Nook are documented here. Releases follow
[Semantic Versioning](https://semver.org/) and changes use Conventional Commits.

## [0.8.0](https://github.com/Neurotoxin53/Book-Nook/compare/v0.7.0...v0.8.0) (2026-08-28)


### Features

* ship My Book Nook private beta ([deaa155](https://github.com/Neurotoxin53/Book-Nook/commit/deaa155741180cd938d12addf10a06854703fc26))


### Bug Fixes

* package D1 migration for Sites ([91edd90](https://github.com/Neurotoxin53/Book-Nook/commit/91edd9080819994668bd4ad67c7877f86b891aa4))

## [0.7.0] - 2026-08-27

### Added

- Passkey-only invitation registration, discoverable login, second credentials,
  revocation, one-time recovery, rate limiting, secure sessions, and account
  deletion backed by D1.
- Durable book, edition, library, review, appearance, genre, import, and local
  migration APIs with ownership enforcement.
- Open Library lookup with edition selection, provenance, editable fields, and
  manual fallback.
- Goodreads CSV parsing, confirmation preview, protected conflict handling,
  idempotent re-import, reports, and undo.
- Eight book constructions, ten room scenes, eight open-book backgrounds, six
  page treatments, five cover treatments, decorations, and accent controls.
- Thirty-six pinned and self-hosted Google Fonts with license and integrity
  metadata.
- Twenty-five primary genres, ten composable facets, explainable scoring, and
  genre-led appearance templates.
- Responsive cover-first library, full-screen editable book, passkey settings,
  PWA metadata, safe-area support, and generated interim brand assets.
- Chromium virtual-authenticator acceptance coverage for registration, login,
  protected writes, recovery, replay rejection, revocation, and deletion.

### Changed

- Replaced the Better Auth prototype with the documented SimpleWebAuthn
  fallback so user verification is required by both ceremonies and server
  verification.
- Replaced device-local-only persistence with D1 while retaining a confirmed,
  non-destructive migration path for genuine prototype data.

## [0.2.0] - 2026-08-27

### Added

- My Book Nook product name and hosted beta identity.
- Automated lint, type, test, and production-build checks.
- Release Please configuration for changelogs, tags, and GitHub Releases.
- A graphic-design handoff brief and a versioned product roadmap.

### Changed

- Product versions are distinct from Sites deployment revision numbers.

[0.2.0]: https://github.com/Neurotoxin53/Book-Nook/releases/tag/v0.2.0
[0.7.0]: https://github.com/Neurotoxin53/Book-Nook/releases/tag/v0.7.0
