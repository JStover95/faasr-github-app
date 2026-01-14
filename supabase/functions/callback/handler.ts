/**
 * Callback Edge Function
 *
 * Handles GitHub App installation callback:
 * - GET - Handles installation callback, creates fork, establishes session
 *
 * Session management is handled by Supabase Auth client on the frontend.
 */

import {
  checkInstallationPermissions,
  getInstallation,
  getInstallationRepos,
  getInstallationToken,
} from "../_shared/github-app.ts";
import { isFork } from "../_shared/repository.ts";
import { Octokit } from "../_shared/deps.ts";
import { getConfig } from "./config.ts";
import { createSupabaseClient } from "../_shared/supabase-client.ts";

/**
 * Services object for dependency injection and testing
 * This allows functions to be stubbed in tests
 */
export const deps = {
  getInstallation,
  checkInstallationPermissions,
  getInstallationToken,
  getInstallationRepos,
  isFork,
  Octokit,
  createSupabaseClient,
  getConfig,
};

/**
 * Handle GET - Handle GitHub App installation callback
 * This handles the GitHub App installation callback.
 */
export async function handleCallback(req: Request): Promise<Response> {
  const { frontendUrl, githubAppId, githubPrivateKey } = deps.getConfig();

  const url = new URL(req.url);
  const installationId = url.searchParams.get("installation_id");

  try {
    if (!installationId) {
      console.warn(
        "[CALLBACK] Callback failed: Missing installation_id parameter",
      );

      const redirectUrl = new URL("/install", frontendUrl);
      redirectUrl.searchParams.set("error", "missing_installation_id");
      redirectUrl.searchParams.set(
        "message",
        "Missing installation ID. Please try installing again.",
      );

      return new Response(null, {
        status: 302,
        headers: {
          Location: redirectUrl.toString(),
        },
      });
    }

    console.log("[CALLBACK] Fetching installation information", {
      installationId,
    });

    const installation = await deps.getInstallation(
      githubAppId,
      githubPrivateKey,
      installationId,
    );

    console.log("[CALLBACK] GitHub installation retrieved");

    console.log("[CALLBACK] Validating installation permissions", {
      installationId,
    });

    // Validate permissions
    const permissionCheck = await deps.checkInstallationPermissions(
      githubAppId,
      githubPrivateKey,
      installationId,
    );

    if (!permissionCheck.valid) {
      console.warn("[CALLBACK] Permission check failed", {
        installationId,
        missingPermissions: permissionCheck.missingPermissions,
      });

      const redirectUrl = new URL("/install", frontendUrl);

      redirectUrl.searchParams.set("error", "missing_permissions");
      redirectUrl.searchParams.set(
        "message",
        "The app needs additional permissions. Please reinstall with the required permissions.",
      );

      return new Response(null, {
        status: 302,
        headers: {
          Location: redirectUrl.toString(),
        },
      });
    }

    console.log("[CALLBACK] Permissions validated successfully");

    console.log("[CALLBACK] Getting installation token", {
      installationId,
    });

    // Get installation token to authenticate API requests
    const { token } = await deps.getInstallationToken(
      githubAppId,
      githubPrivateKey,
      installationId,
    );

    console.log("[CALLBACK] Installation token retrieved");

    // Create Octokit instance for API calls
    const octokit = new deps.Octokit({ auth: token });

    console.log("[CALLBACK] Fetching installation repositories", {
      installationId,
    });

    // Get repositories accessible to the installation
    const repos = await deps.getInstallationRepos(
      githubAppId,
      githubPrivateKey,
      installationId,
    );

    console.log("[CALLBACK] Installation repositories retrieved", {
      repoCount: repos.length,
    });

    // Find the fork repository
    let forkRepoName: string | null = null;
    for (const repo of repos) {
      const isForkRepo = await deps.isFork(
        octokit,
        installation.account.login,
        repo.name,
      );
      if (isForkRepo) {
        forkRepoName = repo.name;
        break;
      }
    }

    if (!forkRepoName) {
      console.warn("[CALLBACK] No fork repository found", {
        installationId,
        accountLogin: installation.account.login,
        repoCount: repos.length,
      });

      const redirectUrl = new URL("/install", frontendUrl);
      redirectUrl.searchParams.set("error", "no_fork_found");
      redirectUrl.searchParams.set(
        "message",
        "No fork of the source repository found. Please fork the repository and try again.",
      );

      return new Response(null, {
        status: 302,
        headers: {
          Location: redirectUrl.toString(),
        },
      });
    }

    console.log("[CALLBACK] Fork repository found", {
      installationId,
      forkRepoName,
    });

    console.log(
      "[CALLBACK] Inserting GitHub installation into public.profiles",
      {
        installationId,
        accountLogin: installation.account.login,
        accountId: installation.account.id,
        avatarUrl: installation.account.avatar_url,
        forkRepoName,
      },
    );

    // Insert GitHub installation into public.profiles
    const supabase = deps.createSupabaseClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      console.warn("[CALLBACK] Failed to get user", {
        error: error?.message,
      });

      const redirectUrl = new URL("/install", frontendUrl);
      redirectUrl.searchParams.set("error", "failed_to_get_user");
      redirectUrl.searchParams.set(
        "message",
        "Failed to get user. Please try again.",
      );

      return new Response(null, {
        status: 302,
        headers: {
          Location: redirectUrl.toString(),
        },
      });
    }

    const profileId = data.user.id;
    await supabase.rpc("insert_gh_installation", {
      profile_id: profileId,
      gh_installation_id: installationId,
      gh_user_login: installation.account.login,
      gh_user_id: installation.account.id,
      gh_avatar_url: installation.account.avatar_url,
      gh_repo_name: forkRepoName,
    });

    console.log("[CALLBACK] GitHub installation inserted into public.profiles");

    console.log("[CALLBACK] Callback completed successfully");

    // Get frontend URL for redirect
    const redirectUrl = new URL("/install", frontendUrl);
    redirectUrl.searchParams.set("success", "true");
    redirectUrl.searchParams.set("login", installation.account.login);

    console.log("[CALLBACK] Redirecting to frontend", {
      redirectUrl: redirectUrl.toString(),
    });

    // Redirect to frontend with success parameters
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
      },
    });
  } catch (error) {
    console.error("[CALLBACK] Callback error", {
      installationId: installationId || "unknown",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Provide user-friendly error messages
    let errorCode = "installation_failed";
    let errorMessage = "Installation failed. Please try again.";
    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        errorCode = "rate_limit";
        errorMessage = "Too many requests. Please try again in a few minutes.";
      } else if (error.message.includes("permission")) {
        errorCode = "missing_permissions";
        errorMessage =
          "The app needs additional permissions. Please reinstall.";
      } else if (error.message.includes("fork")) {
        errorCode = "no_fork_found";
        errorMessage =
          "No fork of the source repository found. Please fork the repository and try again.";
      } else {
        errorMessage = error.message;
      }
    }

    const redirectUrl = new URL("/install", frontendUrl);
    redirectUrl.searchParams.set("error", errorCode);
    redirectUrl.searchParams.set("message", errorMessage);

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
      },
    });
  }
}

/**
 * Main Edge Function handler
 */
export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const userAgent = req.headers.get("user-agent") || "unknown";
  const referer = req.headers.get("referer") || "none";

  console.log("[CALLBACK] Request received", {
    method: req.method,
    fullPath: url.pathname,
    userAgent,
    referer,
    timestamp: new Date().toISOString(),
  });

  try {
    // Only support GET method
    if (req.method === "GET") {
      return await handleCallback(req);
    } else {
      console.warn("[CALLBACK] Method not allowed", {
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
    console.error("[CALLBACK] Edge Function error", {
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
