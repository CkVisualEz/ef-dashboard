declare module 'react-simple-maps' {
  import { ReactNode } from 'react';

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: Record<string, any>;
    width?: number;
    height?: number;
    children?: ReactNode;
  }

  export interface GeographiesProps {
    geography: string | object;
    children: (props: { geographies: any[] }) => ReactNode;
  }

  export interface GeographyProps {
    geography: any;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
  }

  export interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    children?: ReactNode;
  }

  export const ComposableMap: React.FC<ComposableMapProps>;
  export const Geographies: React.FC<GeographiesProps>;
  export const Geography: React.FC<GeographyProps>;
  export const ZoomableGroup: React.FC<ZoomableGroupProps>;
}

