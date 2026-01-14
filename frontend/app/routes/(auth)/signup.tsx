import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router";
import { useAuthContext } from "@/contexts/AuthContext/use-auth-context";
import { useToastContext } from "@/contexts/ToastContext/use-toast-context";
import { TextInput } from "@/components/ui/TextInput";
import { Button } from "@/components/ui/Button";

export const SIGNUP_TEST_IDS = {
  emailInput: "signup-email-input",
  passwordInput: "signup-password-input",
  confirmPasswordInput: "signup-confirm-password-input",
  submitButton: "signup-submit-button",
  loginLink: "signup-login-link",
  errorMessage: "signup-error-message",
} as const;

interface SignupState {
  email: string;
  password: string;
  confirmPassword: string;
  errorMessage: string | null;
  isSubmitting: boolean;
}

export default function Signup() {
  const navigate = useNavigate();
  const { actions } = useAuthContext();
  const { actions: toastActions } = useToastContext();
  const [state, setState] = useState<SignupState>({
    email: "",
    password: "",
    confirmPassword: "",
    errorMessage: null,
    isSubmitting: false,
  });

  const handleEmailChange = useCallback((email: string) => {
    setState((prev) => ({
      ...prev,
      email,
      errorMessage: null,
    }));
  }, []);

  const handlePasswordChange = useCallback((password: string) => {
    setState((prev) => ({
      ...prev,
      password,
      errorMessage: null,
    }));
  }, []);

  const handleConfirmPasswordChange = useCallback((confirmPassword: string) => {
    setState((prev) => ({
      ...prev,
      confirmPassword,
      errorMessage: null,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      setState((prev) => ({
        ...prev,
        isSubmitting: true,
        errorMessage: null,
      }));

      const result = await actions.signUp(
        state.email,
        state.password,
        state.confirmPassword
      );

      if (result.success) {
        toastActions.showToast(
          "Sign up successful! Please sign in.",
          "success"
        );
        navigate("/login");
      } else {
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          errorMessage: result.error || "An error occurred while signing up.",
        }));
      }
    },
    [
      state.email,
      state.password,
      state.confirmPassword,
      actions,
      navigate,
      toastActions,
    ]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <TextInput
              testID={SIGNUP_TEST_IDS.emailInput}
              label="Email address"
              type="email"
              value={state.email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="email"
              disabled={state.isSubmitting}
            />
            <TextInput
              testID={SIGNUP_TEST_IDS.passwordInput}
              label="Password"
              type="password"
              value={state.password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="new-password"
              disabled={state.isSubmitting}
            />
            <TextInput
              testID={SIGNUP_TEST_IDS.confirmPasswordInput}
              label="Confirm Password"
              type="password"
              value={state.confirmPassword}
              onChange={(e) => handleConfirmPasswordChange(e.target.value)}
              placeholder="Confirm your password"
              required
              autoComplete="new-password"
              disabled={state.isSubmitting}
            />
          </div>

          {state.errorMessage && (
            <div
              data-testid={SIGNUP_TEST_IDS.errorMessage}
              className="text-red-600 dark:text-red-400 text-sm"
              role="alert"
            >
              {state.errorMessage}
            </div>
          )}

          <div>
            <Button
              testID={SIGNUP_TEST_IDS.submitButton}
              title="Sign up"
              onClick={() => {}}
              loading={state.isSubmitting}
              disabled={state.isSubmitting}
              type="submit"
            />
          </div>

          <div className="text-center">
            <Link
              to="/login"
              data-testid={SIGNUP_TEST_IDS.loginLink}
              className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Already have an account? Log in.
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
