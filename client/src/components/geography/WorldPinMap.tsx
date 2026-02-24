import React, { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';


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
}

const WORLD_GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const US_GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

// Sub-national topojson: fetched via same-origin server proxy to avoid CORS issues
// Server endpoint: /api/mapdata/:iso2 → fetches from Highcharts CDN server-side
type SubnationalConfig = { iso2: string; nameKey: string; objectKey?: string; projection?: string; projScale?: number; projCenter?: [number, number] };

const COUNTRY_SUBNATIONAL: Record<string, SubnationalConfig> = {
    '356': { iso2: 'in', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 900, projCenter: [82, 22] },        // India
    '392': { iso2: 'jp', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 1600, projCenter: [137, 37] },       // Japan
    '124': { iso2: 'ca', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 360, projCenter: [-90, 58] },        // Canada
    '036': { iso2: 'au', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 700, projCenter: [134, -27] },       // Australia
    '410': { iso2: 'kr', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 3500, projCenter: [128, 36] },       // South Korea
    '276': { iso2: 'de', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 2500, projCenter: [10, 51] },        // Germany
    '250': { iso2: 'fr', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 2000, projCenter: [2, 46] },         // France
    '826': { iso2: 'gb', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 3000, projCenter: [-2, 54] },        // UK
    '724': { iso2: 'es', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 2200, projCenter: [-3, 40] },        // Spain
    '380': { iso2: 'it', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 2200, projCenter: [12, 42] },        // Italy
    '076': { iso2: 'br', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 700, projCenter: [-52, -12] },       // Brazil
    '484': { iso2: 'mx', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 1200, projCenter: [-102, 24] },      // Mexico
    '156': { iso2: 'cn', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 700, projCenter: [104, 35] },        // China
    '528': { iso2: 'nl', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 5000, projCenter: [5.3, 52.2] },     // Netherlands
    '752': { iso2: 'se', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 1200, projCenter: [16, 63] },        // Sweden
    '756': { iso2: 'ch', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 6000, projCenter: [8.2, 46.8] },     // Switzerland
    '643': { iso2: 'ru', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 300, projCenter: [90, 62] },         // Russia
    '710': { iso2: 'za', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 1600, projCenter: [25, -29] },       // South Africa
    '784': { iso2: 'ae', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 5000, projCenter: [54, 24] },        // UAE
    '360': { iso2: 'id', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 800, projCenter: [117, -2] },        // Indonesia
    '458': { iso2: 'my', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 2000, projCenter: [109, 4] },        // Malaysia
    '608': { iso2: 'ph', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 1800, projCenter: [122, 12] },       // Philippines
    '764': { iso2: 'th', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 1800, projCenter: [101, 13] },       // Thailand
    '704': { iso2: 'vn', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 1600, projCenter: [106, 16] },       // Vietnam
    '586': { iso2: 'pk', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 1300, projCenter: [69, 30] },        // Pakistan
    '144': { iso2: 'lk', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 5000, projCenter: [80.7, 7.8] },     // Sri Lanka
    '050': { iso2: 'bd', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 3500, projCenter: [90.3, 23.7] },    // Bangladesh
    '554': { iso2: 'nz', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 1600, projCenter: [173, -41] },      // New Zealand
    '372': { iso2: 'ie', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 4000, projCenter: [-8, 53.4] },      // Ireland
    '208': { iso2: 'dk', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 4000, projCenter: [10.5, 56] },      // Denmark
    '578': { iso2: 'no', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 900, projCenter: [15, 65] },         // Norway
    '246': { iso2: 'fi', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 1200, projCenter: [26, 64] },        // Finland
    '616': { iso2: 'pl', nameKey: 'name', objectKey: 'default', projection: 'geoMercator', projScale: 2500, projCenter: [19.5, 52] },      // Poland
};

