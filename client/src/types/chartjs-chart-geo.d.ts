declare module 'chartjs-chart-geo' {
  import { ChartComponent } from 'chart.js';
  
  export class ChoroplethController extends ChartComponent {}
  export class GeoFeature extends ChartComponent {}
  export class ColorScale extends ChartComponent {}
  export class ProjectionScale extends ChartComponent {}
}

