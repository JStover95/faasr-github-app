/**
 * StatelessAuthContext Provider
 *
 * @see design-docs/frontend-patterns.md - Single state object pattern
 * @see design-docs/backend-integration.md - Error handling pattern
 */

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  type PropsWithChildren,
} from "react";
import {
  StatelessAuthContext,
  type StatelessAuthState,
  type StatelessAuthContextValue,
} from "./Context";

// ERROR CONSTANTS (backend-integration.md pattern)
const AUTH_ERRORS = {
  checkFailed: "Failed to verify authentication status.",
  logoutFailed: "Failed to log out.",
  default: "An authentication error occurred.",
} as const;

export function StatelessAuthProvider({ children }: PropsWithChildren) {
  // SINGLE STATE OBJECT PATTERN (frontend-patterns.md)
  const [state, setState] = useState<StatelessAuthState>({
    isAuthenticated: false,
    userLogin: null,
    avatarUrl: null,
    repoName: null,
    loading: true,
    error: null,
  });

  // Check auth on mount
  useEffect(() => {
    // Don't check in callback route
    if (window.location.pathname !== "/v2/callback") {
      checkAuth();
    }
  }, []);

  // ACTIONS with useCallback for stability
  const checkAuth = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const functionsEndpoint = import.meta.env
        .VITE_SUPABASE_FUNCTIONS_ENDPOINT;
      const response = await fetch(
        `${functionsEndpoint}/functions/v1/auth-status-v2`,
        {
          method: "GET",
          credentials: "include", // Include cookies
        }
      );

      if (response.ok) {
        const data = await response.json();
        setState((prev) => ({
          ...prev,
          isAuthenticated: true,
          userLogin: data.userLogin,
          avatarUrl: data.avatarUrl,
          repoName: data.repoName,
          loading: false,
          error: null,
        }));
      } else {
        // Not authenticated or cookie expired
        setState((prev) => ({
          ...prev,
          isAuthenticated: false,
          userLogin: null,
          avatarUrl: null,
          repoName: null,
          loading: false,
          error: null,
        }));
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setState((prev) => ({
        ...prev,
        isAuthenticated: false,
        userLogin: null,
        avatarUrl: null,
        repoName: null,
        loading: false,
        error: AUTH_ERRORS.checkFailed,
      }));
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const functionsEndpoint = import.meta.env
        .VITE_SUPABASE_FUNCTIONS_ENDPOINT;
      const response = await fetch(
        `${functionsEndpoint}/functions/v1/logout-v2`,
        {
          method: "POST",
          credentials: "include", // Include cookies
        }
      );

      if (response.ok) {
        setState({
          isAuthenticated: false,
          userLogin: null,
          avatarUrl: null,
          repoName: null,
          loading: false,
          error: null,
        });
      } else {
        throw new Error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: AUTH_ERRORS.logoutFailed,
      }));
    }
  }, []);

  // Memoize actions and context value
  const actions = useMemo(
    () => ({
      checkAuth,
      logout,
    }),
    [checkAuth, logout]
  );

  const value = useMemo<StatelessAuthContextValue>(
    () => ({
      state,
      actions,
    }),
    [state, actions]
  );

  return (
    <StatelessAuthContext.Provider value={value}>
      {children}
    </StatelessAuthContext.Provider>
  );
}
