/**
 * Error Handler Utility
 *
 * Provides centralized error handling and user-friendly error message formatting.
 * Converts technical errors into user-friendly messages for API responses.
 */

/**
 * Format error message to be user-friendly
 *
 * Handles comprehensive error scenarios including:
 * - Rate limits (GitHub API rate limiting)
 * - Permission errors (missing GitHub App permissions)
 * - Network failures (connection timeouts, DNS errors)
 * - Validation errors (invalid JSON, file size limits)
 * - Configuration errors (missing environment variables)
 * - Not found errors (repository, workflow, file not found)
 *
 * @param error - Error object or unknown error
 * @param defaultMessage - Default message if error cannot be formatted
 * @returns User-friendly error message
 */
export function formatErrorMessage(
  error: unknown,
  defaultMessage: string = "An error occurred",
): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Rate limit errors
    if (
      message.includes("rate limit") ||
      message.includes("rate_limit") ||
      message.includes("too many requests") ||
      message.includes("429")
    ) {
      return "Too many requests. Please try again in a few minutes.";
    }

    // Permission errors
    if (
      message.includes("permission") ||
      message.includes("forbidden") ||
      message.includes("403") ||
      message.includes("access denied")
    ) {
      return "Permission denied. Please check your GitHub App permissions.";
    }

    // Network failures
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("connection") ||
      message.includes("dns") ||
      message.includes("econnrefused") ||
      message.includes("enotfound") ||
      message.includes("fetch failed")
    ) {
      return "Network error: Unable to connect to GitHub. Please check your internet connection and try again. If the problem persists, GitHub may be experiencing issues.";
    }

    // Not found errors
    if (
      message.includes("not found") ||
      message.includes("404") ||
      message.includes("does not exist")
    ) {
      return "Resource not found. Please check your repository and workflow configuration.";
    }

    // Validation errors
    if (
      message.includes("invalid") ||
      message.includes("validation") ||
      message.includes("malformed") ||
      message.includes("parse error")
    ) {
      // Return the original message for validation errors as they're usually specific
      return error.message;
    }

    // Configuration errors
    if (
      message.includes("configuration") ||
      message.includes("config") ||
      message.includes("environment") ||
      message.includes("missing") ||
      message.includes("not configured")
    ) {
      return "Configuration error: Required settings are missing. Please contact support if this error persists.";
    }

    // Authentication errors
    if (
      message.includes("authentication") ||
      message.includes("unauthorized") ||
      message.includes("401") ||
      message.includes("token") ||
      message.includes("credentials")
    ) {
      return "Authentication required";
    }

    // Server errors
    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("internal server error")
    ) {
      return "Server error: GitHub is experiencing issues. Please try again in a few minutes.";
    }

    // File size errors
    if (
      message.includes("file size") ||
      message.includes("too large") ||
      message.includes("size limit")
    ) {
      return "File is too large. Maximum file size is 1MB. Please reduce the file size and try again.";
    }

    // JSON parsing errors
    if (
      message.includes("json") ||
      message.includes("parse") ||
      message.includes("syntax error")
    ) {
      return "Invalid JSON: The file contains invalid JSON syntax. Please check the file format and try again.";
    }

    // Return the original error message if it's already user-friendly
    return error.message;
  }

  return defaultMessage;
}

/**
 * Handle GitHub API-specific errors
 *
 * Provides detailed error messages for common GitHub API error scenarios:
 * - Rate limiting (429 errors)
 * - Permission issues (403 errors)
 * - Not found (404 errors)
 * - Server errors (5xx errors)
 * - Network issues
 *
 * @param error - Unknown error that might be from GitHub API
 * @returns Formatted error message
 */
export function handleGitHubError(error: unknown): string {
  if (error instanceof Error) {
    // Check for GitHub API error structure (from @octokit)
    const errorObj = error as Error & { status?: number; response?: unknown };
    if (errorObj.status) {
      switch (errorObj.status) {
        case 401:
          return "GitHub authentication failed. Please reinstall the GitHub App.";
        case 403:
          return "Permission denied by GitHub. Please check that the GitHub App has the required permissions and try again.";
        case 404:
          return "Resource not found on GitHub. Please verify the repository exists and is accessible.";
        case 422:
          return "GitHub validation error. Please check your request and try again.";
        case 429:
          return "GitHub API rate limit exceeded. Please wait a few minutes before trying again. Rate limits reset every hour.";
        case 500:
        case 502:
        case 503:
        case 504:
          return "GitHub is experiencing server issues. Please try again in a few minutes.";
        default:
          return formatErrorMessage(error, "GitHub API error occurred");
      }
    }
    return formatErrorMessage(error, "GitHub API error occurred");
  }

  return "An unexpected error occurred while communicating with GitHub.";
}

/**
 * Create standardized error response
 *
 * @param error - Error object or unknown error
 * @param status - HTTP status code
 * @param defaultMessage - Default error message
 * @returns HTTP Response with error details
 */
export function createErrorResponse(
  error: unknown,
  status: number,
  defaultMessage: string = "An error occurred",
): Response {
  const errorMessage = formatErrorMessage(error, defaultMessage);

  return new Response(
    JSON.stringify({
      success: false,
      error: errorMessage,
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/**
 * Create authentication error response
 *
 * @returns HTTP Response for authentication errors
 */
export function createAuthErrorResponse(): Response {
  return createErrorResponse(
    new Error("Authentication required"),
    401,
    "Authentication required",
  );
}

/**
 * Create validation error response
 *
 * @param error - Error message or validation errors
 * @param details - Optional additional error details
 * @returns HTTP Response for validation errors
 */
export function createValidationErrorResponse(
  error: string,
  details?: unknown,
): Response {
  const responseBody: Record<string, unknown> = {
    success: false,
    error,
  };

  if (details !== undefined && details !== null) {
    responseBody.details = details;
  }

  return new Response(JSON.stringify(responseBody), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Create not found error response
 *
 * @param error - Error message
 * @returns HTTP Response for not found errors
 */
export function createNotFoundErrorResponse(
  error: string,
): Response {
  // Use the error message directly without formatting
  return new Response(
    JSON.stringify({
      success: false,
      error,
    }),
    {
      status: 404,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/**
 * Create configuration error response
 *
 * @param error - Error message
 * @returns HTTP Response for configuration errors
 */
export function createConfigurationErrorResponse(
  error: string,
): Response {
  // Use the error message directly without formatting
  return new Response(
    JSON.stringify({
      success: false,
      error,
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    },
  );
}
