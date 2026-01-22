# FaaSr GitHub App

A proof-of-concept GitHub application for uploading and registering FaaSr workflows to a fork of the [FaaSr/FaaSr-workflow](https://github.com/FaaSr/FaaSr-workflow) repository.

## Overview

This application streamlines the process of uploading workflow files to a forked FaaSr repository and automatically triggers workflow registration. It provides a user-friendly interface for managing FaaSr workflows without requiring manual Git operations.

### User Flow

1. **Fork Repository**: User navigates to the FaaSr/FaaSr-workflow repository on GitHub and creates a fork to their account
2. **Login**: User logs in to the application (or creates an account on first visit)
3. **Install GitHub App**: User clicks "Install" and is redirected to GitHub
4. **Configure Installation**: User installs the app on their forked repository (the backend validates that at least one installed repository is a fork of FaaSr/FaaSr-workflow)
5. **Upload Workflow**: User uploads a workflow file through the application interface
6. **Automatic Processing**: The app commits the workflow file to the fork and triggers the FaaSr Register workflow
7. **View Results**: User can view the workflow run status or upload additional workflow files

## Architecture

- **Frontend**: React application built with Vite and React Router
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth and GitHub OAuth via GitHub App

## Prerequisites

- [Node.js](https://nodejs.org/) (for frontend development)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
  - Windows: `scoop install supabase`
  - macOS/Linux: `brew install supabase/tap/supabase`
- A GitHub account with permissions to create GitHub Apps

## Setup Guide

> **Note**: This is a proof-of-concept for local development and demonstration only. No live resources are deployed.

### 1. Create a GitHub App

1. Navigate to [GitHub Developer Settings](https://github.com/settings/apps) and create a new GitHub App
2. Configure the following settings:
   - **Homepage URL**: `https://faasr.io/`
   - **Callback URL**: `http://localhost:5173/callback`
   - Enable **Request user authorization (OAuth) during installation**
   - Disable Webhooks
   - Enable necessary permissions:
     - **Actions**: Read & Write
     - **Repository contents**: Read & Write
     - **Repository metadata**: Read-only
3. Create the app
4. Generate a private key and save it
5. Generate a client secret and copy it for configuring the backend later
6. Note down the following credentials:
   - App ID
   - Client ID

### 2. Setup Supabase

1. Create a `.env` file in the `supabase` directory based on `.env.template` and populate it with your GitHub App information:

   ```env
   # GitHub App Configuration (required for both V1 and V2)
   GITHUB_APP_ID=your_app_id
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   GITHUB_PRIVATE_KEY="your_private_key"
   GITHUB_INSTALLATION_URL=https://github.com/apps/<your-app-name>/installations/new

   # V2 Stateless Flow Configuration (required only for V2)
   JWT_SECRET=your_256_bit_secret_key_here_use_openssl_rand_hex_32
   GITHUB_OAUTH_CALLBACK_URL_V2=http://localhost:5173/v2/callback
   ```

   **Environment Variable Details:**
   - `GITHUB_APP_ID`: Your GitHub App's numeric ID (found in app settings)
   - `GITHUB_CLIENT_ID`: OAuth client ID for your GitHub App
   - `GITHUB_CLIENT_SECRET`: OAuth client secret (keep this secret!)
   - `GITHUB_PRIVATE_KEY`: Complete contents of the `.pem` private key file (including `-----BEGIN RSA PRIVATE KEY-----` headers)
   - `GITHUB_INSTALLATION_URL`: URL to install your app (for V1 flow)
   - `JWT_SECRET`: 256-bit secret for V2 JWT signing (generate with: `openssl rand -hex 32`)
   - `GITHUB_OAUTH_CALLBACK_URL_V2`: V2 OAuth callback URL (must match GitHub App settings)

2. Open a terminal the `supabase` directory.

3. Start Supabase:

   ```bash
   supabase start
   ```

4. Start the backend server:

   ```bash
   supabase functions serve --env-file .env
   ```

   The backend will be available at `http://localhost:54321`

### 3. Setup Frontend

1. Create a `.env.local` file in the `frontend` directory based on `.env.template` and add your local Supabase credentials:

   ```env
   VITE_SUPABASE_URL=http://localhost:54321
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   VITE_SUPABASE_FUNCTIONS_ENDPOINT=/api
   ```

   **Environment Variable Details:**
   - `VITE_SUPABASE_URL`: Supabase API URL (for V1 database-backed auth)
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase anonymous key (for V1 auth)
   - `VITE_SUPABASE_FUNCTIONS_ENDPOINT`: Base URL for Supabase Edge Functions (used by V2 stateless flow)

   You can find the Supabase URL and publishable key from the output of `supabase start` in step 2.3.

   **Note:** The `VITE_SUPABASE_FUNCTIONS_ENDPOINT` enables the Vite proxy (configured in `vite.config.ts`) to route API requests through `/api` to avoid CORS issues during local development.

2. Open a new terminal in the `frontend` directory.

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173`

## Usage

### V1 Flow (Database-backed)

1. Open your browser and navigate to `http://localhost:5173`
2. Log in with your GitHub account (or create an account)
3. Click "Install" to install the GitHub App on your forked repository
4. Upload a workflow file using the file upload interface
5. Monitor the workflow registration process
6. View completed workflow runs or upload additional workflows

### V2 Stateless Flow (Cookie-Based Authentication)

The `/v2/` routes demonstrate a stateless, cookie-based authentication flow that eliminates the need for database-backed user sessions.

#### Key Features

- **No user accounts or password management** - Users authenticate directly via GitHub OAuth
- **No database storage** - Installation data is stored in signed JWT cookies (HS256)
- **7-day cookie expiration** - Sessions automatically expire after 7 days
- **Secure cookies** - httpOnly, Secure, and SameSite attributes prevent XSS and CSRF attacks
- **Same functionality** - Upload and manage workflows just like V1

#### Authentication Flow

```plaintext
1. User clicks "Install GitHub App"
   ↓
2. install-v2 function returns GitHub OAuth authorization URL
   ↓
3. User authorizes on GitHub
   ↓
4. GitHub redirects to callback-v2 with authorization code
   ↓
5. callback-v2 function:
   - Exchanges code for GitHub access token
   - Fetches user's GitHub App installations
   - Validates installation has required permissions
   - Finds installation with FaaSr-workflow fork
   - Signs JWT with installation data (installation_id, user_login, repo_name, etc.)
   - Sets httpOnly, secure cookie (faasr_session_v2)
   - Redirects to /v2/home
   ↓
6. Frontend automatically includes cookie in subsequent requests
   ↓
7. Backend functions verify cookie via auth-status-v2
```

#### Setup for V2 Flow

In addition to the standard setup, V2 requires:

1. **Update GitHub App Callback URL**: Add the V2 callback URL to your GitHub App settings:
   - Go to your GitHub App settings
   - Under "Callback URL", add: `http://localhost:5173/v2/callback`
   - Save changes

2. **Generate JWT Secret**: Create a secure 256-bit secret for signing JWTs:

   ```bash
   openssl rand -hex 32
   ```

3. **Add V2 Environment Variables** to `supabase/.env`:

   ```env
   # V2 Stateless Flow Configuration
   JWT_SECRET=your_256_bit_secret_key_here_use_openssl_rand_hex_32
   GITHUB_OAUTH_CALLBACK_URL_V2=http://localhost:5173/v2/callback
   ```

4. **Restart Supabase Functions** to apply the new environment variables:

   ```bash
   # Stop and restart in the supabase directory
   supabase functions serve --env-file .env --no-verify-jwt
   ```

   **Note:** `--no-verify-jwt` is required to bypass Supabase Auth.

#### Using V2 Flow

1. Open your browser and navigate to `http://localhost:5173/v2`
2. Click "Get Started" to view the flow explanation
3. Click "Install GitHub App" on the home page
4. Authorize with GitHub (no account creation needed)
5. After authorization, you'll be redirected back with the app installed
6. Upload workflow files as normal
7. (Optional) Use the logout button in the header to clear your session cookie

#### V2 Backend Functions

- **`install-v2`** - Generates GitHub OAuth authorization URL
- **`callback-v2`** - Handles OAuth callback, validates installation, sets JWT cookie
- **`auth-status-v2`** - Verifies JWT cookie and returns user session info
- **`logout-v2`** - Clears the authentication cookie
- **`workflows-v2`** - Handles workflow upload and status checks (requires valid cookie)

#### V2 Frontend Implementation

The V2 frontend uses React Context API to manage authentication and workflow state:

**StatelessAuthContext** (`src/contexts/StatelessAuthContext/`)

- Manages authentication state without database dependency
- Automatically checks auth status on mount via `auth-status-v2` endpoint
- Provides `checkAuth()` and `logout()` actions
- State includes: `isAuthenticated`, `userLogin`, `avatarUrl`, `repoName`, `loading`, `error`

**StatelessWorkflowsContext** (`src/contexts/StatelessWorkflowsContext/`)

- Manages workflow installation, upload, and registration status
- Automatically checks installation status when authenticated
- Provides actions:
  - `checkInstallation()` - Refreshes installation status
  - `initiateInstall()` - Starts GitHub OAuth flow
  - `uploadWorkflow(file, customContainers)` - Uploads workflow and triggers registration
  - `pollRegistrationStatus(fileName)` - Polls for registration completion
- State includes:
  - `installationStatus`: "checking" | "installed" | "not_installed" | "error"
  - `uploadStatus`: "idle" | "uploading" | "uploaded" | "error"
  - `registrationStatus`: "idle" | "polling" | "success" | "failed" | "error"
  - `uploadedFile`, `registrationData`, `loading`, `error`

**Key Patterns**:

- All fetch calls include `credentials: "include"` to send cookies
- Polling mechanism for async registration workflow (3-second interval, 5-minute timeout)
- Single state object pattern for each context (see `design-docs/frontend-patterns.md`)
- Error constants for consistent error messaging
- Toast notifications for user feedback

#### Key Differences from V1

| Feature | V1 (Database-backed) | V2 (Stateless) |
| --------- | --------------------- | ---------------- |
| User accounts | Required (Supabase Auth) | Not needed |
| Session storage | PostgreSQL database | Signed JWT cookies |
| Authentication | Email/password + GitHub | GitHub OAuth only |
| Setup complexity | Database migrations required | Just environment variables |
| Scalability | Database-dependent | Stateless, highly scalable |
| User management | Full Supabase Auth features | None (session in cookie) |
| Session revocation | Immediate | Only on cookie expiration |
| Multi-device sessions | Supported | Each device gets own cookie |
| User data persistence | Permanent (in database) | Until cookie expires (7 days) |

#### When to Use V1 vs V2

**Use V1 (Database-backed) if you need:**

- User account management and profiles
- Persistent user data beyond sessions
- Session revocation and management
- Multi-device session tracking
- User activity logging
- Fine-grained access control
- Traditional email/password authentication

**Use V2 (Stateless) if you want:**

- Simplified deployment (no database required)
- Maximum scalability (stateless architecture)
- Minimal setup and maintenance
- GitHub-only authentication
- No user data storage requirements
- Quick proof-of-concept or demo
- Privacy-focused approach (no user data stored)

#### Session Management Details

**JWT Payload Structure**:

```typescript
{
  installation_id: string;      // GitHub App installation ID
  gh_user_login: string;        // GitHub username
  gh_user_id: number;           // GitHub user ID
  gh_repo_name: string;         // Fork repository name
  gh_avatar_url?: string;       // User avatar URL
  iat: number;                  // Issued at timestamp
  exp: number;                  // Expiration timestamp (iat + 7 days)
  jti: string;                  // Unique JWT ID (nonce)
}
```

**Cookie Configuration**:

- **Name**: `faasr_session_v2`
- **Max-Age**: 604,800 seconds (7 days)
- **HttpOnly**: Yes (prevents JavaScript access, mitigates XSS)
- **Secure**: Yes (HTTPS only in production)
- **SameSite**: Strict (prevents CSRF attacks)
- **Path**: `/` (available to all routes)

**Shared Utilities** (`supabase/functions/_shared/`):

- **`cookie-utils.ts`** - Cookie setting/reading/clearing functions
- **`jwt-utils.ts`** - JWT signing and verification using jose library (HS256)
- **`session-utils.ts`** - Extracts and validates UserSession from JWT cookie
- **`github-app.ts`** - GitHub App API interactions (used by both V1 and V2)
- **`github-client.ts`** - GitHub API client service
- **`workflow-upload-service.ts`** - Workflow upload logic (used by both V1 and V2)
- **`workflow-status-service.ts`** - Workflow status checking (used by both V1 and V2)

#### Security Considerations

- **JWT Secret**: Must be kept secret and never exposed to the frontend
- **Cookie Security**: Cookies are httpOnly (not accessible via JavaScript), Secure (HTTPS only in production), and SameSite=Strict (prevents CSRF)
- **Token Expiration**: JWTs expire after 7 days and cannot be refreshed
- **No Revocation**: Since sessions are stateless, you cannot revoke a session before cookie expiration
- **Local Development**: In development, cookies work over HTTP for testing convenience
- **Nonce (JTI)**: Each JWT includes a unique random nonce to prevent token reuse
- **Signature Verification**: All incoming cookies are cryptographically verified before use

## Project Structure

```plaintext
/root
├── frontend/                    # React frontend application
│   ├── app/
│   │   ├── routes/
│   │   │   ├── (auth)/         # V1 auth routes (login, signup)
│   │   │   ├── v2/             # V2 stateless routes
│   │   │   │   ├── _layout.tsx      # V2 layout with stateless contexts
│   │   │   │   ├── index.tsx        # V2 landing page
│   │   │   │   ├── home.tsx         # V2 main app page
│   │   │   │   └── callback.tsx     # V2 OAuth callback handler
│   │   │   ├── callback.tsx    # V1 installation callback
│   │   │   ├── home.tsx        # V1 main app page
│   │   │   └── install.tsx     # V1 installation page
│   │   └── root.tsx            # Root layout
│   └── src/
│       ├── components/         # Reusable UI components
│       └── contexts/
│           ├── AuthContext/              # V1 database-backed auth
│           ├── WorkflowsContext/         # V1 workflows management
│           ├── StatelessAuthContext/     # V2 cookie-based auth
│           └── StatelessWorkflowsContext/ # V2 workflows management
├── supabase/                    # Supabase backend
│   ├── functions/
│   │   ├── _shared/            # Shared utilities
│   │   │   ├── cookie-utils.ts      # Cookie management
│   │   │   ├── jwt-utils.ts         # JWT signing/verification
│   │   │   ├── session-utils.ts     # Session extraction
│   │   │   └── ...                  # Other shared utilities
│   │   ├── install/            # V1 installation handler
│   │   ├── callback/           # V1 callback handler
│   │   ├── workflows/          # V1 workflows handler
│   │   ├── install-v2/         # V2 OAuth redirect
│   │   ├── callback-v2/        # V2 OAuth callback + JWT cookie
│   │   ├── auth-status-v2/     # V2 session verification
│   │   ├── logout-v2/          # V2 cookie clearing
│   │   └── workflows-v2/       # V2 workflows handler (cookie auth)
│   ├── migrations/             # Database migrations (V1 only)
│   └── tests/                  # Backend tests
└── design-docs/                # Technical documentation
```

## Development Notes

- This is a **local development only** proof-of-concept
- The GitHub App must be configured to point to `localhost` URLs
- Ensure all three services (Supabase, backend functions, frontend) are running simultaneously
- The backend validates that installed repositories include a fork of FaaSr/FaaSr-workflow

## V2 API Reference

### Frontend Routes

| Route | Description |
| ------- | ------------- |
| `/v2` | V2 landing page with flow explanation |
| `/v2/home` | Main application page (install, upload workflows) |
| `/v2/callback` | OAuth callback handler (processes GitHub redirect) |

### Backend Endpoints

All endpoints are prefixed with the Supabase Functions URL (e.g., `http://localhost:54321/functions/v1/`).

| Endpoint | Method | Description | Authentication |
| ---------- | -------- | ------------- | ---------------- |
| `install-v2` | GET | Returns GitHub OAuth authorization URL | None |
| `callback-v2?code={code}` | GET | Processes OAuth callback, sets JWT cookie | None |
| `auth-status-v2` | GET | Verifies cookie and returns session info | Cookie required |
| `logout-v2` | POST | Clears authentication cookie | Cookie required |
| `workflows-v2` | POST | Upload workflow file (FormData with `file` and `custom_containers`) | Cookie required |
| `workflows-v2?filename={name}` | GET | Get workflow registration status | Cookie required |

### Response Formats

**`install-v2` Response:**

```json
{
  "success": true,
  "redirectUrl": "https://github.com/login/oauth/authorize?client_id=...",
  "message": "Redirect to GitHub OAuth"
}
```

**`callback-v2` Success Response:**

```json
{
  "success": true,
  "login": "username",
  "message": "GitHub App installed successfully!"
}
```

**`auth-status-v2` Success Response:**

```json
{
  "userLogin": "username",
  "avatarUrl": "https://avatars.githubusercontent.com/...",
  "repoName": "FaaSr-workflow"
}
```

**`workflows-v2` Upload Success Response:**

```json
{
  "success": true,
  "message": "Workflow uploaded and registration triggered",
  "fileName": "workflow.json",
  "commitSha": "abc123...",
  "workflowRunId": 12345,
  "workflowRunUrl": "https://github.com/user/repo/actions/runs/12345"
}
```

**`workflows-v2` Status Response:**

```json
{
  "fileName": "workflow.json",
  "status": "success",
  "workflowRunId": 12345,
  "workflowRunUrl": "https://github.com/user/repo/actions/runs/12345",
  "triggeredAt": "2026-01-22T12:00:00Z",
  "completedAt": "2026-01-22T12:05:00Z"
}
```

**Error Response Format:**

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable error message"
}
```

## License

MIT License

Copyright (c) 2026 FaaSr

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
