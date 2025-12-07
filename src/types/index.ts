/**
 * Type definitions for the Google Maps Dashboard
 */

// Location data from mobile devices
export interface LocationData {
  id: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy?: number;
  speed?: number;
  heading?: number;
  altitude?: number;
}

// Weighted location for heatmap (includes intensity/weight)
export interface WeightedLocation {
  location: google.maps.LatLng;
  weight: number;
}

// Heatmap configuration options
export interface HeatmapOptions {
  radius: number;
  opacity: number;
  maxIntensity: number;
  gradient?: string[];
  dissipating?: boolean;
}

// Route waypoint for optimization
export interface RouteWaypoint {
  id: string;
  latitude: number;
  longitude: number;
  name?: string;
  priority?: number;
}

// Optimized route result
export interface OptimizedRoute {
  waypoints: RouteWaypoint[];
  totalDistance: number; // in meters
  totalDuration: number; // in seconds
  polyline: string; // encoded polyline
}

// Dashboard statistics
export interface DashboardStats {
  activeDevices: number;
  dataPoints: number;
  lastUpdate: Date | null;
  optimizedDistance: number | null;
}

// SignalR message types
export interface LocationUpdateMessage {
  type: 'location_update';
  data: LocationData;
}

export interface BulkLocationMessage {
  type: 'bulk_locations';
  data: LocationData[];
}

export interface DeviceStatusMessage {
  type: 'device_status';
  deviceId: string;
  status: 'online' | 'offline';
}

export type SignalRMessage = LocationUpdateMessage | BulkLocationMessage | DeviceStatusMessage;

// Map configuration
export interface MapConfig {
  center: google.maps.LatLngLiteral;
  zoom: number;
  mapTypeId: google.maps.MapTypeId;
  styles?: google.maps.MapTypeStyle[];
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LocationsResponse {
  locations: LocationData[];
  total: number;
}

export interface RouteOptimizationRequest {
  waypoints: RouteWaypoint[];
  optimizeFor: 'distance' | 'duration';
}

// Event types for dashboard
export interface DashboardEvents {
  onLocationUpdate: (location: LocationData) => void;
  onConnectionStatusChange: (connected: boolean) => void;
  onRouteOptimized: (route: OptimizedRoute) => void;
  onError: (error: Error) => void;
}
