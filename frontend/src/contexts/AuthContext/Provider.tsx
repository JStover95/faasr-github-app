/**
 * AuthContext Provider
 *
 * @see design-docs/context-pattern.md
 */

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  type PropsWithChildren,
} from "react";
import { createSupabaseClient } from "@/supabase";
import {
  AuthContext,
  type AuthContextValue,
  type AuthState,
  type AuthResult,
} from "./Context";
import { isAuthError } from "@supabase/supabase-js";
import { useSupabaseClientContext } from "../SupabaseClientContext/use-supabase-client-context";

const SIGNUP_ERRORS = {
  validationError: "Input is not in the expected format.",
  invalidEmail: "Invalid email address.",
  emailExists: "Email already in use.",
  userExists: "User already exists.",
  weakPassword: "Password does not meet strength requirements.",
  passwordsDoNotMatch: "Passwords do not match.",
  default: "An error occurred while signing up.",
} as const;

const SIGNIN_ERRORS = {
  validationError: "Input is not in the expected format.",
  invalidCredentials: "Invalid email or password.",
  emailNotConfirmed: "Email not confirmed.",
  default: "An error occurred while signing in.",
} as const;

const SIGNOUT_ERROR = "An error occurred while signing out.";
const REFRESH_SESSION_ERROR = "An error occurred while refreshing session.";

const handleSignupError = (error: unknown): string => {
  if (isAuthError(error)) {
    switch (error.code) {
      case "validation_failed":
        return SIGNUP_ERRORS.validationError;
      case "email_address_invalid":
        return SIGNUP_ERRORS.invalidEmail;
      case "email_exists":
        return SIGNUP_ERRORS.emailExists;
      case "user_already_exists":
        return SIGNUP_ERRORS.userExists;
      case "weak_password":
        return SIGNUP_ERRORS.weakPassword;
      default:
        return SIGNUP_ERRORS.default;
    }
  } else {
    return SIGNUP_ERRORS.default;
  }
};

const handleSigninError = (error: unknown): string => {
  if (isAuthError(error)) {
    switch (error.code) {
      case "validation_failed":
        return SIGNIN_ERRORS.validationError;
      case "invalid_credentials":
        return SIGNIN_ERRORS.invalidCredentials;
      case "email_not_confirmed":
        return SIGNIN_ERRORS.emailNotConfirmed;
      default:
        return SIGNIN_ERRORS.default;
    }
  } else {
    return SIGNIN_ERRORS.default;
  }
};

export function AuthProvider({ children }: PropsWithChildren) {
  // State
  const [state, setState] = useState<AuthState>({
    loading: true,
    user: null,
    profile: null,
    session: null,
    error: null,
    isAuthenticated: false,
  });

  const { supabase } = useSupabaseClientContext();

  // Initialize auth state on mount
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data, error }) => {
      setState((prev) => ({
        ...prev,
        loading: false,
        user: data.session?.user ?? null,
        session: data.session,
        isAuthenticated: !!data.session,
        error: error?.message ?? null,
      }));
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        session: session,
        isAuthenticated: !!session,
        error: null,
      }));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Actions
  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { success: false, error: handleSigninError(error) };
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          user: data.user,
          session: data.session,
          isAuthenticated: !!data.session,
          error: null,
        }));
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error?.message ?? "Failed to sign in",
        }));

        return { success: false, error: handleSigninError(error) };
      }

      return { success: true };
    },
    [supabase]
  );

  const signOut = useCallback(async (): Promise<AuthResult> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { success: false, error: SIGNOUT_ERROR };
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        user: null,
        session: null,
        isAuthenticated: false,
        error: null,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error?.message ?? "Failed to sign out",
      }));

      return { success: false, error: SIGNOUT_ERROR };
    }

    return { success: true };
  }, [supabase]);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      confirmPassword: string
    ): Promise<AuthResult> => {
      if (password !== confirmPassword) {
        return { success: false, error: SIGNUP_ERRORS.passwordsDoNotMatch };
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          console.log(JSON.stringify(error, null, 2));
          return { success: false, error: handleSignupError(error) };
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          user: data.user,
          session: data.session,
          error: null,
        }));
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error?.message ?? "Failed to sign up",
        }));

        return { success: false, error: handleSignupError(error) };
      }

      return { success: true };
    },
    [supabase]
  );

  const refreshSession = useCallback(async (): Promise<AuthResult> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        return { success: false, error: REFRESH_SESSION_ERROR };
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        session: data.session,
        user: data.session?.user ?? null,
        isAuthenticated: !!data.session,
        error: null,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error?.message ?? "Failed to refresh session",
      }));

      return { success: false, error: REFRESH_SESSION_ERROR };
    }

    return { success: true };
  }, [supabase]);

  // Memoize actions to prevent unnecessary re-renders
  const actions = useMemo(
    () => ({
      signIn,
      signOut,
      signUp,
      refreshSession,
    }),
    [signIn, signOut, signUp, refreshSession]
  );

  // Memoize context value
  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      actions,
    }),
    [state, actions]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
