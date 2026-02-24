import React, { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

interface StateData {
  state: string;
  'Unique Users': number;
  'Uploads': number;
  'PDP Clicks': number;
  city?: string;
  uniqueUsers?: number;
  uploads?: number;
  clicks?: number;
  clickRate?: number;
  avgRank?: number;
}

interface USMapProps {
  data: StateData[];
  metric: 'Unique Users' | 'Uploads' | 'PDP Clicks';
  // Raw geo data to show city-level tooltip info
  geoData?: Array<{
    state: string;
    city: string;
    uniqueUsers: number;
    uploads: number;
    clicks: number;
    clickRate: number;
    avgRank: number;
  }>;
}

const geoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

const getColor = (intensity: number): string => {
  if (intensity === 0) return '#ecedee';
  if (intensity > 0.8) return '#005a32';
  if (intensity > 0.6) return '#238b45';
  if (intensity > 0.4) return '#41ab5d';
  if (intensity > 0.2) return '#74c476';
  if (intensity > 0.05) return '#a1d99b';
  return '#c7e9c0';
};

export function USMap({ data, metric, geoData }: USMapProps) {
  const [tooltip, setTooltip] = useState<{
    visible: boolean; x: number; y: number; content: React.ReactNode;
  }>({ visible: false, x: 0, y: 0, content: null });

  // State-level metric map
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(item => map.set(item.state, item[metric]));
    return map;
  }, [data, metric]);

  // State-level detail map (all cities for that state)
  const stateDetailMap = useMemo(() => {
    if (!geoData) return new Map<string, typeof geoData>();
    const map = new Map<string, typeof geoData>();
    geoData.forEach(item => {
      const arr = map.get(item.state) || [];
      arr.push(item);
      map.set(item.state, arr);
    });
    return map;
  }, [geoData]);

  const maxValue = useMemo(() => Math.max(...data.map(item => item[metric]), 1), [data, metric]);

  return (
    <div className="w-full flex flex-col" style={{ position: 'relative' }}>
      <div className="w-full" style={{ height: '480px', position: 'relative' }}>
        {/* Tooltip */}
        {tooltip.visible && (
          <div
            style={{
              position: 'absolute',
              left: tooltip.x + 12,
              top: tooltip.y - 10,
              zIndex: 999,
              pointerEvents: 'none',
              background: 'rgba(15,23,42,0.92)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#fff',
              fontSize: '13px',
              maxWidth: '260px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            {tooltip.content}
          </div>
        )}

        <ComposableMap projection="geoAlbersUsa" className="w-full h-full">
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateName = geo.properties.name;
                const curValue = dataMap.get(stateName) || 0;
                const intensity = curValue / maxValue;
                const fill = getColor(intensity);
                const stateCities = stateDetailMap.get(stateName);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#D6D6DA"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none', cursor: curValue ? 'pointer' : 'default' },
                      hover: { fill: curValue ? '#1e3a5f' : '#dde', outline: 'none' },
                      pressed: { fill: '#1e3a5f', outline: 'none' },
                    }}
                    onMouseEnter={(e: React.MouseEvent) => {
                      if (!curValue) return;
                      // Aggregate state totals from city data
                      const totalUsers = stateCities?.reduce((s, c) => s + c.uniqueUsers, 0) ?? curValue;
                      const totalUploads = stateCities?.reduce((s, c) => s + c.uploads, 0) ?? 0;
                      const totalClicks = stateCities?.reduce((s, c) => s + c.clicks, 0) ?? 0;
                      const topCities = stateCities
                        ? [...stateCities].sort((a, b) => b.uniqueUsers - a.uniqueUsers).slice(0, 3)
                        : [];

                      const x = e.nativeEvent.offsetX;
                      const y = e.nativeEvent.offsetY;
                      setTooltip({
                        visible: true, x, y,
                        content: (
                          <div>
                            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>📍 {stateName}</div>
                            <div style={{ color: '#93c5fd', marginBottom: 2 }}>👥 Unique Users: <strong style={{ color: '#fff' }}>{totalUsers.toLocaleString()}</strong></div>
                            <div style={{ color: '#fcd34d', marginBottom: 2 }}>⬆️ Uploads: <strong style={{ color: '#fff' }}>{totalUploads.toLocaleString()}</strong></div>
                            <div style={{ color: '#f9a8d4', marginBottom: 4 }}>🖱️ PDP Clicks: <strong style={{ color: '#fff' }}>{totalClicks.toLocaleString()}</strong></div>
                            {topCities.length > 0 && (
                              <>
                                <div style={{ color: '#cbd5e1', marginBottom: 2, fontWeight: 600, fontSize: 11 }}>Top Cities:</div>
                                {topCities.map(city => (
                                  <div key={city.city} style={{ color: '#e2e8f0', fontSize: 11, marginLeft: 6 }}>
                                    🏙️ {city.city} — {city.uniqueUsers} users, {city.uploads} uploads
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        ),
                      });
                    }}
                    onMouseMove={(e: React.MouseEvent) => {
                      if (!curValue) return;
                      setTooltip(prev => ({ ...prev, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }));
                    }}
                    onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Compact gradient legend bar */}
      <div className="flex items-center gap-3 px-4 pb-4 pt-1 justify-center text-xs text-muted-foreground">
        <span className="font-medium">{metric}</span>
        <span>Low</span>
        <div className="h-3 w-40 rounded-sm" style={{
          background: 'linear-gradient(to right, #c7e9c0, #a1d99b, #74c476, #41ab5d, #238b45, #005a32)',
        }} />
        <span>High</span>
        <div className="flex items-center gap-1 ml-4">
          <div className="w-3 h-3 rounded-sm" style={{ background: '#ecedee', border: '1px solid #ccc' }} />
          <span>No data</span>
        </div>
      </div>
    </div>
  );
}
