# Contributing

Thanks for helping improve To Reach All Easily.

## Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Before opening a pull request, run:

```bash
pnpm check
pnpm lint
pnpm build
```

## Pull Requests

- Keep changes focused and explain the user-visible behavior.
- Do not commit credentials, private deployment notes, screenshots, generated builds, or local debug artifacts.
- Use `.env.local` for local secrets and keep `.env.example` limited to placeholders.
- If you change the upstream API shape, update `README.md` and the API docs page.

## Commit Style

Use clear, descriptive commit messages. Conventional Commits are welcome but not required.
