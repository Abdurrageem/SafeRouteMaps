import { LocationData, WeightedLocation, HeatmapOptions } from '../types';

/**
 * HeatmapRenderer manages the heatmap layer on the Google Map
 */
export class HeatmapRenderer {
  private map: google.maps.Map;
  private heatmap: google.maps.visualization.HeatmapLayer | null = null;
  private dataPoints: Map<string, LocationData> = new Map();
  private options: HeatmapOptions;

  constructor(map: google.maps.Map, options?: Partial<HeatmapOptions>) {
    this.map = map;
    this.options = {
      radius: 30,
      opacity: 0.7,
      maxIntensity: 5,
      dissipating: true,
      gradient: [
        'rgba(0, 255, 0, 0)',
        'rgba(0, 255, 0, 1)',
        'rgba(128, 255, 0, 1)',
        'rgba(255, 255, 0, 1)',
        'rgba(255, 192, 0, 1)',
        'rgba(255, 128, 0, 1)',
        'rgba(255, 64, 0, 1)',
        'rgba(255, 0, 0, 1)',
      ],
      ...options,
    };

    this.initializeHeatmap();
  }

  /**
   * Initialize the heatmap layer
   */
  private initializeHeatmap(): void {
    this.heatmap = new google.maps.visualization.HeatmapLayer({
      map: this.map,
      data: [],
      radius: this.options.radius,
      opacity: this.options.opacity,
      maxIntensity: this.options.maxIntensity,
      gradient: this.options.gradient,
      dissipating: this.options.dissipating,
    });
  }

  /**
   * Add a single location point to the heatmap
   */
  addPoint(location: LocationData): void {
    const key = `${location.deviceId}_${location.id}`;
    this.dataPoints.set(key, location);
    this.updateHeatmapData();
  }

  /**
   * Add multiple location points to the heatmap
   */
  addPoints(locations: LocationData[]): void {
    locations.forEach((location) => {
      const key = `${location.deviceId}_${location.id}`;
      this.dataPoints.set(key, location);
    });
    this.updateHeatmapData();
  }

  /**
   * Update a location point (for real-time tracking)
   */
  updatePoint(location: LocationData): void {
    // Remove old points from the same device (keep only the latest)
    const keysToRemove: string[] = [];
    this.dataPoints.forEach((_, key) => {
      if (key.startsWith(location.deviceId)) {
        keysToRemove.push(key);
      }
    });
    keysToRemove.forEach((key) => this.dataPoints.delete(key));

    // Add the new point
    const key = `${location.deviceId}_${location.id}`;
    this.dataPoints.set(key, location);
    this.updateHeatmapData();
  }

  /**
   * Clear all heatmap data
   */
  clear(): void {
    this.dataPoints.clear();
    if (this.heatmap) {
      this.heatmap.setData([]);
    }
  }

  /**
   * Update the heatmap visualization with current data
   */
  private updateHeatmapData(): void {
    if (!this.heatmap) return;

    const weightedLocations: google.maps.visualization.WeightedLocation[] = [];

    this.dataPoints.forEach((location) => {
      // Calculate weight based on recency (more recent = higher weight)
      const age = Date.now() - new Date(location.timestamp).getTime();
      const maxAge = 3600000; // 1 hour in milliseconds
      const weight = Math.max(0.1, 1 - age / maxAge);

      weightedLocations.push({
        location: new google.maps.LatLng(location.latitude, location.longitude),
        weight: weight * (location.accuracy ? 100 / location.accuracy : 1),
      });
    });

    this.heatmap.setData(weightedLocations);
  }

  /**
   * Set heatmap radius
   */
  setRadius(radius: number): void {
    this.options.radius = radius;
    if (this.heatmap) {
      this.heatmap.set('radius', radius);
    }
  }

  /**
   * Set heatmap opacity
   */
  setOpacity(opacity: number): void {
    this.options.opacity = opacity;
    if (this.heatmap) {
      this.heatmap.set('opacity', opacity);
    }
  }

  /**
   * Set heatmap max intensity
   */
  setMaxIntensity(intensity: number): void {
    this.options.maxIntensity = intensity;
    if (this.heatmap) {
      this.heatmap.set('maxIntensity', intensity);
    }
  }

  /**
   * Toggle heatmap visibility
   */
  setVisible(visible: boolean): void {
    if (this.heatmap) {
      this.heatmap.setMap(visible ? this.map : null);
    }
  }

  /**
   * Get the current number of data points
   */
  getPointCount(): number {
    return this.dataPoints.size;
  }

  /**
   * Get all current data points
   */
  getDataPoints(): LocationData[] {
    return Array.from(this.dataPoints.values());
  }

  /**
   * Set custom gradient colors
   */
  setGradient(gradient: string[]): void {
    this.options.gradient = gradient;
    if (this.heatmap) {
      this.heatmap.set('gradient', gradient);
    }
  }
}
