export interface CORSOptions {
  origin?: string;
  headers?: string;
  credentials?: string;
}

export const DEFAULT_CORS_HEADERS = {
  origin: "*",
  headers: "authorization, x-client-info, apikey, content-type",
  credentials: "true",
} as const;

export function setCorsHeaders(response: Response, options?: CORSOptions) {
  response.headers.set(
    "Access-Control-Allow-Origin",
    options?.origin || DEFAULT_CORS_HEADERS.origin,
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    options?.headers || DEFAULT_CORS_HEADERS.headers,
  );
  response.headers.set(
    "Access-Control-Allow-Credentials",
    options?.credentials || DEFAULT_CORS_HEADERS.credentials,
  );
}
