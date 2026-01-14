/**
 * Header component
 *
 * @see design-docs/frontend-patterns.md
 */

import React from "react";
import { useNavigate } from "react-router";
import { Button } from "./Button";

export const HEADER_TEST_IDS = {
  title: "header-title",
  signupButton: "header-signup-button",
} as const;

export const Header = React.memo(() => {
  const navigate = useNavigate();

  const handleSignupClick = () => {
    navigate("/signup");
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
            testID={HEADER_TEST_IDS.signupButton}
            title="Sign up"
            onClick={handleSignupClick}
            variant="primary"
            className="w-auto"
          />
        </div>
      </div>
    </header>
  );
});

Header.displayName = "Header";
