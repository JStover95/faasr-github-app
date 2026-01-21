/**
 * Callback V2 Edge Function
 *
 * Handles GitHub OAuth callback:
 * - GET - Exchanges OAuth code for access token, finds installation, sets JWT cookie
 *
 * This is a stateless flow that uses OAuth and stores session in signed JWT cookie.
 *
 * @see design-docs/backend-integration.md - Error handling pattern
 */

import {
  checkInstallationPermissions,
  getInstallationRepos,
  getInstallationToken,
} from "../_shared/github-app.ts";
import { isFork } from "../_shared/repository.ts";
import { Octokit } from "../_shared/deps.ts";
import { getConfig } from "./config.ts";
import { signJWT } from "../_shared/jwt-utils.ts";
import { setAuthCookie } from "../_shared/cookie-utils.ts";

// ERROR CONSTANTS (backend-integration.md pattern)
const CALLBACK_V2_ERRORS = {
  missingCode: "Missing authorization code. Please try again.",
  tokenExchangeFailed:
    "Failed to exchange authorization code. Please try again.",
  noInstallations:
    "No GitHub App installations found. Please install the app first.",
  noForkFound:
    "No fork of the source repository found. Please fork the repository and try again.",
  missingPermissions:
    "The app needs additional permissions. Please reinstall with the required permissions.",
  default: "Installation failed. Please try again.",
} as const;

// DEPENDENCY INJECTION (supabase.md pattern)
export const deps = {
  getConfig,
  checkInstallationPermissions,
  getInstallationRepos,
  getInstallationToken,
  isFork,
  signJWT,
  setAuthCookie,
  Octokit,
  fetch, // For OAuth token exchange and API calls
};

/**
 * Handle GET - Handle GitHub OAuth callback
 */
export async function handleCallbackV2(req: Request): Promise<Response> {
  const {
    githubClientId,
    githubClientSecret,
    githubAppId,
    githubPrivateKey,
    jwtSecret,
  } = deps.getConfig();

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  try {
    // Validate OAuth callback
    if (!code) {
      console.warn("[CALLBACK-V2] Missing code parameter");
      return new Response(
        JSON.stringify({
          success: false,
          error: "missing_code",
          message: CALLBACK_V2_ERRORS.missingCode,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Exchange code for access token
    console.log("[CALLBACK-V2] Exchanging code for access token");
    const tokenResponse = await deps.fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: githubClientId,
          client_secret: githubClientSecret,
          code,
        }),
      },
    );

    if (!tokenResponse.ok) {
      console.error("[CALLBACK-V2] Token exchange failed", {
        status: tokenResponse.status,
      });
      throw new Error("Failed to exchange authorization code");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("[CALLBACK-V2] No access token in response");
      throw new Error("No access token in response");
    }

    // Fetch user's installations
    console.log("[CALLBACK-V2] Fetching user installations");
    const installationsResponse = await deps.fetch(
      "https://api.github.com/user/installations",
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!installationsResponse.ok) {
      console.error("[CALLBACK-V2] Failed to fetch installations", {
        status: installationsResponse.status,
      });
      throw new Error("Failed to fetch installations");
    }

    const installationsData = await installationsResponse.json();
    const installations = installationsData.installations || [];

    if (installations.length === 0) {
      console.warn("[CALLBACK-V2] No installations found");
      return new Response(
        JSON.stringify({
          success: false,
          error: "no_installations",
          message: CALLBACK_V2_ERRORS.noInstallations,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Find installation with fork (reuse existing logic)
    let foundInstallation = null;
    let forkRepoName = null;

    for (const installation of installations) {
      const installationId = String(installation.id);

      // Validate permissions
      const permissionCheck = await deps.checkInstallationPermissions(
        githubAppId,
        githubPrivateKey,
        installationId,
      );

      if (!permissionCheck.valid) {
        console.log("[CALLBACK-V2] Installation missing permissions", {
          installationId,
          missingPermissions: permissionCheck.missingPermissions,
        });
        continue;
      }

      // Get installation repos
      const repos = await deps.getInstallationRepos(
        githubAppId,
        githubPrivateKey,
        installationId,
      );

      // Check for fork
      const { token } = await deps.getInstallationToken(
        githubAppId,
        githubPrivateKey,
        installationId,
      );
      const octokit = new deps.Octokit({ auth: token });

      for (const repo of repos) {
        const isForkRepo = await deps.isFork(
          octokit,
          installation.account.login,
          repo.name,
        );
        if (isForkRepo) {
          foundInstallation = installation;
          forkRepoName = repo.name;
          break;
        }
      }

      if (foundInstallation) break;
    }

    if (!foundInstallation || !forkRepoName) {
      console.warn("[CALLBACK-V2] No fork found");
      return new Response(
        JSON.stringify({
          success: false,
          error: "no_fork_found",
          message: CALLBACK_V2_ERRORS.noForkFound,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Sign JWT with installation data
    console.log("[CALLBACK-V2] Signing JWT", {
      installationId: foundInstallation.id,
      userLogin: foundInstallation.account.login,
    });
    const jwtPayload = {
      installation_id: String(foundInstallation.id),
      gh_user_login: foundInstallation.account.login,
      gh_user_id: foundInstallation.account.id,
      gh_repo_name: forkRepoName,
      gh_avatar_url: foundInstallation.account.avatar_url,
    };

    const token = await deps.signJWT(jwtPayload, jwtSecret);

    // Create response with cookie
    console.log("[CALLBACK-V2] Setting auth cookie");
    const response = new Response(
      JSON.stringify({
        success: true,
        login: foundInstallation.account.login,
        message: "GitHub App installed successfully!",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );

    // Set cookie (reuse utility)
    deps.setAuthCookie(response, token);

    console.log("[CALLBACK-V2] Callback completed successfully");
    return response;
  } catch (error) {
    console.error("[CALLBACK-V2] Error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: "installation_failed",
        message: error instanceof Error
          ? error.message
          : CALLBACK_V2_ERRORS.default,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Main Edge Function handler
 */
export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const userAgent = req.headers.get("user-agent") || "unknown";
  const referer = req.headers.get("referer") || "none";

  console.log("[CALLBACK-V2] Request received", {
    method: req.method,
    fullPath: url.pathname,
    userAgent,
    referer,
    timestamp: new Date().toISOString(),
  });

  try {
    if (req.method === "GET") {
      return await handleCallbackV2(req);
    } else {
      console.warn("[CALLBACK-V2] Method not allowed", {
        method: req.method,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed",
        }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("[CALLBACK-V2] Edge Function error", {
      method: req.method,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
