import React, { useMemo, useState } from 'react';
import { Chart } from 'react-google-charts';

interface LocationData {
    state: string;
    city: string;
    uniqueUsers: number;
    uploads: number;
    clicks: number;
    clickRate: number;
    avgRank: number;
    lat?: number;
    lon?: number;
}

interface WorldMapProps {
    data: LocationData[];
    metric: 'Unique Users' | 'Uploads' | 'PDP Clicks';
    onCountrySelect?: (iso: string | null) => void;
}

// ISO Alpha-2 -> country name
const ISO_TO_NAME: Record<string, string> = {
    'US': 'United States', 'IN': 'India', 'JP': 'Japan', 'SG': 'Singapore',
    'GB': 'United Kingdom', 'AU': 'Australia', 'CA': 'Canada', 'DE': 'Germany',
    'FR': 'France', 'BR': 'Brazil', 'MX': 'Mexico', 'KR': 'South Korea',
    'CN': 'China', 'NL': 'Netherlands', 'ES': 'Spain', 'IT': 'Italy',
    'SE': 'Sweden', 'CH': 'Switzerland', 'RU': 'Russia', 'ZA': 'South Africa',
    'AE': 'United Arab Emirates', 'ID': 'Indonesia', 'MY': 'Malaysia',
    'PH': 'Philippines', 'TH': 'Thailand', 'VN': 'Vietnam', 'PK': 'Pakistan',
    'LK': 'Sri Lanka', 'BD': 'Bangladesh', 'NZ': 'New Zealand', 'IE': 'Ireland',
    'DK': 'Denmark', 'NO': 'Norway', 'FI': 'Finland', 'PL': 'Poland',
};

// Detect ISO from state/city name
const US_STATES = new Set([
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming', 'District of Columbia',
]);

const INDIA_STATES = new Set([
    'National Capital Territory of Delhi', 'Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu',
    'Uttar Pradesh', 'West Bengal', 'Rajasthan', 'Punjab', 'Gujarat', 'Haryana',
    'Madhya Pradesh', 'Telangana', 'Kerala', 'Andhra Pradesh', 'Bihar', 'Odisha',
    'Jharkhand', 'Assam', 'Uttarakhand', 'Himachal Pradesh', 'Goa', 'Chhattisgarh',
    'Tripura', 'Meghalaya', 'Manipur', 'Nagaland', 'Mizoram', 'Arunachal Pradesh',
    'Sikkim', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
    'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep',
    'Andaman and Nicobar Islands',
]);

export function guessISO(state: string, city: string): string | null {
    if (US_STATES.has(state)) return 'US';
    if (INDIA_STATES.has(state)) return 'IN';
    if (state === 'Tokyo' || state === 'Osaka' || state === 'Aichi' || state === 'Kanagawa' || state === 'Kyoto') return 'JP';
    if (state === 'South East' || city === 'Singapore') return 'SG';
    if (state === 'Victoria' || state === 'New South Wales' || state === 'Queensland' || state === 'Western Australia' || state === 'South Australia' || state === 'Tasmania') return 'AU';
    if (state === 'Ontario' || state === 'British Columbia' || state === 'Alberta' || state === 'Quebec') return 'CA';
    if (state === 'England' || state === 'Scotland' || state === 'Greater London' || state === 'Wales') return 'GB';
    if (state === 'Île-de-France' || city === 'Paris' || state === 'Normandie') return 'FR';
    if (state === 'Berlin' || state === 'Bavaria' || state === 'Hesse' || state === 'Baden-Württemberg') return 'DE';
    if (state === 'Seoul' || state === 'Gyeonggi-do' || state === 'Busan') return 'KR';
    if (state === 'Guangdong' || state === 'Beijing' || state === 'Shanghai' || state === 'Zhejiang') return 'CN';
    if (city === 'Tokyo') return 'JP';
    return null;
}

const colorAxisColors = ['#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#005a32'];

