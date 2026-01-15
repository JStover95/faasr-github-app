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
     - Repository contents: Read & Write
     - Repository metadata: Read-only
     - Workflows: Read & Write
3. Create the app
4. Generate a private key and save it
5. Generate a client secret and copy it for configuring the backend later
6. Note down the following credentials:
   - App ID
   - Client ID

### 2. Setup Supabase

1. Create a `.env` file in the `supabase` directory based on `.env.template` and populate it with your GitHub App information:

   ```env
   GITHUB_APP_ID=your_app_id
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   GITHUB_PRIVATE_KEY="your_private_key"
   GITHUB_INSTALLATION_URL=https://github.com/apps/<your-app-name>/installations/new
   ```

   **Note:** `GITHUB_PRIVATE_KEY` must be the contents of the private key that you downloaded when creating your app.

2. Navigate to the `supabase` directory:

   ```bash
   cd supabase
   ```

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
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

   You can find the Supabase URL and anon key from the output of `supabase start` in step 2.3

2. In a new terminal navigate to the `frontend` directory:

   ```bash
   cd frontend
   ```

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

1. Open your browser and navigate to `http://localhost:5173`
2. Log in with your GitHub account
3. Click "Install" to install the GitHub App on your forked repository
4. Upload a workflow file using the file upload interface
5. Monitor the workflow registration process
6. View completed workflow runs or upload additional workflows

## Project Structure

```plaintext
/root
├── frontend/          # React frontend application
│   ├── app/           # React Router routes
│   └── src/           # Components, contexts, and utilities
├── supabase/          # Supabase backend
│   ├── functions/     # Edge Functions
│   ├── migrations/    # Database migrations
│   └── tests/         # Backend tests
└── design-docs/       # Technical documentation
```

## Development Notes

- This is a **local development only** proof-of-concept
- The GitHub App must be configured to point to `localhost` URLs
- Ensure all three services (Supabase, backend functions, frontend) are running simultaneously
- The backend validates that installed repositories include a fork of FaaSr/FaaSr-workflow

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
