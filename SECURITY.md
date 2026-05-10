# Security Policy

## Reporting a Vulnerability

Please do not report security issues through public GitHub Issues.

Send a private report to the repository owner, or open a private vulnerability report on GitHub if the repository settings allow it.

Include:

- Affected version or commit.
- Reproduction steps.
- Impact and affected data or credentials, if known.
- Any suggested mitigation.

## Secrets

This public repository must not contain real API keys, OAuth secrets, database URLs, tunnel credentials, production server passwords, or private deployment notes.

Use `.env.local` for local configuration and keep only non-sensitive placeholders in `.env.example`.
