/**
 * AuthContext - Authentication state and actions
 *
 * @see design-docs/context-pattern.md
 */

import { createContext } from "react";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile } from "../../types";

export interface AuthResult {
  success: boolean;
  error?: string;
}

/**
 * Authentication state
 */
export interface AuthState {
  /** Loading state for async operations */
  loading: boolean;
  /** Current authenticated user */
  user: User | null;
  /** Current session */
  session: Session | null;
  /** Current profile */
  profile: Profile | null;
  /** Error message if operation failed */
  error: string | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
}

/**
 * Authentication actions
 */
export interface AuthActions {
  /** Sign in with email and password */
  signIn: (email: string, password: string) => Promise<AuthResult>;
  /** Sign out current user */
  signOut: () => Promise<AuthResult>;
  /** Sign up with email and password */
  signUp: (
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<AuthResult>;
  /** Refresh the current session */
  refreshSession: () => Promise<AuthResult>;
}

/**
 * Complete context value combining state and actions
 */
export interface AuthContextValue {
  state: AuthState;
  actions: AuthActions;
}

/**
 * AuthContext provides access to authentication state and operations
 */
export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);
