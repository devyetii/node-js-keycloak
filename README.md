# Node.js Keycloak Confidential Client

A minimal, educational Node.js/Express application that implements a **Keycloak confidential client** using only Keycloak's REST API endpoints — without any official Keycloak adapter or middleware (e.g., `@keycloak/keycloak-nodejs-connect`).

This project demonstrates the raw [OpenID Connect / OAuth 2.0 Authorization Code Flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth) by manually constructing requests to Keycloak's endpoints.

---

## Features

- **Pure REST Implementation** — No Keycloak adapter; all authentication flows are built manually with `fetch`.
- **Authorization Code Flow** — Redirects to Keycloak login, handles callback, exchanges code for tokens.
- **Token Introspection** — Validates access tokens via Keycloak's introspection endpoint.
- **User Info Retrieval** — Fetches user details from Keycloak's UserInfo endpoint using the access token.
- **JWT Route Protection** — A custom Express middleware in `private/routes.js` verifies the access token locally using the realm's public key (`jsonwebtoken`).
- **In-Memory Session State** — Simple state module for demo purposes (see Improvement Plan).

---

## Project Structure

```
.
├── index.js              # Main Express server & Keycloak interaction logic
├── state.js              # In-memory key/value store for tokens/session data
├── private/
│   └── routes.js         # Protected routes with custom JWT middleware
├── package.json
├── .env                  # Environment variables (ignored in production!)
├── key.pem               # Keycloak Realm Public Key for local JWT verification
└── .gitignore
```

---

## How It Works

### 1. Login & Authorization Code Flow

1. User visits `/login`.
2. The app constructs a Keycloak authorization URL and redirects the user.
3. After successful authentication, Keycloak redirects back to `/callback` with an authorization `code`.
4. The app stores the `code` in memory (`state.js`).
5. User clicks **"Get Access Token"** (`/get-access-token`), which exchanges the `code` for:
   - `access_token`
   - `id_token`
   - `refresh_token`

### 2. Token Usage & Introspection

- **`/get-user-info`** — Calls Keycloak's `userinfo` endpoint with the Bearer token.
- **`/introspect`** — Calls Keycloak's `token/introspect` endpoint to validate token metadata.
- **`/account-settings`** — Redirects to the Keycloak account console.
- **`/logout`** — Calls Keycloak's logout endpoint and clears local session state.

### 3. Protected Routes

Routes under `/private` are protected by `routeProtectionMiddleware` (`private/routes.js`):

1. Checks for an `access_token` in memory.
2. If missing, redirects to `/login`.
3. Verifies the JWT signature using the realm's **public key** (`key.pem`) via `jsonwebtoken`.
4. If valid, allows access; otherwise redirects home.

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended for native `fetch`)
- A running [Keycloak](https://www.keycloak.org/) server
- A **confidential client** configured in your Keycloak realm

### Keycloak Client Configuration

| Setting | Value |
|---------|-------|
| Client ID | `your-client-id` |
| Client Secret | `your-client-secret` |
| Access Type | `confidential` |
| Valid Redirect URIs | `http://localhost:3888/callback` |
| Web Origins | `+` or `http://localhost:3888` |

---

## Setup

```bash
# Clone the repository
git clone https://github.com/devyetii/node-js-keycloak.git
cd node-js-keycloak

# Install dependencies
npm install

# Configure environment variables
cp .env .env.local  # Edit .env.local with your Keycloak details
```

### Environment Variables

Create/Edit `.env`:

```env
# Your Keycloak server base URL (include /auth for Keycloak < 17, omit for 17+)
KEYCLOAK_BASE=https://your-keycloak-server/auth

# Realm name
KEYCLOAK_REALM=your-realm

# Client credentials
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret

# App port
PORT=3888

# (Optional) Disable TLS rejection for self-signed certs in dev
NODE_TLS_REJECT_UNAUTHORIZED=0
```

> **Note:** `key.pem` should contain your realm's public key (found in Realm Settings → Keys → Realm Settings → Public Key).

---

## Running the App

```bash
node index.js
```

The server will start on `http://localhost:3888`.

Visit the home page to see available actions and current state.

---

## API / Route Reference

| Route | Description |
|-------|-------------|
| `GET /` | Home page; shows current session state and action buttons |
| `GET /login` | Redirects to Keycloak login page |
| `GET /callback` | OAuth2 callback handler; stores authorization `code` |
| `GET /get-access-token` | Exchanges `code` for tokens |
| `GET /get-user-info` | Retrieves user info from Keycloak |
| `GET /introspect` | Introspects the access token |
| `GET /register` | Redirects to Keycloak user registration page |
| `GET /account-settings` | Redirects to Keycloak account console |
| `GET /logout` | Logs out from Keycloak and clears local state |
| `GET /private/*` | Protected routes requiring a valid access token |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| [express](https://www.npmjs.com/package/express) | Web server framework |
| [dotenv](https://www.npmjs.com/package/dotenv) | Environment variable management |
| [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) | Local JWT verification for `/private` routes |

---

## Improvement Plan

The following enhancements are planned to evolve this demo into a production-grade implementation:

1. **Persistent Session Store** — The current `state.js` module uses a plain in-memory JavaScript object for simplicity. This will be enhanced to use Redis, a database, or signed cookies to support persistence across restarts and horizontal scaling.
2. **HTTPS Support** — The app currently runs on plain HTTP for local development. Production deployment will include TLS/HTTPS configuration to protect tokens in transit.
3. **Environment Management** — `.env` handling will be hardened with `.env` already kept out of version control via `.gitignore`, and secrets management will be enhanced using a dedicated secrets manager or encrypted vault.
4. **CSRF Protection (State Parameter)** — The current login flow passes a `state` parameter but does not validate it in the callback. This will be enhanced by generating and verifying a cryptographically random `state` value to prevent CSRF attacks.
5. **PKCE Extension** — Support for [PKCE](https://oauth.net/2/pkce/) will be added to strengthen the authorization code exchange, aligning with modern OAuth 2.0 security best practices.
6. **Secure Token Storage** — Tokens are currently held in server memory for easy introspection. The implementation will be enhanced to use secure, `HttpOnly` cookies for browser-based sessions, reducing token exposure on the frontend.

---

## License

[ISC](package.json)

---

## Author

[Ebrahim Gomaa](https://github.com/devyetii)
