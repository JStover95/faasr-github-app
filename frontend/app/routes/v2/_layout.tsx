/**
 * V2 Layout
 *
 * Provides stateless contexts for v2 routes.
 * This layout wraps v2 routes with StatelessAuthProvider and StatelessWorkflowsProvider.
 */

import { Outlet } from "react-router";
import { StatelessAuthProvider } from "@/contexts/StatelessAuthContext/Provider";
import { StatelessWorkflowsProvider } from "@/contexts/StatelessWorkflowsContext/Provider";

export default function V2Layout() {
  return (
    <StatelessAuthProvider>
      <StatelessWorkflowsProvider>
        <Outlet />
      </StatelessWorkflowsProvider>
    </StatelessAuthProvider>
  );
}
