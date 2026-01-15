import { useEffect } from "react";
import { useNavigate } from "react-router";
import type { MetaFunction } from "react-router";
import { useAuthContext } from "@/contexts/AuthContext/use-auth-context";

export const meta: MetaFunction = () => {
  return [
    { title: "Install GitHub App - FaaSr GitHub App" },
    {
      name: "description",
      content: "Install the FaaSr GitHub App to get started",
    },
  ];
};

export default function Install() {
  const navigate = useNavigate();
  const { state: authState } = useAuthContext();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authState.loading && !authState.isAuthenticated) {
      navigate("/login");
      return;
    }

    // Don't redirect until auth is loaded
    if (authState.loading) {
      return;
    }

    // Redirect to home - installation is initiated from the home page
    navigate("/");
  }, [authState.loading, authState.isAuthenticated, navigate]);

  // Don't render until loading is complete
  if (authState.loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!authState.isAuthenticated) {
    return null;
  }

  // This should not render as we redirect immediately
  return null;
}
