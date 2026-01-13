/**
 * Test utilities for Supabase Edge Functions tests
 *
 * Provides mock implementations and environment management utilities
 * following the testing patterns defined in design-docs/supabase-testing.md
 */

/**
 * Environment state for saving/restoring environment variables
 */
export interface EnvState {
  [key: string]: string | undefined;
}

/**
 * Save current environment variable values
 *
 * @param keys - Array of environment variable keys to save
 * @returns Object containing saved environment variable values
 */
export function saveEnvState(keys: string[]): EnvState {
  const state: EnvState = {};
  for (const key of keys) {
    state[key] = Deno.env.get(key);
  }
  return state;
}

/**
 * Restore environment variable values
 *
 * @param state - Object containing environment variable values to restore
 */
export function restoreEnvState(state: EnvState): void {
  for (const [key, value] of Object.entries(state)) {
    if (value !== undefined) {
      Deno.env.set(key, value);
    } else {
      Deno.env.delete(key);
    }
  }
}

/**
 * Mock Supabase Client with queue-based response pattern
 */
export class MockSupabaseClient {
  private _rpcResponses: Map<
    string,
    ((args: unknown) => { data: unknown; error: unknown })[]
  > = new Map();
  private _authResponses: Array<{
    data: { user: { id: string } | null } | null;
    error: unknown;
  }> = [];

  /**
   * Queue an RPC response
   */
  withRpcResponse(
    fn: string,
    callback: (args: unknown) => { data: unknown; error: unknown },
  ): this {
    const queue = this._rpcResponses.get(fn) || [];
    queue.push(callback);
    this._rpcResponses.set(fn, queue);
    return this;
  }

  /**
   * Queue an auth response
   */
  withAuthResponse(response: {
    data: { user: { id: string } | null } | null;
    error: unknown;
  }): this {
    this._authResponses.push(response);
    return this;
  }

  /**
   * Execute RPC call using queued response
   */
  async rpc(
    fn: string,
    args: unknown,
  ): Promise<{ data: unknown; error: unknown }> {
    const queue = this._rpcResponses.get(fn);
    if (!queue || queue.length === 0) {
      return await Promise.reject(
        new Error(`No RPC response configured for function: ${fn}`),
      );
    }
    const callback = queue.shift()!;
    return await Promise.resolve(callback(args));
  }

  /**
   * Get auth object with getUser method
   */
  get auth(): {
    getUser: () => Promise<{
      data: { user: { id: string } | null } | null;
      error: unknown;
    }>;
  } {
    return {
      getUser: async () => {
        if (this._authResponses.length === 0) {
          return await Promise.reject(
            new Error("No auth response configured"),
          );
        }
        return await Promise.resolve(this._authResponses.shift()!);
      },
    };
  }
}

/**
 * Create mock Supabase client (returns any for type safety flexibility)
 */
export function createMockSupabaseClient() {
  // deno-lint-ignore no-explicit-any
  return new MockSupabaseClient() as any;
}

/**
 * Mock Octokit Client with queue-based response pattern
 */
export class MockOctokit {
  private _restResponses: Map<
    string,
    Array<() => { data: unknown }>
  > = new Map();
  private _requestResponses: Array<() => { data: unknown }> = [];
  private _authResponses: Array<() => { token: string; expiresAt: string }> =
    [];

  /**
   * Queue a REST API response
   */
  withRestResponse(
    method: string,
    callback: () => { data: unknown },
  ): this {
    const queue = this._restResponses.get(method) || [];
    queue.push(callback);
    this._restResponses.set(method, queue);
    return this;
  }

  /**
   * Queue a generic request response
   */
  withRequestResponse(callback: () => { data: unknown }): this {
    this._requestResponses.push(callback);
    return this;
  }

  /**
   * Queue an auth response
   */
  withAuthResponse(callback: () => { token: string; expiresAt: string }): this {
    this._authResponses.push(callback);
    return this;
  }

  /**
   * Get auth method
   */
  async auth(
    _options: { type: string },
  ): Promise<{ token: string; expiresAt: string }> {
    if (this._authResponses.length === 0) {
      throw new Error("No auth response configured");
    }
    // deno-lint-ignore no-explicit-any
    return await Promise.resolve(this._authResponses.shift()!() as any);
  }

