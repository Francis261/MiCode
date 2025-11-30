const ADMIN_API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || "http://localhost:5001";

export async function adminFetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('adminToken'); // Get token from local storage

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }), // Add Authorization header if token exists
    ...options?.headers,
  };

  const response = await fetch(`${ADMIN_API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    // Handle unauthorized/forbidden access, e.g., redirect to login
    // This is a basic client-side redirect. A more robust solution might involve a global error handler.
    console.error("Authentication error: Redirecting to login.");
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/login'; // Redirect to login page
    throw new Error('Authentication failed. Please log in again.');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `API error: ${response.statusText}`);
  }
  return response.json();
}