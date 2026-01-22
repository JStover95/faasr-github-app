/**
 * StatelessAuthContext
 *
 * Context for stateless, cookie-based authentication.
 * No Supabase dependencies - pure cookie-based auth.
 *
 * @see design-docs/frontend-patterns.md - Context pattern
 */

import { createContext } from "react";

export interface StatelessAuthState {
  isAuthenticated: boolean;
  userLogin: string | null;
  avatarUrl: string | null;
  repoName: string | null;
  loading: boolean;
  error: string | null;
}

export interface StatelessAuthActions {
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export interface StatelessAuthContextValue {
  state: StatelessAuthState;
  actions: StatelessAuthActions;
}

export const StatelessAuthContext = createContext<
  StatelessAuthContextValue | undefined
>(undefined);
