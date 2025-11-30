const ADMIN_API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || "http://localhost:5001";

export async function adminFetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${ADMIN_API_BASE_URL}${url}`, options);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `API error: ${response.statusText}`);
  }
  return response.json();
}