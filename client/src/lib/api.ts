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

export async function fetchOverview(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/api/overview?${params}`);
  if (!response.ok) throw new Error('Failed to fetch overview data');
  return response.json();
}

export async function fetchReturningUsers(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/api/returning-users?${params}`);
  if (!response.ok) throw new Error('Failed to fetch returning users data');
  return response.json();
}

export async function fetchCategorySummary(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/api/category-summary?${params}`);
  if (!response.ok) throw new Error('Failed to fetch category data');
  return response.json();
}

export async function fetchProductPerformance(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/api/product-performance?${params}`);
  if (!response.ok) throw new Error('Failed to fetch product performance data');
  return response.json();
}

export async function fetchGeography(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/api/geography?${params}`);
  if (!response.ok) throw new Error('Failed to fetch geography data');
  return response.json();
}

export async function fetchDeviceAnalytics(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/api/device-analytics?${params}`);
  if (!response.ok) throw new Error('Failed to fetch device analytics data');
  return response.json();
}

export async function fetchTimePatterns(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/api/time-patterns?${params}`);
  if (!response.ok) throw new Error('Failed to fetch time patterns data');
  return response.json();
}

export async function fetchSharesDownloads(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/api/shares-downloads?${params}`);
  if (!response.ok) throw new Error('Failed to fetch shares/downloads data');
  return response.json();
}

export async function fetchLatestQueries(page: number = 1, limit: number = 50) {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  const response = await fetch(`${API_BASE}/api/latest-queries?${params}`);
  if (!response.ok) throw new Error('Failed to fetch latest queries');
  return response.json();
}

