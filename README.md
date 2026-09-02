# SeqCraft

SeqCraft is a local-first molecular biology workbench built for humans and WebMCP agents. It combines deterministic sequence visualization and cloning/PCR analysis with agent-readable tools that operate the same workspace a scientist sees.

## Why it is different

- **Private scientific data plane:** raw sequences, imported files, selections, and derived constructs stay in browser memory, OPFS, or IndexedDB.
- **Optional cloud control plane:** Node.js, Better Auth, Google OAuth, and MongoDB Atlas handle identity and sequence-free metadata only.
- **Real WebMCP workflows:** 16 tools inspect, navigate, digest, analyze primers/PCR, find ORFs, compare constructs, and stage restriction-cloning or annotation proposals.
- **Human-in-the-loop changes:** persistent agent-authored scientific changes are previews until a user approves them.
- **Coordinate correctness:** internal intervals are 0-based half-open; human and WebMCP coordinates are explicitly 1-based inclusive.

## Scientific workspace

SeqCraft currently supports FASTA/GenBank/raw import, virtualized sequence viewing, 2D/3D circular maps, annotations, primers, restriction analysis and digests, PCR simulation, six-frame ORFs, construct comparison, and restriction-cloning proposals.

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev:all
```

Open `http://localhost:5173`. With no secrets configured, SeqCraft runs in private guest mode and retains the complete local scientific experience.

Useful checks:

```bash
npm run build
npm test
npm run lint
```

## Optional account control plane

Copy `.env.example` to `.env` and supply MongoDB Atlas and Better Auth values when ready. Google sign-in also needs OAuth client credentials with this redirect URI:

```text
${BETTER_AUTH_URL}/api/auth/callback/google
```

The API deliberately has no sequence upload endpoint. Project sync accepts only allow-listed document descriptors: identifier, display name, length, alphabet, topology, and an opaque browser-local storage key.

For production, build and start the unified server:

```bash
npm run build
NODE_ENV=production npm start
```

Deploy behind HTTPS on one origin. Preserve these response headers for WebMCP:

```text
Origin-Agent-Cluster: ?1
Permissions-Policy: tools=(self)
```

## Architecture

```text
Browser (private)                              Node control plane

React UI + WebMCP                             Express + Better Auth
        │                                              │
application commands                         policy + metadata API
        │                                              │
scientific engine + workers                  MongoDB Atlas
        │                                              │
OPFS / IndexedDB raw sequences               no biological sequence bytes
```

The detailed contracts live in:

- `FOR_AI_AGENTS/FEATURES.md`
- `FOR_AI_AGENTS/DESIGN.md`
- `FOR_AI_AGENTS/IMPLEMENTATION.md`
- `SECURITY.md`
- `CHALLENGE_SUBMISSION.md`

## License

[MIT](LICENSE)
