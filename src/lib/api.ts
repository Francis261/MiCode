const API_ROOT_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"; // Should be just the root, e.g., http://localhost:5000

export async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  // Ensure the URL starts with a slash and doesn't have a double slash after /api
  const finalUrl = `${API_ROOT_URL}/api${url.startsWith('/') ? url : `/${url}`}`;
  
  const response = await fetch(finalUrl, options);
  if (response.status === 401 || response.status === 403) {
    // Handle unauthorized/forbidden access, e.g., redirect to login
    console.error("Authentication error: Redirecting to login.");
    // For the main frontend, we don't have an admin login, so just throw
    throw new Error('Authentication failed. Please log in again.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `API error: ${response.statusText}` }));
    throw new Error(errorData.message || `API error: ${response.statusText}`);
  }
  return response.json();
}