export function WorldPinMap({ data, metric, onCountrySelect }: WorldMapProps) {
    const [selectedISO, setSelectedISO] = useState<string | null>(null);

    const handleSelectISO = (iso: string | null) => {
        setSelectedISO(iso);
        if (onCountrySelect) {
            onCountrySelect(iso);
        }
    };

    const getMetricValue = (loc: { uniqueUsers: number; uploads: number; clicks: number }) => {
        if (metric === 'Unique Users') return loc.uniqueUsers;
        if (metric === 'Uploads') return loc.uploads;
        return loc.clicks;
    };

    const countryMap = useMemo(() => {
        const map = new Map<string, { uniqueUsers: number; uploads: number; clicks: number }>();
        data.forEach(loc => {
            const iso = guessISO(loc.state, loc.city);
            if (!iso) return;
            const cur = map.get(iso) || { uniqueUsers: 0, uploads: 0, clicks: 0 };
            cur.uniqueUsers += loc.uniqueUsers;
            cur.uploads += loc.uploads;
            cur.clicks += loc.clicks;
            map.set(iso, cur);
        });
        return map;
    }, [data]);

    const worldChartData = useMemo(() => {
        const header = ['Country', metric, { type: 'string', role: 'tooltip', p: { html: true } }];
        const rows = Array.from(countryMap.entries()).map(([iso, stats]) => {
            const countryName = ISO_TO_NAME[iso] || iso;
            const tooltipHtml = generateTooltipHtml(countryName, stats);
            return [{ v: iso, f: countryName }, getMetricValue(stats), tooltipHtml];
        });
        return [header, ...rows];
    }, [countryMap, metric]);

    const worldEvents = [
        {
            eventName: "select" as const,
            callback: ({ chartWrapper }: any) => {
                const chart = chartWrapper.getChart();
                const selection = chart.getSelection();
                if (selection.length === 0) return;
                const row = selection[0].row;
                const iso = worldChartData[row + 1][0];
                handleSelectISO(typeof iso === 'object' ? iso.v : String(iso));
            }
        }
    ];

    if (!selectedISO) {
        return (
            <div className="w-full flex flex-col fade-in">
                <div className="w-full cursor-pointer" style={{ height: '540px' }}>
                    <Chart
                        chartType="GeoChart"
                        width="100%"
                        height="100%"
                        data={worldChartData}
                        options={{
                            colorAxis: { colors: colorAxisColors },
                            backgroundColor: 'transparent',
                            datalessRegionColor: '#ecedee',
                            defaultColor: '#f5f5f5',
                            tooltip: { isHtml: true, textStyle: { color: '#0f172a' } },
                            legend: 'none'
                        }}
                        chartEvents={worldEvents}
                    />
                </div>
                <GradientLegend metric={metric} />
            </div>
        );
    }

    const countryName = ISO_TO_NAME[selectedISO] || selectedISO;
    const selectedCountryData = countryMap.get(selectedISO);

    return (
        <div className="w-full flex flex-col fade-in">
            <div className="flex items-center gap-3 px-1 pb-3 flex-wrap">
                <button
                    onClick={() => handleSelectISO(null)}
                    className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors cursor-pointer"
                >
                    ← World Map
                </button>
                <div className="text-lg font-semibold">{countryName} — Region Breakdown</div>
                {selectedCountryData && (
                    <div className="ml-auto flex gap-6 text-sm text-muted-foreground mr-[2px]">
                        <span><span className="font-semibold text-foreground">{selectedCountryData.uniqueUsers.toLocaleString()}</span> Users</span>
                        <span><span className="font-semibold text-foreground">{selectedCountryData.uploads.toLocaleString()}</span> Uploads</span>
                        <span><span className="font-semibold text-foreground">{selectedCountryData.clicks.toLocaleString()}</span> Clicks</span>
                    </div>
                )}
            </div>

            <RegionChoropleth iso={selectedISO} data={data} metric={metric} />
            <GradientLegend metric={metric} />
        </div>
    );
}

function RegionChoropleth({ iso, data, metric }: {
    iso: string;
    data: LocationData[];
    metric: 'Unique Users' | 'Uploads' | 'PDP Clicks';
}) {
    const getVal = (loc: LocationData) =>
        metric === 'Unique Users' ? loc.uniqueUsers : metric === 'Uploads' ? loc.uploads : loc.clicks;

    const stateMap = useMemo(() => {
        const map = new Map<string, { uniqueUsers: number; uploads: number; clicks: number }>();
        data.filter(loc => guessISO(loc.state, loc.city) === iso).forEach(loc => {
            let sName = loc.state;
            if (sName === 'National Capital Territory of Delhi') sName = 'Delhi';
            const cur = map.get(sName) || { uniqueUsers: 0, uploads: 0, clicks: 0 };
            cur.uniqueUsers += loc.uniqueUsers;
            cur.uploads += loc.uploads;
            cur.clicks += loc.clicks;
            map.set(sName, cur);
        });
        return map;
    }, [data, iso]);

    const regionChartData = useMemo(() => {
        const header = ['Region', metric, { type: 'string', role: 'tooltip', p: { html: true } }];
        const rows = Array.from(stateMap.entries())
            .map(([stateName, stats]) => {
                const val = metric === 'Unique Users' ? stats.uniqueUsers : metric === 'Uploads' ? stats.uploads : stats.clicks;
                // Add IN- prefix only if mapping India, but GeoChart often figures it out. 
                // For India, GeoChart perfectly supports "IN-MH" etc format. For generic safety:
                const mapCode = iso + '-' + getGoogleStateCode(iso, stateName);
                const tooltipHtml = generateTooltipHtml(stateName, stats);
                return [{ v: mapCode, f: stateName }, val, tooltipHtml];
            });

        if (rows.length === 0) {
            return [header, ['Unknown', 0, generateTooltipHtml('Unknown', { uniqueUsers: 0, uploads: 0, clicks: 0 })]];
        }
        return [header, ...rows];
    }, [stateMap, metric, iso]);

    return (
        <div className="w-full" style={{ height: '480px' }}>
            <Chart
                chartType="GeoChart"
                width="100%"
                height="100%"
                data={regionChartData}
                options={{
                    region: iso,
                    resolution: 'provinces',
                    colorAxis: { colors: colorAxisColors },
                    backgroundColor: 'transparent',
                    datalessRegionColor: '#ecedee',
                    defaultColor: '#f5f5f5',
                    tooltip: { isHtml: true, textStyle: { color: '#0f172a' } },
                    legend: 'none'
                }}
            />
        </div>
    );
}

