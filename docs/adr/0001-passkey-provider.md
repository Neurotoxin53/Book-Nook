# ADR 0001: Direct SimpleWebAuthn passkey verification

- Status: accepted
- Date: 2026-08-27

## Context

The beta requires discoverable credentials and server-enforced biometric/PIN
verification. Better Auth 1.7.2 and its passkey plugin were prototyped first, as
planned. The package generates passkeys with configurable authenticator
selection, but its verification path calls SimpleWebAuthn with user
verification not required. That fails the security gate even when the browser
was asked to prefer or require verification.

## Decision

Use `@simplewebauthn/server` and `@simplewebauthn/browser` directly. Both
registration and authentication verification set `requireUserVerification` to
`true`. My Book Nook owns the small D1-backed user, credential, session,
challenge, invitation, recovery, and rate-limit layer.

## Consequences

- The app does not depend on an email address, password, or social identity.
- Registration remains invitation-only and creates no durable user until the
  WebAuthn response succeeds.
- Session, recovery, credential-revocation, and migration tests are owned by
  this repository.
- Better Auth can be reconsidered if its server verifier later exposes and
  enforces the required user-verification policy.

