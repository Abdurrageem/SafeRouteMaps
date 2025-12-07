import { LocationData } from '../types';

/**
 * ApiService handles HTTP requests to the backend server
 */
export class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch all locations from the database
   */
  async getLocations(limit?: number, offset?: number): Promise<LocationData[]> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (offset) params.set('offset', offset.toString());

    const response = await fetch(`${this.baseUrl}/locations?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch locations: ${response.statusText}`);
    }

    const data = await response.json();
    return data.locations.map(this.parseLocation);
  }

  /**
   * Fetch locations for a specific device
   */
  async getDeviceLocations(deviceId: string, limit?: number): Promise<LocationData[]> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());

    const response = await fetch(`${this.baseUrl}/locations/device/${deviceId}?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch device locations: ${response.statusText}`);
    }

    const data = await response.json();
    return data.locations.map(this.parseLocation);
  }

  /**
   * Fetch locations within a time range
   */
  async getLocationsByTimeRange(from: Date, to: Date): Promise<LocationData[]> {
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
    });

    const response = await fetch(`${this.baseUrl}/locations/range?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch locations by time range: ${response.statusText}`);
    }

    const data = await response.json();
    return data.locations.map(this.parseLocation);
  }

  /**
   * Fetch locations within a geographic bounding box
   */
  async getLocationsByBounds(
    north: number,
    south: number,
    east: number,
    west: number
  ): Promise<LocationData[]> {
    const params = new URLSearchParams({
      north: north.toString(),
      south: south.toString(),
      east: east.toString(),
      west: west.toString(),
    });

    const response = await fetch(`${this.baseUrl}/locations/bounds?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch locations by bounds: ${response.statusText}`);
    }

    const data = await response.json();
    return data.locations.map(this.parseLocation);
  }

  /**
   * Get list of active devices
   */
  async getActiveDevices(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/devices`);
    if (!response.ok) {
      throw new Error(`Failed to fetch active devices: ${response.statusText}`);
    }

    const data = await response.json();
    return data.devices;
  }

  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<{
    totalLocations: number;
    activeDevices: number;
    lastUpdate: Date | null;
  }> {
    const response = await fetch(`${this.baseUrl}/stats`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      totalLocations: data.totalLocations,
      activeDevices: data.activeDevices,
      lastUpdate: data.lastUpdate ? new Date(data.lastUpdate) : null,
    };
  }

  /**
   * Parse location data from API response
   */
  private parseLocation(data: any): LocationData {
    return {
      id: data.id,
      deviceId: data.deviceId,
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      timestamp: new Date(data.timestamp),
      accuracy: data.accuracy ? parseFloat(data.accuracy) : undefined,
      speed: data.speed ? parseFloat(data.speed) : undefined,
      heading: data.heading ? parseFloat(data.heading) : undefined,
      altitude: data.altitude ? parseFloat(data.altitude) : undefined,
    };
  }
}