// Maps state names to ISO 3166-2 sub-codes that Google GeoChart expects
function getGoogleStateCode(iso: string, state: string): string {
    if (iso === 'IN') {
        const IN_MAP: Record<string, string> = {
            'Andaman and Nicobar Islands': 'AN', 'Andhra Pradesh': 'AP', 'Arunachal Pradesh': 'AR',
            'Assam': 'AS', 'Bihar': 'BR', 'Chandigarh': 'CH', 'Chhattisgarh': 'CT',
            'Dadra and Nagar Haveli and Daman and Diu': 'DN', 'Delhi': 'DL', 'Goa': 'GA',
            'Gujarat': 'GJ', 'Haryana': 'HR', 'Himachal Pradesh': 'HP', 'Jammu and Kashmir': 'JK',
            'Jharkhand': 'JH', 'Karnataka': 'KA', 'Kerala': 'KL', 'Ladakh': 'LA',
            'Lakshadweep': 'LD', 'Madhya Pradesh': 'MP', 'Maharashtra': 'MH', 'Manipur': 'MN',
            'Meghalaya': 'ML', 'Mizoram': 'MZ', 'Nagaland': 'NL', 'Odisha': 'OR',
            'Puducherry': 'PY', 'Punjab': 'PB', 'Rajasthan': 'RJ', 'Sikkim': 'SK',
            'Tamil Nadu': 'TN', 'Telangana': 'TG', 'Tripura': 'TR', 'Uttar Pradesh': 'UP',
            'Uttarakhand': 'UT', 'West Bengal': 'WB'
        };
        return IN_MAP[state] || state;
    }
    if (iso === 'US') {
        const US_MAP: Record<string, string> = {
            'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
            'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
            'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
            'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
            'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
            'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
            'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
            'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
            'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
            'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
            'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
            'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
            'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC'
        };
        return US_MAP[state] || state;
    }

    // Fallback: GeoChart supports full province names natively out of the box for most regions!
    // Example: JP (Japan) requires prefecture names like "Tokyo", "Osaka" which work via string directly!
    return state;
}

function GradientLegend({ metric }: { metric: string }) {
    return (
        <div className="flex items-center gap-3 px-4 pb-4 pt-2 justify-center text-xs text-muted-foreground flex-wrap">
            <span className="font-medium">{metric}</span>
            <span>Low</span>
            <div className="h-3 w-40 rounded-sm" style={{ background: 'linear-gradient(to right, #c7e9c0, #a1d99b, #74c476, #41ab5d, #238b45, #005a32)' }} />
            <span>High</span>
            <div className="flex items-center gap-1 ml-4">
                <div className="w-3 h-3 rounded-sm" style={{ background: '#ecedee', border: '1px solid #ccc' }} />
                <span>No data</span>
            </div>
        </div>
    );
}

// Generates custom HTML for the Google Chart tooltip to show all 3 stats dynamically
function generateTooltipHtml(title: string, stats: { uniqueUsers: number, uploads: number, clicks: number }) {
    return `
        <div style="padding: 12px 16px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #f8fafc; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif; min-width: 160px; pointer-events: none; margin: 5px;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255, 255, 255, 0.2);">${title}</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #93c5fd; font-size: 13px;">Unique Users</span>
                <span style="font-weight: 600; font-size: 13px;">${stats.uniqueUsers.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #fcd34d; font-size: 13px;">Uploads</span>
                <span style="font-weight: 600; font-size: 13px;">${stats.uploads.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #f9a8d4; font-size: 13px;">PDP Clicks</span>
                <span style="font-weight: 600; font-size: 13px;">${stats.clicks.toLocaleString()}</span>
            </div>
        </div>
    `;
}
