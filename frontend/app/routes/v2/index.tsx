/**
 * V2 Landing Page
 *
 * Explains the stateless, cookie-based authentication flow.
 */

import { Link } from "react-router";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";

export function meta() {
  return [
    { title: "V2 Stateless Flow - FaaSr GitHub App" },
    {
      name: "description",
      content: "Passwordless, cookie-based authentication demo",
    },
  ];
}

export default function V2Index() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            V2 Stateless Flow
          </h1>

          <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              About This Demo
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              This is a demonstration of a stateless, cookie-based
              authentication flow that eliminates the need for user accounts and
              database storage.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
              Key Features
            </h3>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
              <li>No user accounts or password management</li>
              <li>No database storage of user data</li>
              <li>GitHub OAuth for authentication</li>
              <li>Signed JWT cookies for session management</li>
              <li>7-day cookie expiration</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
              Security
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              All session data is cryptographically signed using JWT (HS256) and
              stored in httpOnly, secure cookies. The JWT secret is only known
              by the backend, preventing tampering.
            </p>
          </div>

          <div className="flex gap-4">
            <Link to="/v2/home" className="max-w-xs">
              <Button
                title="Get Started"
                onClick={() => {}}
                className="w-full"
              />
            </Link>
            <Link to="/" className="max-w-xs">
              <Button
                title="View V1 Flow"
                variant="secondary"
                onClick={() => {}}
                className="w-full"
              />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
