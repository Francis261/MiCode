const ADMIN_API_ROOT_URL = import.meta.env.VITE_ADMIN_API_URL || "http://localhost:5001";

export async function adminFetcher<T>(url: string, options?: RequestInit): Promise<T> {
  // The 'url' parameter should already include any necessary /api prefix for admin routes
  const finalUrl = `${ADMIN_API_ROOT_URL}${url.startsWith('/') ? url : `/${url}`}`;
  
  const token = localStorage.getItem('adminToken'); // Get token from local storage

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }), // Add Authorization header if token exists
    ...options?.headers,
  };

  const response = await fetch(finalUrl, {
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
    const errorData = await response.json().catch(() => ({ message: `API error: ${response.statusText}` }));
    throw new Error(errorData.message || `API error: ${response.statusText}`);
  }
  return response.json();
}