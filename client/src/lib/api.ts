// API client for dashboard endpoints

// Get API base URL
// Priority: VITE_API_URL env var > base path from Vite > empty (same origin)
const getApiBase = () => {
  // If VITE_API_URL is set, use it (for separate backend deployment)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // Otherwise, use the base path (for same-origin deployment)
  if (import.meta.env.PROD) {
    const basePath = import.meta.env.BASE_URL || '/EF-Dashboard/';
    return basePath.replace(/\/$/, ''); // Remove trailing slash
  }
  
  return ''; // Development uses root (same origin)
};

const API_BASE = getApiBase();

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('ef_dashboard_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export async function fetchOverview(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/api/overview?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch overview data');
  return response.json();
}

export async function fetchReturningUsers(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/api/returning-users?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch returning users data');
  return response.json();
}

export async function fetchCategorySummary(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/api/category-summary?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch category data');
  return response.json();
}

export async function fetchProductPerformance(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/api/product-performance?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch product performance data');
  return response.json();
}

export async function fetchGeography(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/api/geography?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch geography data');
  return response.json();
}

export async function fetchDeviceAnalytics(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/api/device-analytics?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch device analytics data');
  return response.json();
}

export async function fetchTimePatterns(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/api/time-patterns?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch time patterns data');
  return response.json();
}

export async function fetchSharesDownloads(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/api/shares-downloads?${params}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch shares/downloads data');
  return response.json();
}

export async function fetchLatestQueries() {
  const response = await fetch(`${API_BASE}/api/latest-queries`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch latest queries');
  return response.json();
}

export async function fetchClientConfigs() {
  const response = await fetch(`${API_BASE}/api/client-configs`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch client configs');
  return response.json();
}

export async function createClientConfig(payload: {
  client_id: string;
  domains: string[];
  is_default?: boolean;
  client_config: Record<string, unknown>;
}) {
  const response = await fetch(`${API_BASE}/api/client-configs`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to create client config');
  return response.json();
}

export async function updateClientConfig(
  id: string,
  payload: {
    client_id?: string;
    domains?: string[];
    is_default?: boolean;
    client_config?: Record<string, unknown>;
  }
) {
  const response = await fetch(`${API_BASE}/api/client-configs/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to update client config');
  return response.json();
}

