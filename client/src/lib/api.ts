// API client for dashboard endpoints

export async function fetchOverview(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/overview?${params}`);
  if (!response.ok) throw new Error('Failed to fetch overview data');
  return response.json();
}

export async function fetchReturningUsers(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/returning-users?${params}`);
  if (!response.ok) throw new Error('Failed to fetch returning users data');
  return response.json();
}

export async function fetchCategorySummary(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/category-summary?${params}`);
  if (!response.ok) throw new Error('Failed to fetch category data');
  return response.json();
}

export async function fetchProductPerformance(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/product-performance?${params}`);
  if (!response.ok) throw new Error('Failed to fetch product performance data');
  return response.json();
}

export async function fetchGeography(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/geography?${params}`);
  if (!response.ok) throw new Error('Failed to fetch geography data');
  return response.json();
}

export async function fetchDeviceAnalytics(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/device-analytics?${params}`);
  if (!response.ok) throw new Error('Failed to fetch device analytics data');
  return response.json();
}

export async function fetchTimePatterns(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/time-patterns?${params}`);
  if (!response.ok) throw new Error('Failed to fetch time patterns data');
  return response.json();
}

export async function fetchSharesDownloads(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/shares-downloads?${params}`);
  if (!response.ok) throw new Error('Failed to fetch shares/downloads data');
  return response.json();
}

export async function fetchRecentQueries() {
  const response = await fetch('/api/recent-queries');
  if (!response.ok) throw new Error('Failed to fetch recent queries');
  return response.json();
}
