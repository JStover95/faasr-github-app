/**
 * Header component
 *
 * @see design-docs/frontend-patterns.md
 */

import React from "react";
import { useNavigate } from "react-router";
import { useAuthContext } from "@/contexts/AuthContext/use-auth-context";
import { Button } from "./Button";

export const HEADER_TEST_IDS = {
  title: "header-title",
  signoutButton: "header-signout-button",
} as const;

export const Header = React.memo(() => {
  const navigate = useNavigate();
  const { actions } = useAuthContext();

  const handleSignoutClick = async () => {
    const result = await actions.signOut();
    if (result.success) {
      navigate("/login");
    }
  };

  return (
    <header
      className="w-full border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      data-testid="header-container"
    >
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1
          className="text-xl font-bold text-gray-900 dark:text-white"
          data-testid={HEADER_TEST_IDS.title}
        >
          FaaSr GitHub App
        </h1>
        <div className="w-auto">
          <Button
            testID={HEADER_TEST_IDS.signoutButton}
            title="Sign out"
            onClick={handleSignoutClick}
            variant="primary"
            className="w-auto"
          />
        </div>
      </div>
    </header>
  );
});

Header.displayName = "Header";
