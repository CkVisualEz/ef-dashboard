import React, { useEffect, useRef, useState } from 'react';

interface StateData {
  state: string;
  'Unique Users': number;
  'Uploads': number;
  'PDP Clicks': number;
}

interface USMapProps {
  data: StateData[];
  metric: 'Unique Users' | 'Uploads' | 'PDP Clicks';
}

// State name to FIPS code mapping
const stateToFIPS: Record<string, string> = {
  'Alabama': '01', 'Alaska': '02', 'Arizona': '04', 'Arkansas': '05', 'California': '06',
  'Colorado': '08', 'Connecticut': '09', 'Delaware': '10', 'Florida': '12', 'Georgia': '13',
  'Hawaii': '15', 'Idaho': '16', 'Illinois': '17', 'Indiana': '18', 'Iowa': '19',
  'Kansas': '20', 'Kentucky': '21', 'Louisiana': '22', 'Maine': '23', 'Maryland': '24',
  'Massachusetts': '25', 'Michigan': '26', 'Minnesota': '27', 'Mississippi': '28', 'Missouri': '29',
  'Montana': '30', 'Nebraska': '31', 'Nevada': '32', 'New Hampshire': '33', 'New Jersey': '34',
  'New Mexico': '35', 'New York': '36', 'North Carolina': '37', 'North Dakota': '38', 'Ohio': '39',
  'Oklahoma': '40', 'Oregon': '41', 'Pennsylvania': '42', 'Rhode Island': '44', 'South Carolina': '45',
  'South Dakota': '46', 'Tennessee': '47', 'Texas': '48', 'Utah': '49', 'Vermont': '50',
  'Virginia': '51', 'Washington': '53', 'West Virginia': '54', 'Wisconsin': '55', 'Wyoming': '56',
  'District of Columbia': '11'
};

