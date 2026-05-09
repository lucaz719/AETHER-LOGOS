/**
 * Helper to add X-API-Key header to all Go agent API calls
 * Works on both client and server components
 * 
 * On client: uses NEXT_PUBLIC_INTERNAL_API_KEY
 * On server: uses INTERNAL_API_KEY (available during build/runtime)
 */
export function getAgentHeaders(additionalHeaders?: Record<string, string>) {
  const headers: Record<string, string> = {
    ...additionalHeaders,
  };

  // Try client-side env var first (browser)
  const clientKey = typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_INTERNAL_API_KEY || '')
    : '';
  
  // On server, INTERNAL_API_KEY is directly available
  const serverKey = process.env.INTERNAL_API_KEY || '';
  
  const apiKey = clientKey || serverKey;
  
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  return headers;
}

/**
 * Wrapper for fetch() calls to Go agent on port 8080
 */
export async function fetchAgent(
  endpoint: string,
  options?: RequestInit
) {
  const headers = getAgentHeaders(options?.headers as Record<string, string>);
  return fetch(endpoint, {
    ...options,
    headers,
  });
}
