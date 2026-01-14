import { useState, useCallback, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { useAuthContext } from "@/contexts/AuthContext/use-auth-context";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";

export const LOGIN_TEST_IDS = {
  emailInput: "login-email-input",
  passwordInput: "login-password-input",
  submitButton: "login-submit-button",
  signupLink: "login-signup-link",
  errorMessage: "login-error-message",
} as const;

interface LoginState {
  email: string;
  password: string;
  errorMessage: string | null;
  isSubmitting: boolean;
}

export default function Login() {
  const navigate = useNavigate();
  const { state, actions } = useAuthContext();
  const [localState, setLocalState] = useState<LoginState>({
    email: "",
    password: "",
    errorMessage: null,
    isSubmitting: false,
  });

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!state.loading && state.isAuthenticated) {
      navigate("/");
    }
  }, [state.loading, state.isAuthenticated, navigate]);

  const handleEmailChange = useCallback((email: string) => {
    setLocalState((prev) => ({
      ...prev,
      email,
      errorMessage: null,
    }));
  }, []);

  const handlePasswordChange = useCallback((password: string) => {
    setLocalState((prev) => ({
      ...prev,
      password,
      errorMessage: null,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      setLocalState((prev) => ({
        ...prev,
        isSubmitting: true,
        errorMessage: null,
      }));

      const result = await actions.signIn(
        localState.email,
        localState.password
      );

      if (result.success) {
        navigate("/");
      } else {
        setLocalState((prev) => ({
          ...prev,
          isSubmitting: false,
          errorMessage: result.error || "An error occurred while signing in.",
        }));
      }
    },
    [localState.email, localState.password, actions, navigate]
  );

  // Don't render if already authenticated (will redirect)
  if (!state.loading && state.isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <TextInput
              testID={LOGIN_TEST_IDS.emailInput}
              label="Email address"
              type="email"
              value={localState.email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="email"
              disabled={localState.isSubmitting}
            />
            <TextInput
              testID={LOGIN_TEST_IDS.passwordInput}
              label="Password"
              type="password"
              value={localState.password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              disabled={localState.isSubmitting}
            />
          </div>

          {localState.errorMessage && (
            <div
              data-testid={LOGIN_TEST_IDS.errorMessage}
              className="text-red-600 dark:text-red-400 text-sm"
              role="alert"
            >
              {localState.errorMessage}
            </div>
          )}

          <div>
            <Button
              testID={LOGIN_TEST_IDS.submitButton}
              title="Sign in"
              onClick={() => {}}
              loading={localState.isSubmitting}
              disabled={localState.isSubmitting}
              type="submit"
            />
          </div>

          <div className="text-center">
            <Link
              to="/signup"
              data-testid={LOGIN_TEST_IDS.signupLink}
              className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Need an account? Sign up.
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
