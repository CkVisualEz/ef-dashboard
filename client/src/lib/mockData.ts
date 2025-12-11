import { format, subDays, eachDayOfInterval } from "date-fns";

// Types
export interface KPI {
  label: string;
  value: string | number;
  change: number;
  trend: "up" | "down" | "neutral";
  suffix?: string;
}

export interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}

// Mock Data Generators

const generateDateRange = (days = 30) => {
  const end = new Date();
  const start = subDays(end, days);
  return eachDayOfInterval({ start, end });
};

export const MOCK_OVERVIEW = {
  kpis: [
    { label: "Total Active Users", value: "12,543", change: 12.5, trend: "up" },
    { label: "Total Image Uploads", value: "45,201", change: 8.2, trend: "up" },
    { label: "Avg Uploads/User", value: "3.6", change: -1.2, trend: "down" },
    { label: "Total Product Clicks", value: "28,900", change: 15.3, trend: "up" },
    { label: "Click Rate", value: "63.9%", change: 5.4, trend: "up" },
    { label: "Avg Clicked Rank", value: "1.8", change: 0.2, trend: "up", suffix: "st" }, // "up" here means good (lower number)
  ] as KPI[],
  
  uploadsTrend: generateDateRange(14).map(date => ({
    name: format(date, "MMM dd"),
    carpet: Math.floor(Math.random() * 500) + 200,
    hardSurface: Math.floor(Math.random() * 800) + 300,
    both: Math.floor(Math.random() * 200) + 50,
  })),

  deviceSplit: [
    { name: "Mobile", value: 65, fill: "var(--color-chart-1)" },
    { name: "Desktop", value: 30, fill: "var(--color-chart-2)" },
    { name: "Tablet", value: 5, fill: "var(--color-chart-3)" },
  ],
};

export const MOCK_RETURNING = {
  kpis: [
    { label: "New Users", value: "8,200", change: 5.2, trend: "up" },
    { label: "Returning Users", value: "4,343", change: 18.5, trend: "up" },
    { label: "Returning Rate", value: "34.6%", change: 4.1, trend: "up" },
  ],
  retentionTrend: generateDateRange(30).map(date => ({
    name: format(date, "MMM dd"),
    newUsers: Math.floor(Math.random() * 300) + 100,
    returningUsers: Math.floor(Math.random() * 200) + 150,
  })),
  frequencyDist: [
    { name: "1 Upload", value: 4500 },
    { name: "2-3 Uploads", value: 3200 },
    { name: "4-5 Uploads", value: 1800 },
    { name: "6+ Uploads", value: 900 },
  ],
};

export const MOCK_CATEGORY = {
  kpis: [
    { label: "Carpet Uploads", value: "18,400", change: 2.1, trend: "up" },
    { label: "Hard Surface Uploads", value: "24,500", change: 14.3, trend: "up" },
    { label: "Mixed Uploads", value: "2,301", change: -5.4, trend: "down" },
  ],
  trend: generateDateRange(30).map(date => ({
    name: format(date, "MMM dd"),
    carpet: Math.floor(Math.random() * 400) + 300,
    hardSurface: Math.floor(Math.random() * 600) + 400,
  })),
  conversion: [
    { name: "Carpet", clicks: 65, uploads: 100 },
    { name: "Hard Surface", clicks: 72, uploads: 100 },
    { name: "Mixed", clicks: 50, uploads: 100 },
  ]
};

