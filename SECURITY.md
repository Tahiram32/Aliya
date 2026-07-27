# Security

Aliya intentionally accepts anonymous, non-sensitive reflection data. Users
are told not to enter legal names, contact details, health information, or
other sensitive data.

## Secrets

- `EVOROZEN_API_KEY` is server-only and must never use a `NEXT_PUBLIC_` prefix.
- `.env`, `.env.local`, and production environment values are gitignored.
- Browser requests terminate at Aliya's route handlers; the Neural Pulse key
  is never returned to the client.

## Reporting a problem

Please open a private security advisory on the GitHub repository rather than a
public issue. Include the affected route, impact, and a minimal reproduction.

Do not include real user data or active credentials in the report.