// ISO numeric → country name
const ISO_TO_NAME: Record<string, string> = {
    '840': 'United States', '356': 'India', '392': 'Japan', '702': 'Singapore',
    '826': 'United Kingdom', '036': 'Australia', '124': 'Canada', '276': 'Germany',
    '250': 'France', '076': 'Brazil', '484': 'Mexico', '410': 'South Korea',
    '156': 'China', '528': 'Netherlands', '724': 'Spain', '380': 'Italy',
    '752': 'Sweden', '756': 'Switzerland', '643': 'Russia', '710': 'South Africa',
    '784': 'United Arab Emirates', '360': 'Indonesia', '458': 'Malaysia',
    '608': 'Philippines', '764': 'Thailand', '704': 'Vietnam', '586': 'Pakistan',
    '144': 'Sri Lanka', '050': 'Bangladesh', '554': 'New Zealand', '372': 'Ireland',
    '208': 'Denmark', '578': 'Norway', '246': 'Finland', '616': 'Poland',
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

function guessISO(state: string, city: string): string | null {
    if (US_STATES.has(state)) return '840';
    if (INDIA_STATES.has(state)) return '356';
    if (state === 'Tokyo' || state === 'Osaka' || state === 'Aichi' || state === 'Kanagawa') return '392';
    if (state === 'South East' || city === 'Singapore') return '702';
    if (state === 'Victoria' || state === 'New South Wales' || state === 'Queensland' || state === 'Western Australia') return '036';
    if (state === 'Ontario' || state === 'British Columbia' || state === 'Alberta' || state === 'Quebec') return '124';
    if (state === 'England' || state === 'Scotland' || state === 'Greater London' || state === 'Wales') return '826';
    if (state === 'Île-de-France' || city === 'Paris' || state === 'Normandie') return '250';
    if (state === 'Berlin' || state === 'Bavaria' || state === 'Hesse' || state === 'Baden-Württemberg') return '276';
    if (state === 'Seoul' || state === 'Gyeonggi-do' || state === 'Busan') return '410';
    if (state === 'Guangdong' || state === 'Beijing' || state === 'Shanghai' || state === 'Zhejiang') return '156';
    if (city === 'Tokyo') return '392';
    return null;
}

const getColor = (intensity: number): string => {
    if (intensity === 0) return '#ecedee';
    if (intensity > 0.8) return '#005a32';
    if (intensity > 0.6) return '#238b45';
    if (intensity > 0.4) return '#41ab5d';
    if (intensity > 0.2) return '#74c476';
    if (intensity > 0.05) return '#a1d99b';
    return '#c7e9c0';
};

// Normalize state name for fuzzy matching (lowercase, remove punctuation/spaces)
function normalize(s: string) {
    return s?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
}

export function WorldPinMap({ data, metric }: WorldMapProps) {
    const [selectedISO, setSelectedISO] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; content: React.ReactNode }>({
        visible: false, x: 0, y: 0, content: null,
    });

    const getMetricValue = (loc: LocationData) => {
        if (metric === 'Unique Users') return loc.uniqueUsers;
        if (metric === 'Uploads') return loc.uploads;
        return loc.clicks;
    };

    // Group data by country ISO
    const countryMap = useMemo(() => {
        const map = new Map<string, { uniqueUsers: number; uploads: number; clicks: number; cities: string[] }>();
        data.forEach(loc => {
            const iso = guessISO(loc.state, loc.city);
            if (!iso) return;
            const cur = map.get(iso) || { uniqueUsers: 0, uploads: 0, clicks: 0, cities: [] };
            cur.uniqueUsers += loc.uniqueUsers;
            cur.uploads += loc.uploads;
            cur.clicks += loc.clicks;
            if (!cur.cities.includes(loc.city)) cur.cities.push(loc.city);
            map.set(iso, cur);
        });
        return map;
    }, [data]);

    const worldMax = useMemo(() => {
        let max = 1;
        countryMap.forEach(v => {
            const val = metric === 'Unique Users' ? v.uniqueUsers : metric === 'Uploads' ? v.uploads : v.clicks;
            if (val > max) max = val;
        });
        return max;
    }, [countryMap, metric]);

    const selectedCountryData = selectedISO ? countryMap.get(selectedISO) : null;
    const countryName = selectedISO ? (ISO_TO_NAME[selectedISO] || selectedISO) : '';

    const showTooltip = (e: React.MouseEvent, content: React.ReactNode) => {
        setTooltip({ visible: true, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, content });
    };
    const moveTooltip = (e: React.MouseEvent) => {
        setTooltip(p => ({ ...p, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }));
    };
    const hideTooltip = () => setTooltip(p => ({ ...p, visible: false }));

    // ─── WORLD VIEW ──────────────────────────────────────────────────────────────
    if (!selectedISO) {
        return (
            <div className="w-full flex flex-col">
                <div className="w-full" style={{ height: '540px', position: 'relative' }} data-map-container>
                    {tooltip.visible && <TooltipBox x={tooltip.x} y={tooltip.y}>{tooltip.content}</TooltipBox>}
                    <ComposableMap projection="geoMercator" projectionConfig={{ scale: 140, center: [10, 20] }} className="w-full h-full">
                        <Geographies geography={WORLD_GEO_URL}>
                            {({ geographies }) =>
                                geographies.map(geo => {
                                    const iso = String(geo.id);
                                    const cData = countryMap.get(iso);
                                    const val = cData ? (metric === 'Unique Users' ? cData.uniqueUsers : metric === 'Uploads' ? cData.uploads : cData.clicks) : 0;
                                    const fill = getColor(val / worldMax);
                                    const hasData = !!cData;
                                    const name = ISO_TO_NAME[iso] || geo.properties.name;

                                    return (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            fill={fill}
                                            stroke="#D6D6DA"
                                            strokeWidth={0.5}
                                            style={{
                                                default: { outline: 'none', cursor: hasData ? 'pointer' : 'default' },
                                                hover: { fill: hasData ? '#1e3a5f' : '#dde', outline: 'none' },
                                                pressed: { fill: '#1a3050', outline: 'none' },
                                            }}
                                            onClick={() => { if (hasData) setSelectedISO(iso); }}
                                            onMouseEnter={(e: React.MouseEvent) => {
                                                if (!hasData) return;
                                                showTooltip(e, (
                                                    <div>
                                                        <div style={{ fontWeight: 700, marginBottom: 5, fontSize: 14, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 5 }}>{name}</div>
                                                        <MetricGrid data={cData!} />
                                                        {cData!.cities.length > 0 && <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 11 }}>{cData!.cities.slice(0, 3).join(' · ')}</div>}
                                                        <div style={{ marginTop: 5, color: '#64748b', fontSize: 10, fontStyle: 'italic' }}>Click to drill in</div>
                                                    </div>
                                                ));
                                            }}
                                            onMouseMove={moveTooltip}
                                            onMouseLeave={hideTooltip}
                                        />
                                    );
                                })
                            }
                        </Geographies>
                    </ComposableMap>
                </div>
                <GradientLegend metric={metric} />
            </div>
        );
    }

    // ─── COUNTRY DRILL-DOWN ───────────────────────────────────────────────────────
    return (
        <div className="w-full flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 px-1 pb-3 flex-wrap">
                <button
                    onClick={() => setSelectedISO(null)}
                    className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors"
                >
                    ← World Map
                </button>
                <div className="text-lg font-semibold">{countryName} — Region Breakdown</div>
                {selectedCountryData && (
                    <div className="ml-auto flex gap-6 text-sm text-muted-foreground">
                        <span><span className="font-semibold text-foreground">{selectedCountryData.uniqueUsers.toLocaleString()}</span> Users</span>
                        <span><span className="font-semibold text-foreground">{selectedCountryData.uploads.toLocaleString()}</span> Uploads</span>
                        <span><span className="font-semibold text-foreground">{selectedCountryData.clicks.toLocaleString()}</span> Clicks</span>
                    </div>
                )}
            </div>

            {/* Choropleth for the selected country */}
            <RegionChoropleth
                iso={selectedISO}
                data={data}
                metric={metric}
                tooltip={tooltip}
                setTooltip={setTooltip}
            />

            <GradientLegend metric={metric} />
        </div>
    );
}