  /**
   * Get rest object with repos and actions methods
   */
  get rest(): {
    repos: {
      get: (params: unknown) => Promise<{ data: unknown }>;
      getContent: (params: unknown) => Promise<{ data: unknown }>;
      createOrUpdateFileContents: (
        params: unknown,
      ) => Promise<{ data: { commit: { sha: string } } }>;
    };
    actions: {
      listWorkflowRuns: (params: unknown) => Promise<{
        data: { workflow_runs: Array<{ id: number; html_url: string }> };
      }>;
      getWorkflowRun: (params: unknown) => Promise<{
        data: {
          id: number;
          status: string;
          conclusion: string | null;
          html_url: string;
          created_at: string;
        };
      }>;
      createWorkflowDispatch: (params: unknown) => Promise<void>;
    };
  } {
    return {
      repos: {
        get: async (_params: unknown) => {
          const queue = this._restResponses.get("repos.get");
          if (!queue || queue.length === 0) {
            throw new Error("No response configured for repos.get");
          }
          // deno-lint-ignore no-explicit-any
          return await Promise.resolve(queue.shift()!() as any);
        },
        getContent: async (_params: unknown) => {
          const queue = this._restResponses.get("repos.getContent");
          if (!queue || queue.length === 0) {
            throw new Error("No response configured for repos.getContent");
          }
          // deno-lint-ignore no-explicit-any
          return await Promise.resolve(queue.shift()!() as any);
        },
        createOrUpdateFileContents: async (_params: unknown) => {
          const queue = this._restResponses.get(
            "repos.createOrUpdateFileContents",
          );
          if (!queue || queue.length === 0) {
            throw new Error(
              "No response configured for repos.createOrUpdateFileContents",
            );
          }
          // deno-lint-ignore no-explicit-any
          return await Promise.resolve(queue.shift()!() as any);
        },
      },
      actions: {
        listWorkflowRuns: async (_params: unknown) => {
          const queue = this._restResponses.get("actions.listWorkflowRuns");
          if (!queue || queue.length === 0) {
            throw new Error(
              "No response configured for actions.listWorkflowRuns",
            );
          }
          // deno-lint-ignore no-explicit-any
          return await Promise.resolve(queue.shift()!() as any);
        },
        getWorkflowRun: async (_params: unknown) => {
          const queue = this._restResponses.get("actions.getWorkflowRun");
          if (!queue || queue.length === 0) {
            throw new Error(
              "No response configured for actions.getWorkflowRun",
            );
          }
          // deno-lint-ignore no-explicit-any
          return await Promise.resolve(queue.shift()!() as any);
        },
        createWorkflowDispatch: async (_params: unknown) => {
          const queue = this._restResponses.get(
            "actions.createWorkflowDispatch",
          );
          if (!queue || queue.length === 0) {
            // Dispatch doesn't return data, so we can succeed without a response
            return await Promise.resolve();
          }
          queue.shift()!();
          return await Promise.resolve();
        },
      },
    };
  }

  /**
   * Execute generic request
   */
  async request(
    route: string,
    _params?: unknown,
  ): Promise<{ data: unknown }> {
    if (this._requestResponses.length === 0) {
      throw new Error(`No request response configured for route: ${route}`);
    }
    // deno-lint-ignore no-explicit-any
    return await Promise.resolve(this._requestResponses.shift()!() as any);
  }
}

/**
 * Create mock Octokit client (returns any for type safety flexibility)
 */
export function createMockOctokit() {
  // deno-lint-ignore no-explicit-any
  return new MockOctokit() as any;
}

/**
 * Mock GitHub App
 */
export class MockApp {
  private _installationOctokits: Map<number, MockOctokit> = new Map();

  /**
   * Set mock Octokit for an installation ID
   */
  withInstallationOctokit(installationId: number, octokit: MockOctokit): this {
    this._installationOctokits.set(installationId, octokit);
    return this;
  }

  /**
   * Get installation Octokit
   */
  async getInstallationOctokit(
    installationId: number,
  ): Promise<MockOctokit> {
    const octokit = this._installationOctokits.get(installationId);
    if (!octokit) {
      throw new Error(
        `No Octokit configured for installation ID: ${installationId}`,
      );
    }
    // deno-lint-ignore no-explicit-any
    return await Promise.resolve(octokit) as any;
  }
}

/**
 * Create mock GitHub App (returns any for type safety flexibility)
 */
export function createMockApp() {
  // deno-lint-ignore no-explicit-any
  return new MockApp() as any;
}

export const MOCK_JWT_TOKEN = "mock.jwt.token";

/**
 * Mock JWT with sign method
 */
export const mockJWT = {
  sign: (
    _payload: unknown,
    _privateKey: string,
    _options?: { algorithm?: string },
  ): string => {
    // Return a deterministic mock JWT
    return MOCK_JWT_TOKEN;
  },
};

/**
 * Create mock JWT (returns any for type safety flexibility)
 */
export function createMockJWT() {
  // deno-lint-ignore no-explicit-any
  return mockJWT as any;
}
