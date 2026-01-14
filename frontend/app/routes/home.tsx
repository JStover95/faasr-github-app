import type { Route } from "./+types/home";
import { Header } from "@/components/ui/Header";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "FaaSr GitHub App" },
    {
      name: "description",
      content: "FaaSr GitHub App - Deploy and manage your serverless functions",
    },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Welcome to FaaSr GitHub App
          </h2>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
            This is a placeholder page. Content will be added here.
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Get started by signing up to deploy and manage your serverless
            functions with ease.
          </p>
        </div>
      </main>
    </div>
  );
}