// ─── REGION CHOROPLETH (works for ALL countries) ──────────────────────────────
// Uses URL strings for Geographies — react-simple-maps handles fetching internally.
// US map: jsdelivr CDN (TopoJSON), Other countries: /api/mapdata/:iso2 (server-proxied GeoJSON)
function RegionChoropleth({ iso, data, metric, tooltip, setTooltip }: {
    iso: string;
    data: LocationData[];
    metric: 'Unique Users' | 'Uploads' | 'PDP Clicks';
    tooltip: any;
    setTooltip: any;
}) {
    const config = iso === '840'
        ? { iso2: 'us', nameKey: 'name', projection: 'geoAlbersUsa' as const, projScale: undefined, projCenter: undefined }
        : COUNTRY_SUBNATIONAL[iso]
        || null;

    // Build the URL string — react-simple-maps will fetch & parse it internally
    // US: jsdelivr CDN (TopoJSON) | Others: our server proxy (returns GeoJSON)
    const geoUrl = iso === '840' ? US_GEO_URL : config ? `/api/mapdata/${config.iso2}` : null;

    // Get metric value helper
    const getVal = (loc: LocationData) =>
        metric === 'Unique Users' ? loc.uniqueUsers : metric === 'Uploads' ? loc.uploads : loc.clicks;

    // Aggregate data by STATE name
    const stateMap = useMemo(() => {
        const map = new Map<string, { uniqueUsers: number; uploads: number; clicks: number; cities: LocationData[] }>();
        data.filter(loc => guessISO(loc.state, loc.city) === iso).forEach(loc => {
            const key = normalize(loc.state);
            const cur = map.get(key) || { uniqueUsers: 0, uploads: 0, clicks: 0, cities: [] };
            cur.uniqueUsers += loc.uniqueUsers;
            cur.uploads += loc.uploads;
            cur.clicks += loc.clicks;
            cur.cities.push(loc);
            map.set(key, cur);
        });
        return map;
    }, [data, iso]);

    // Also build a city-level map for direct city matching (for countries where state = city)
    const cityMap = useMemo(() => {
        const map = new Map<string, LocationData>();
        data.filter(loc => guessISO(loc.state, loc.city) === iso).forEach(loc => {
            map.set(normalize(loc.city), loc);
        });
        return map;
    }, [data, iso]);

    const maxVal = useMemo(() => {
        let max = 1;
        stateMap.forEach(v => {
            const val = metric === 'Unique Users' ? v.uniqueUsers : metric === 'Uploads' ? v.uploads : v.clicks;
            if (val > max) max = val;
        });
        return max;
    }, [stateMap, metric]);

    const showTooltip = (e: React.MouseEvent, content: React.ReactNode) =>
        setTooltip({ visible: true, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, content });
    const moveTooltip = (e: React.MouseEvent) =>
        setTooltip((p: any) => ({ ...p, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }));
    const hideTooltip = () => setTooltip((p: any) => ({ ...p, visible: false }));

    const lookupRegion = (geoName: string) => {
        const norm = normalize(geoName);
        // Try exact normalized match to state
        let match = stateMap.get(norm);
        if (match) return match;
        // Try partial match: stateMap key starts with or contains norm
        const entries = Array.from(stateMap.entries());
        for (let i = 0; i < entries.length; i++) {
            const [k, v] = entries[i];
            if (norm.includes(k) || k.includes(norm)) return v;
        }
        // Try city match
        const cityMatch = cityMap.get(norm);
        if (cityMatch) return { uniqueUsers: cityMatch.uniqueUsers, uploads: cityMatch.uploads, clicks: cityMatch.clicks, cities: [cityMatch] };
        return null;
    };

    if (!config || !geoUrl) {
        // Fallback: simple card grid for countries without boundary data
        const cities = data.filter(loc => guessISO(loc.state, loc.city) === iso)
            .sort((a, b) => getVal(b) - getVal(a));
        const cityMax = Math.max(...cities.map(c => getVal(c)), 1);
        return (
            <div className="w-full px-4 py-4">
                <p className="text-sm text-muted-foreground mb-4">Region breakdown — {ISO_TO_NAME[iso]}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {cities.map((loc, i) => {
                        const val = getVal(loc);
                        const intensity = val / cityMax;
                        return (
                            <div key={i} className="rounded-lg border border-border p-3 flex flex-col gap-1"
                                style={{ borderLeft: `4px solid ${getColor(intensity)}` }}>
                                <div className="font-semibold text-sm">{loc.city}</div>
                                <div className="text-xs text-muted-foreground">{loc.state}</div>
                                <div className="text-sm font-bold mt-1">{val.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{metric}</span></div>
                                <div className="text-xs text-muted-foreground">{loc.uploads} uploads · {loc.clicks} clicks</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    const projProps: any = config.projection === 'geoAlbersUsa' || iso === '840'
        ? { projection: 'geoAlbersUsa' }
        : {
            projection: config.projection || 'geoMercator',
            projectionConfig: {
                scale: config.projScale || 1000,
                center: config.projCenter || [0, 0],
            },
        };

    return (
        <div className="w-full" style={{ height: '480px', position: 'relative' }} data-map-container>
            {tooltip.visible && <TooltipBox x={tooltip.x} y={tooltip.y}>{tooltip.content}</TooltipBox>}
            <ComposableMap {...projProps} className="w-full h-full">
                <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                        geographies.map(geo => {
                            // Try all possible name property keys
                            const geoName = geo.properties[config.nameKey]
                                || geo.properties['name']
                                || geo.properties['NAME']
                                || geo.properties['Name']
                                || geo.properties['NAME_1']
                                || geo.properties['NAME_2']
                                || '';
                            const regionData = lookupRegion(geoName);
                            const val = regionData
                                ? (metric === 'Unique Users' ? regionData.uniqueUsers : metric === 'Uploads' ? regionData.uploads : regionData.clicks)
                                : 0;
                            const fill = getColor(val / maxVal);

                            return (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    fill={fill}
                                    stroke="#D6D6DA"
                                    strokeWidth={0.5}
                                    style={{
                                        default: { outline: 'none', cursor: regionData ? 'pointer' : 'default' },
                                        hover: { fill: regionData ? '#1e3a5f' : '#dde', outline: 'none' },
                                        pressed: { outline: 'none' },
                                    }}
                                    onMouseEnter={(e: React.MouseEvent) => {
                                        if (!regionData) return;
                                        const topCities = [...regionData.cities]
                                            .sort((a, b) => getVal(b) - getVal(a))
                                            .slice(0, 4);
                                        showTooltip(e, (
                                            <div>
                                                <div style={{ fontWeight: 700, marginBottom: 5, fontSize: 14, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 5 }}>
                                                    {geoName}
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3px 12px', marginBottom: 6 }}>
                                                    <span style={{ color: '#93c5fd' }}>Unique Users</span>
                                                    <span style={{ fontWeight: 600 }}>{regionData.uniqueUsers.toLocaleString()}</span>
                                                    <span style={{ color: '#fcd34d' }}>Uploads</span>
                                                    <span style={{ fontWeight: 600 }}>{regionData.uploads.toLocaleString()}</span>
                                                    <span style={{ color: '#f9a8d4' }}>PDP Clicks</span>
                                                    <span style={{ fontWeight: 600 }}>{regionData.clicks.toLocaleString()}</span>
                                                </div>
                                                {topCities.length > 0 && (
                                                    <>
                                                        <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginBottom: 3 }}>Top Cities</div>
                                                        {topCities.map(c => (
                                                            <div key={c.city} style={{ color: '#e2e8f0', fontSize: 11, marginLeft: 4, marginBottom: 1 }}>
                                                                {c.city} — {c.uniqueUsers} users, {c.uploads} uploads
                                                            </div>
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        ));
                                    }}
                                    onMouseMove={moveTooltip}
                                    onMouseLeave={hideTooltip}
                                />
                            );
                        })
                    }
                </Geographies>
            </ComposableMap>
        </div>
    );
}

// ─── SHARED HELPERS ────────────────────────────────────────────────────────────
function TooltipBox({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
    return (
        <div style={{
            position: 'absolute', left: x + 12, top: y - 10, zIndex: 999,
            pointerEvents: 'none', background: 'rgba(15,23,42,0.93)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
            padding: '10px 14px', color: '#fff', fontSize: '13px', maxWidth: '260px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        }}>
            {children}
        </div>
    );
}

function MetricGrid({ data }: { data: { uniqueUsers: number; uploads: number; clicks: number } }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3px 12px' }}>
            <span style={{ color: '#93c5fd' }}>Unique Users</span>
            <span style={{ fontWeight: 600 }}>{data.uniqueUsers.toLocaleString()}</span>
            <span style={{ color: '#fcd34d' }}>Uploads</span>
            <span style={{ fontWeight: 600 }}>{data.uploads.toLocaleString()}</span>
            <span style={{ color: '#f9a8d4' }}>PDP Clicks</span>
            <span style={{ fontWeight: 600 }}>{data.clicks.toLocaleString()}</span>
        </div>
    );
}

function GradientLegend({ metric }: { metric: string }) {
    return (
        <div className="flex items-center gap-3 px-4 pb-4 pt-2 justify-center text-xs text-muted-foreground">
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
