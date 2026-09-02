# SeqCraft Security and Privacy

## Data boundary

Raw biological sequences are local-only. The server and MongoDB may receive identity, preferences, project names, document names, lengths, alphabet/topology, and opaque local storage keys. They must not receive sequence strings, imported file bodies, derived constructs, clipboard contents, or analysis results capable of reconstructing a sequence.

This is enforced with strict allow-list schemas and small request limits. There is no generic document upload endpoint.

## Authentication

Production auth uses Better Auth with HTTP-only cookies and MongoDB. `BETTER_AUTH_SECRET` must be at least 32 high-entropy characters. Google OAuth is enabled only when both Google variables are configured. Guest mode is explicit and never simulates a production session.

Never commit `.env`, OAuth secrets, Atlas credentials, cookies, or exported user data.

## WebMCP trust model

- Read-only and UI-mutating tools declare their effects truthfully.
- Imported/user-authored output is marked with `untrustedContentHint`.
- Inputs and outputs are bounded.
- WebMCP calls use the same validated application commands as the visible UI.
- Annotation and cloning changes are staged for human approval.
- Tool descriptions are developer-authored and never interpolate imported content.

## Reporting

Until a dedicated security mailbox exists, open a private GitHub security advisory on the repository. Do not include private sequence data in a report.