export function USMap({ data, metric }: USMapProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load Chart.js and dependencies from CDN
    const loadLibraries = async () => {
      try {
        // Load Chart.js
        if (!(window as any).Chart) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
            script.onload = () => {
              console.log('Chart.js loaded');
              resolve(true);
            };
            script.onerror = (err) => {
              console.error('Failed to load Chart.js:', err);
              reject(new Error('Failed to load Chart.js'));
            };
            document.head.appendChild(script);
          });
        }

        // Load topojson-client
        if (!(window as any).topojson) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js';
            script.onload = () => {
              console.log('topojson-client loaded');
              resolve(true);
            };
            script.onerror = (err) => {
              console.error('Failed to load topojson-client:', err);
              reject(new Error('Failed to load topojson-client'));
            };
            document.head.appendChild(script);
          });
        }

        // Load chartjs-chart-geo - try different CDN URLs
        if (!(window as any).ChartGeo && !(window as any).Chart?.geo) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            // Try unpkg as alternative
            script.src = 'https://unpkg.com/chartjs-chart-geo@4.3.6/dist/chartjs-chart-geo.umd.min.js';
            script.onload = () => {
              console.log('chartjs-chart-geo loaded');
              // Check if it's available as ChartGeo or Chart.geo
              if ((window as any).ChartGeo || (window as any).Chart?.geo) {
                resolve(true);
              } else {
                // Try jsdelivr as fallback
                const script2 = document.createElement('script');
                script2.src = 'https://cdn.jsdelivr.net/npm/chartjs-chart-geo@4.3.6/dist/chartjs-chart-geo.umd.min.js';
                script2.onload = () => {
                  console.log('chartjs-chart-geo loaded from jsdelivr');
                  resolve(true);
                };
                script2.onerror = () => {
                  console.error('Failed to load chartjs-chart-geo from both CDNs');
                  reject(new Error('Failed to load chartjs-chart-geo'));
                };
                document.head.appendChild(script2);
              }
            };
            script.onerror = () => {
              // Try jsdelivr as fallback
              const script2 = document.createElement('script');
              script2.src = 'https://cdn.jsdelivr.net/npm/chartjs-chart-geo@4.3.6/dist/chartjs-chart-geo.umd.min.js';
              script2.onload = () => {
                console.log('chartjs-chart-geo loaded from jsdelivr fallback');
                resolve(true);
              };
              script2.onerror = (err) => {
                console.error('Failed to load chartjs-chart-geo:', err);
                reject(new Error('Failed to load chartjs-chart-geo'));
              };
              document.head.appendChild(script2);
            };
            document.head.appendChild(script);
          });
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading libraries:', err);
        setError('Failed to load chart libraries. Please check your internet connection.');
        setIsLoading(false);
      }
    };

    loadLibraries();
  }, []);

  useEffect(() => {
    if (isLoading || error || !chartRef.current) return;
    
    const Chart = (window as any).Chart;
    const topojson = (window as any).topojson;
    const ChartGeo = (window as any).ChartGeo || (window as any).Chart?.geo;

    if (!Chart || !topojson) {
      console.error('Chart.js or topojson not loaded');
      return;
    }

    if (!ChartGeo) {
      console.error('ChartGeo not loaded');
      setError('Failed to load chartjs-chart-geo library');
      return;
    }

    try {
      // Check how ChartGeo is exposed
      console.log('ChartGeo object:', ChartGeo);
      console.log('ChartGeo keys:', Object.keys(ChartGeo || {}));
      
      // Register Chart.js components - try different ways ChartGeo might be exposed
      const ChoroplethController = ChartGeo?.ChoroplethController || ChartGeo?.choropleth?.ChoroplethController || (ChartGeo as any)?.default?.ChoroplethController;
      const GeoFeature = ChartGeo?.GeoFeature || ChartGeo?.choropleth?.GeoFeature || (ChartGeo as any)?.default?.GeoFeature;
      const ColorScale = ChartGeo?.ColorScale || ChartGeo?.choropleth?.ColorScale || (ChartGeo as any)?.default?.ColorScale;
      const ProjectionScale = ChartGeo?.ProjectionScale || ChartGeo?.choropleth?.ProjectionScale || (ChartGeo as any)?.default?.ProjectionScale;

      if (!ChoroplethController || !GeoFeature || !ColorScale || !ProjectionScale) {
        console.error('ChartGeo components not found. Available:', Object.keys(ChartGeo || {}));
        setError('ChartGeo components not available. Check console for details.');
        return;
      }

      Chart.register(
        ChoroplethController,
        GeoFeature,
        ColorScale,
        ProjectionScale,
        Chart.CategoryScale,
        Chart.LinearScale,
        Chart.Tooltip,
        Chart.Legend,
        Chart.Title
      );
      
      console.log('Chart.js components registered successfully');
    } catch (regError) {
      console.error('Error registering Chart.js components:', regError);
      setError('Failed to register chart components. Check console for details.');
      return;
    }

    // Create a map of state data by FIPS code
    const dataMap = new Map<string, number>();
    data.forEach(item => {
      const fips = stateToFIPS[item.state];
      if (fips) {
        dataMap.set(fips, item[metric]);
      }
    });

    // Fetch US states TopoJSON
    fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
      .then(res => res.json())
      .then((usStates: any) => {
        // Convert TopoJSON to GeoJSON features
        const states = topojson.feature(usStates, usStates.objects.states);
        
        const chartData = states.features.map((feature: any) => {
          const fips = feature.id;
          const value = dataMap.get(fips) || 0;
          return {
            feature,
            value
          };
        });

        // Get max value for color scaling
        const maxValue = Math.max(...Array.from(dataMap.values()), 1);

        // Color function
        const getColor = (value: number): string => {
          if (value === 0) return '#e5e7eb';
          const intensity = Math.min(value / maxValue, 1);
          const hue = 200;
          const saturation = 70;
          const lightness = 100 - (intensity * 50);
          return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        };

        const config: any = {
          type: 'choropleth',
          data: {
            labels: chartData.map((d: any) => d.feature.properties?.name || ''),
            datasets: [{
              label: metric,
              data: chartData,
              backgroundColor: (context: any) => {
                if (context.parsed && context.parsed.value !== undefined) {
                  return getColor(context.parsed.value);
                }
                return '#e5e7eb';
              }
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: (context: any) => {
                    const value = context.parsed?.value || 0;
                    const stateName = context.label || 'Unknown';
                    return `${stateName}: ${value.toLocaleString()}`;
                  }
                }
              },
              title: {
                display: false
              }
            },
            scales: {
              projection: {
                axis: 'x',
                projection: 'geoAlbersUsa'
              }
            }
          }
        };

        // Destroy existing chart if it exists
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }

        // Create new chart
        chartInstanceRef.current = new Chart(chartRef.current, config);

        return () => {
          if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
          }
        };
      })
      .catch(error => {
        console.error('Error loading map data:', error);
        setError('Failed to load map data');
      });
  }, [data, metric, isLoading, error]);

  // Get max value for legend
  const maxValue = Math.max(...data.map(item => item[metric]), 1);

  const getColor = (value: number): string => {
    if (value === 0) return '#e5e7eb';
    const intensity = Math.min(value / maxValue, 1);
    const hue = 200;
    const saturation = 70;
    const lightness = 100 - (intensity * 50);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="text-muted-foreground">Loading map...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <div className="relative w-full" style={{ height: '500px' }}>
        <canvas ref={chartRef}></canvas>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-sm flex-wrap justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: '#e5e7eb' }}></div>
          <span>0</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: getColor(maxValue * 0.25) }}></div>
          <span>Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: getColor(maxValue * 0.5) }}></div>
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: getColor(maxValue) }}></div>
          <span>High ({maxValue.toLocaleString()})</span>
        </div>
      </div>
    </div>
  );
}