export const MOCK_PRODUCTS = {
  topSkus: [
    { id: "SKU-9921", name: "Oak Natural PLK", category: "Hard Surface", clicks: 1240, impressions: 4500, ctr: "27.5%", rank: 1.2 },
    { id: "SKU-8823", name: "Berber Classic", category: "Carpet", clicks: 980, impressions: 3200, ctr: "30.6%", rank: 1.5 },
    { id: "SKU-1102", name: "Marble Tile 12x12", category: "Hard Surface", clicks: 850, impressions: 4100, ctr: "20.7%", rank: 2.1 },
    { id: "SKU-4451", name: "Plush Beige", category: "Carpet", clicks: 760, impressions: 2800, ctr: "27.1%", rank: 1.8 },
    { id: "SKU-7722", name: "Walnut Dark", category: "Hard Surface", clicks: 620, impressions: 2100, ctr: "29.5%", rank: 1.1 },
  ],
  rankDistribution: [
    { name: "Rank 1", value: 60 },
    { name: "Rank 2", value: 25 },
    { name: "Rank 3", value: 10 },
    { name: "Rank 4+", value: 5 },
  ]
};

export const MOCK_GEOGRAPHY = {
  topStates: [
    { state: "California", users: 2400, uploads: 8500, clicks: 5100 },
    { state: "Texas", users: 1800, uploads: 6200, clicks: 3800 },
    { state: "Florida", users: 1500, uploads: 5100, clicks: 3200 },
    { state: "New York", users: 1200, uploads: 4300, clicks: 2900 },
    { state: "Illinois", users: 900, uploads: 3100, clicks: 1800 },
  ],
  mapData: [
    // Simplified for chart
    { name: "West", value: 35 },
    { name: "South", value: 30 },
    { name: "Northeast", value: 20 },
    { name: "Midwest", value: 15 },
  ]
};

export const MOCK_TIME = {
  hourly: Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    uploads: Math.floor(Math.random() * 100) + (i > 8 && i < 22 ? 200 : 20), // Peak during day/evening
  })),
  weekly: [
    { name: "Mon", value: 4200 },
    { name: "Tue", value: 4500 },
    { name: "Wed", value: 4800 },
    { name: "Thu", value: 5100 },
    { name: "Fri", value: 5600 },
    { name: "Sat", value: 6200 },
    { name: "Sun", value: 5900 },
  ]
};

export const MOCK_SHARES = {
  kpis: [
    { label: "Total Shares", value: "1,240", change: 8.5, trend: "up" },
    { label: "Total Downloads", value: "3,500", change: 12.1, trend: "up" },
    { label: "Share Rate", value: "2.7%", change: 0.5, trend: "neutral" },
  ],
  shareByDevice: [
    { name: "Mobile", shares: 850, downloads: 1200 },
    { name: "Desktop", shares: 250, downloads: 2100 },
    { name: "Tablet", shares: 140, downloads: 200 },
  ]
};

export interface RecentQuery {
  sessionId: string;
  date: string;
  location: string;
  classification: "Carpet" | "Hard Surface" | "Mixed";
  device: "Mobile" | "Desktop" | "Tablet";
  actions: number;
  status: "Completed" | "Active";
  thumbnail: string;
}

export const MOCK_RECENT_QUERIES: RecentQuery[] = Array.from({ length: 50 }, (_, i) => {
  const actions = Math.floor(Math.random() * 15) + 6; // Ensure > 5 actions
  const classifications: ("Carpet" | "Hard Surface" | "Mixed")[] = ["Carpet", "Hard Surface", "Mixed"];
  const devices: ("Mobile" | "Desktop" | "Tablet")[] = ["Mobile", "Desktop", "Tablet"];
  const locations = ["California, US", "Texas, US", "New York, US", "Florida, US", "Illinois, US", "Toronto, CA", "London, UK"];
  
  return {
    sessionId: `SES-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    date: format(subDays(new Date(), Math.floor(Math.random() * 7)), "MMM dd, HH:mm"),
    location: locations[Math.floor(Math.random() * locations.length)],
    classification: classifications[Math.floor(Math.random() * classifications.length)],
    device: devices[Math.floor(Math.random() * devices.length)],
    actions: actions,
    status: (Math.random() > 0.3 ? "Completed" : "Active") as "Completed" | "Active",
    thumbnail: `https://picsum.photos/seed/${i}/50/50` // Placeholder for user uploaded image
  };
}).sort((a, b) => b.actions - a.actions);
