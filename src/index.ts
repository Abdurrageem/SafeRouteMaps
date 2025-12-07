import { MapManager } from './components/MapManager';
import { HeatmapRenderer } from './components/HeatmapRenderer';
import { RouteOptimizer } from './components/RouteOptimizer';
import { SignalRService } from './services/SignalRService';
import { ApiService } from './services/ApiService';
import { LocationData, DashboardStats, RouteWaypoint } from './types';

/**
 * Main Dashboard Application
 */
class Dashboard {
  private mapManager: MapManager | null = null;
  private heatmapRenderer: HeatmapRenderer | null = null;
  private heatmapHighRisk: HeatmapRenderer | null = null;
  private heatmapMediumRisk: HeatmapRenderer | null = null;
  private heatmapLowRisk: HeatmapRenderer | null = null;
  private heatmapVeryLowRisk: HeatmapRenderer | null = null;
  private riskZoneCircles: google.maps.Circle[] = [];
  private routeOptimizer: RouteOptimizer | null = null;
  private signalRService: SignalRService | null = null;
  private apiService: ApiService;

  private stats: DashboardStats = {
    activeDevices: 0,
    dataPoints: 0,
    lastUpdate: null,
    optimizedDistance: null,
  };

  private deviceLocations: Map<string, LocationData> = new Map();

  constructor() {
    this.apiService = new ApiService('/api');
  }

  /**
   * Initialize the dashboard
   */
  async initialize(): Promise<void> {
    try {
      // Show loading overlay
      this.setLoading(true);

      // Get Google Maps API key from server
      const apiKey = await this.getGoogleMapsApiKey();

      if (!apiKey) {
        throw new Error('Google Maps API key not configured. Please set GOOGLE_MAPS_API_KEY in your .env file.');
      }

      // Initialize map - Center on Cape Town
      this.mapManager = new MapManager('map', apiKey, {
        center: { lat: -33.9249, lng: 18.4241 }, // Cape Town
        zoom: 11,
      });

      const map = await this.mapManager.initialize();

      // Initialize heatmap renderers for each risk level with distinct colors
      // High risk - Red heatmap (high intensity)
      this.heatmapHighRisk = new HeatmapRenderer(map, {
        radius: 50,
        opacity: 0.75,
        maxIntensity: 1,
        gradient: [
          'rgba(220, 53, 69, 0)',
          'rgba(220, 53, 69, 0.4)',
          'rgba(200, 35, 51, 0.7)',
          'rgba(180, 20, 35, 1)',
        ],
      });

      // Medium risk - Yellow/Orange heatmap (moderate intensity)
      this.heatmapMediumRisk = new HeatmapRenderer(map, {
        radius: 40,
        opacity: 0.65,
        maxIntensity: 0.8,
        gradient: [
          'rgba(255, 193, 7, 0)',
          'rgba(255, 193, 7, 0.4)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(217, 119, 6, 1)',
        ],
      });

      // Low risk - Light green heatmap (lower intensity)
      this.heatmapLowRisk = new HeatmapRenderer(map, {
        radius: 35,
        opacity: 0.55,
        maxIntensity: 0.6,
        gradient: [
          'rgba(132, 204, 22, 0)',
          'rgba(132, 204, 22, 0.35)',
          'rgba(101, 163, 13, 0.6)',
          'rgba(77, 124, 15, 0.85)',
        ],
      });

      // Very low risk - Green heatmap (minimal intensity)
      this.heatmapVeryLowRisk = new HeatmapRenderer(map, {
        radius: 30,
        opacity: 0.45,
        maxIntensity: 0.4,
        gradient: [
          'rgba(34, 197, 94, 0)',
          'rgba(34, 197, 94, 0.3)',
          'rgba(22, 163, 74, 0.5)',
          'rgba(21, 128, 61, 0.75)',
        ],
      });

      // Keep legacy renderer for backwards compatibility
      this.heatmapRenderer = this.heatmapHighRisk;

      // Initialize route optimizer
      this.routeOptimizer = new RouteOptimizer(map);

      // Load initial data from database
      await this.loadInitialData();

      // Initialize SignalR connection
      await this.initializeSignalR();

      // Set up UI event listeners
      this.setupEventListeners();

      // Hide loading overlay
      this.setLoading(false);

      console.log('Dashboard initialized successfully');
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
      this.setLoading(false);
      this.showError('Failed to initialize dashboard. Check console for details.');
    }
  }

  /**
   * Get Google Maps API key from server
   */
  private async getGoogleMapsApiKey(): Promise<string> {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      return data.googleMapsApiKey;
    } catch (error) {
      console.error('Failed to get API key:', error);
      return '';
    }
  }

  /**
   * Load initial location data from the database
   */
  private async loadInitialData(): Promise<void> {
    try {
      // Load crime heatmap data first
      await this.loadCrimeHeatmapData();

      // Load device locations
      const locations = await this.apiService.getLocations(1000);
      
      // Add device locations to heatmap (optional - comment out if only showing crime data)
      // if (this.heatmapRenderer && locations.length > 0) {
      //   this.heatmapRenderer.addPoints(locations);
      // }

      // Get stats - combine all heatmap point counts
      const apiStats = await this.apiService.getStats();
      const totalDataPoints = 
        (this.heatmapHighRisk?.getPointCount() || 0) +
        (this.heatmapMediumRisk?.getPointCount() || 0) +
        (this.heatmapLowRisk?.getPointCount() || 0) +
        (this.heatmapVeryLowRisk?.getPointCount() || 0);
        
      this.updateStats({
        activeDevices: apiStats.activeDevices,
        dataPoints: totalDataPoints,
        lastUpdate: apiStats.lastUpdate,
        optimizedDistance: null,
      });

      console.log(`Dashboard loaded with crime hotspot data`);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }

  /**
   * Load crime heatmap data from the API
   */
  private async loadCrimeHeatmapData(): Promise<void> {
    try {
      // Fetch heatmap data grouped by risk level for multi-layer visualization
      const response = await fetch('/api/crime/heatmap/by-risk?points=25&radius=2.5');
      const data = await response.json();

      if (data.success && data.data) {
        // Load high-risk data (red heatmap)
        if (this.heatmapHighRisk && data.data.high) {
          const highRiskLocations = data.data.high.map((point: any, index: number) => ({
            id: `high_${index}`,
            deviceId: 'high_risk',
            latitude: point.lat,
            longitude: point.lng,
            timestamp: new Date(),
            accuracy: point.weight * 100,
          }));
          this.heatmapHighRisk.addPoints(highRiskLocations);
          console.log(`Loaded ${data.data.high.length} high-risk heatmap points`);
        }

        // Load medium-risk data (yellow heatmap)
        if (this.heatmapMediumRisk && data.data.medium) {
          const mediumRiskLocations = data.data.medium.map((point: any, index: number) => ({
            id: `medium_${index}`,
            deviceId: 'medium_risk',
            latitude: point.lat,
            longitude: point.lng,
            timestamp: new Date(),
            accuracy: point.weight * 100,
          }));
          this.heatmapMediumRisk.addPoints(mediumRiskLocations);
          console.log(`Loaded ${data.data.medium.length} medium-risk heatmap points`);
        }

        // Load low-risk data (light green heatmap)
        if (this.heatmapLowRisk && data.data.low) {
          const lowRiskLocations = data.data.low.map((point: any, index: number) => ({
            id: `low_${index}`,
            deviceId: 'low_risk',
            latitude: point.lat,
            longitude: point.lng,
            timestamp: new Date(),
            accuracy: point.weight * 100,
          }));
          this.heatmapLowRisk.addPoints(lowRiskLocations);
          console.log(`Loaded ${data.data.low.length} low-risk heatmap points`);
        }

        // Load very low-risk data (green heatmap)
        if (this.heatmapVeryLowRisk && data.data.veryLow) {
          const veryLowRiskLocations = data.data.veryLow.map((point: any, index: number) => ({
            id: `verylow_${index}`,
            deviceId: 'very_low_risk',
            latitude: point.lat,
            longitude: point.lng,
            timestamp: new Date(),
            accuracy: point.weight * 100,
          }));
          this.heatmapVeryLowRisk.addPoints(veryLowRiskLocations);
          console.log(`Loaded ${data.data.veryLow.length} very-low-risk heatmap points`);
        }

        // Also fetch and display hotspot markers with zone circles
        await this.loadCrimeHotspotMarkers();
      }
    } catch (error) {
      console.error('Failed to load crime heatmap data:', error);
    }
  }

  /**
   * Load and display crime hotspot markers
   */
  private async loadCrimeHotspotMarkers(): Promise<void> {
    try {
      const response = await fetch('/api/crime/hotspots');
      const data = await response.json();

      if (data.success && data.hotspots && this.routeOptimizer && this.mapManager) {
        // Clear existing zone circles
        this.riskZoneCircles.forEach(circle => circle.setMap(null));
        this.riskZoneCircles = [];

        const map = this.mapManager.getMap();

        for (const hotspot of data.hotspots) {
          // Determine risk category display
          const riskCategory = hotspot.risk_category || this.getRiskCategoryFromScore(hotspot.risk_score);
          const safetyScore = hotspot.safety_score ?? (100 - hotspot.risk_score);
          const categoryColor = this.getRiskCategoryColor(riskCategory);
          
          // Add zone circle outline for visual separation
          const zoneRadius = this.getZoneRadius(hotspot.risk_score);
          const zoneCircle = new google.maps.Circle({
            map: map,
            center: { lat: hotspot.coordinates.lat, lng: hotspot.coordinates.lng },
            radius: zoneRadius,
            fillColor: categoryColor,
            fillOpacity: 0.08,
            strokeColor: categoryColor,
            strokeOpacity: 0.6,
            strokeWeight: 2,
            clickable: false,
          });
          this.riskZoneCircles.push(zoneCircle);

          // Add marker for each hotspot
          const marker = this.routeOptimizer.addMarker(
            { lat: hotspot.coordinates.lat, lng: hotspot.coordinates.lng },
            {
              title: `${hotspot.area} - ${riskCategory} Risk`,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: this.getMarkerScale(hotspot.risk_score),
                fillColor: this.getRiskColor(hotspot.risk_score),
                fillOpacity: 0.9,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              },
            }
          );

          // Add info window with enhanced styling
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="color: #1a1a1a; padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 220px;">
                <h3 style="margin: 0 0 10px 0; color: ${categoryColor}; font-size: 1.1rem; font-weight: 600;">${hotspot.area}</h3>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px; background: #f8fafc; border-radius: 6px;">
                  <div style="text-align: center;">
                    <div style="font-size: 1.2rem; font-weight: 700; color: ${categoryColor};">${safetyScore}%</div>
                    <div style="font-size: 0.75rem; color: #5a6674;">Safety Score</div>
                  </div>
                  <div style="text-align: center;">
                    <div style="font-size: 0.9rem; font-weight: 600; color: ${categoryColor}; padding: 4px 8px; background: ${categoryColor}15; border-radius: 4px;">${riskCategory}</div>
                    <div style="font-size: 0.75rem; color: #5a6674; margin-top: 4px;">Risk Level</div>
                  </div>
                </div>
                <div style="border-top: 1px solid #e0e6ed; padding-top: 10px;">
                  <p style="margin: 6px 0; font-size: 0.85rem;"><strong>Contact Crime:</strong> ${hotspot.stats.contact_crime_total ?? 'N/A'}</p>
                  <p style="margin: 6px 0; font-size: 0.85rem;"><strong>Carjacking:</strong> ${hotspot.stats.carjacking ?? 'N/A'}</p>
                  <p style="margin: 6px 0; font-size: 0.85rem;"><strong>Vehicle Theft:</strong> ${hotspot.stats.theft_motor_vehicle ?? 'N/A'}</p>
                  <p style="margin: 6px 0; font-size: 0.85rem;"><strong>Theft from Vehicle:</strong> ${hotspot.stats.theft_from_motor_vehicle ?? 'N/A'}</p>
                </div>
                <p style="margin: 10px 0 0 0; font-size: 0.75rem; color: #8a939e; font-style: italic;">${hotspot.source_note || hotspot.district}</p>
              </div>
            `,
          });

          marker.addListener('click', () => {
            infoWindow.open(this.mapManager?.getMap(), marker);
          });
        }

        console.log(`Added ${data.hotspots.length} crime hotspot markers with zone circles`);
      }
    } catch (error) {
      console.error('Failed to load crime hotspot markers:', error);
    }
  }

  /**
   * Get zone circle radius based on risk score (in meters)
   */
  private getZoneRadius(riskScore: number): number {
    if (riskScore >= 60) return 3500;  // High risk - larger zone
    if (riskScore >= 30) return 2800;  // Medium risk
    if (riskScore >= 15) return 2200;  // Low risk
    return 1800;                        // Very low risk - smaller zone
  }

  /**
   * Get marker scale based on risk score
   */
  private getMarkerScale(riskScore: number): number {
    if (riskScore >= 80) return 12;
    if (riskScore >= 60) return 10;
    if (riskScore >= 40) return 9;
    if (riskScore >= 20) return 8;
    return 7;
  }

  /**
   * Get risk category from score
   */
  private getRiskCategoryFromScore(riskScore: number): string {
    if (riskScore >= 80) return 'Very High';
    if (riskScore >= 60) return 'High';
    if (riskScore >= 40) return 'Medium';
    if (riskScore >= 20) return 'Low';
    return 'Very Low';
  }

  /**
   * Get color for risk category label
   */
  private getRiskCategoryColor(category: string): string {
    switch (category.toLowerCase()) {
      case 'very high': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#ca8a04';
      case 'low': return '#65a30d';
      case 'very low': return '#16a34a';
      default: return '#6b7280';
    }
  }

  /**
   * Get color based on risk score
   */
  private getRiskColor(riskScore: number): string {
    if (riskScore >= 80) return '#ff0000'; // Red - Very High Risk
    if (riskScore >= 60) return '#ff6600'; // Orange - High Risk
    if (riskScore >= 40) return '#ffcc00'; // Yellow - Medium Risk
    if (riskScore >= 20) return '#99cc00'; // Light Green - Low Risk
    return '#00cc00'; // Green - Very Low Risk
  }

  /**
   * Initialize SignalR real-time connection
   */
  private async initializeSignalR(): Promise<void> {
    try {
      this.signalRService = new SignalRService('/hub/location');

      // Subscribe to location updates
      this.signalRService.onLocationUpdate((location) => {
        this.handleLocationUpdate(location);
      });

      // Subscribe to connection status changes
      this.signalRService.onConnectionChange((connected) => {
        this.updateConnectionStatus(connected);
      });

      // Subscribe to device status changes
      this.signalRService.onDeviceStatus((deviceId, status) => {
        console.log(`Device ${deviceId} is now ${status}`);
        if (status === 'online') {
          this.stats.activeDevices++;
        } else {
          this.stats.activeDevices = Math.max(0, this.stats.activeDevices - 1);
        }
        this.updateStatsDisplay();
      });

      // Connect to SignalR hub
      await this.signalRService.connect();
    } catch (error) {
      console.error('Failed to connect to SignalR:', error);
      this.updateConnectionStatus(false);
    }
  }

  /**
   * Handle incoming location update
   */
  private handleLocationUpdate(location: LocationData): void {
    // Update device location
    this.deviceLocations.set(location.deviceId, location);

    // Add to heatmap
    if (this.heatmapRenderer) {
      this.heatmapRenderer.updatePoint(location);
    }

    // Update stats
    this.stats.dataPoints = this.heatmapRenderer?.getPointCount() || 0;
    this.stats.lastUpdate = new Date();
    this.stats.activeDevices = this.deviceLocations.size;
    this.updateStatsDisplay();

    console.log(`Location update from ${location.deviceId}:`, location.latitude, location.longitude);
  }

  /**
   * Set up UI event listeners
   */
  private setupEventListeners(): void {
    // Map type selector
    const mapTypeSelect = document.getElementById('mapType') as HTMLSelectElement;
    mapTypeSelect?.addEventListener('change', (e) => {
      this.mapManager?.setMapType((e.target as HTMLSelectElement).value);
    });

    // Individual heatmap controls for each risk level
    // High Risk controls
    const highRiskRadius = document.getElementById('highRiskRadius') as HTMLInputElement;
    highRiskRadius?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.heatmapHighRisk?.setRadius(value);
    });

    const highRiskOpacity = document.getElementById('highRiskOpacity') as HTMLInputElement;
    highRiskOpacity?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value) / 100;
      this.heatmapHighRisk?.setOpacity(value);
    });

    // Medium Risk controls
    const mediumRiskRadius = document.getElementById('mediumRiskRadius') as HTMLInputElement;
    mediumRiskRadius?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.heatmapMediumRisk?.setRadius(value);
    });

    const mediumRiskOpacity = document.getElementById('mediumRiskOpacity') as HTMLInputElement;
    mediumRiskOpacity?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value) / 100;
      this.heatmapMediumRisk?.setOpacity(value);
    });

    // Low Risk controls
    const lowRiskRadius = document.getElementById('lowRiskRadius') as HTMLInputElement;
    lowRiskRadius?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.heatmapLowRisk?.setRadius(value);
    });

    const lowRiskOpacity = document.getElementById('lowRiskOpacity') as HTMLInputElement;
    lowRiskOpacity?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value) / 100;
      this.heatmapLowRisk?.setOpacity(value);
    });

    // Very Low Risk controls
    const veryLowRiskRadius = document.getElementById('veryLowRiskRadius') as HTMLInputElement;
    veryLowRiskRadius?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.heatmapVeryLowRisk?.setRadius(value);
    });

    const veryLowRiskOpacity = document.getElementById('veryLowRiskOpacity') as HTMLInputElement;
    veryLowRiskOpacity?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value) / 100;
      this.heatmapVeryLowRisk?.setOpacity(value);
    });

    // Optimize routes button
    const optimizeBtn = document.getElementById('optimizeRouteBtn');
    optimizeBtn?.addEventListener('click', () => {
      this.optimizeRoutes();
    });

    // Clear routes button
    const clearBtn = document.getElementById('clearRoutesBtn');
    clearBtn?.addEventListener('click', () => {
      this.routeOptimizer?.clearRoutes();
      this.stats.optimizedDistance = null;
      this.updateStatsDisplay();
    });
  }

  /**
   * Optimize routes based on current device locations
   */
  private async optimizeRoutes(): Promise<void> {
    if (!this.routeOptimizer) return;

    const locations = Array.from(this.deviceLocations.values());
    
    if (locations.length < 2) {
      this.showError('Need at least 2 device locations to optimize routes');
      return;
    }

    // Convert to waypoints
    const waypoints: RouteWaypoint[] = locations.map((loc, index) => ({
      id: loc.deviceId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      name: `Device ${index + 1}`,
    }));

    try {
      const result = await this.routeOptimizer.optimizeRoute(waypoints, 'duration');
      
      if (result) {
        this.stats.optimizedDistance = result.totalDistance;
        this.updateStatsDisplay();
        
        console.log('Route optimized:', {
          distance: this.routeOptimizer.formatDistance(result.totalDistance),
          duration: this.routeOptimizer.formatDuration(result.totalDuration),
        });
      }
    } catch (error) {
      console.error('Failed to optimize routes:', error);
      this.showError('Failed to optimize routes. Check console for details.');
    }
  }

  /**
   * Update connection status indicator
   */
  private updateConnectionStatus(connected: boolean): void {
    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');

    if (indicator && text) {
      if (connected) {
        indicator.classList.add('connected');
        text.textContent = 'Connected';
      } else {
        indicator.classList.remove('connected');
        text.textContent = 'Disconnected';
      }
    }
  }

  /**
   * Update dashboard stats
   */
  private updateStats(stats: Partial<DashboardStats>): void {
    this.stats = { ...this.stats, ...stats };
    this.updateStatsDisplay();
  }

  /**
   * Update stats display in the UI
   */
  private updateStatsDisplay(): void {
    const activeDevicesEl = document.getElementById('activeDevices');
    const dataPointsEl = document.getElementById('dataPoints');
    const lastUpdateEl = document.getElementById('lastUpdate');
    const optimizedDistanceEl = document.getElementById('optimizedDistance');

    if (activeDevicesEl) {
      activeDevicesEl.textContent = this.stats.activeDevices.toString();
    }

    if (dataPointsEl) {
      dataPointsEl.textContent = this.stats.dataPoints.toString();
    }

    if (lastUpdateEl) {
      lastUpdateEl.textContent = this.stats.lastUpdate
        ? this.stats.lastUpdate.toLocaleTimeString()
        : '--:--:--';
    }

    if (optimizedDistanceEl) {
      optimizedDistanceEl.textContent = this.stats.optimizedDistance
        ? `${(this.stats.optimizedDistance / 1000).toFixed(1)} km`
        : '-- km';
    }
  }

  /**
   * Show/hide loading overlay
   */
  private setLoading(loading: boolean): void {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      if (loading) {
        overlay.classList.remove('hidden');
      } else {
        overlay.classList.add('hidden');
      }
    }
  }

  /**
   * Show error message to user
   */
  private showError(message: string): void {
    // For now, just log to console and alert
    console.error(message);
    alert(message);
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const dashboard = new Dashboard();
  dashboard.initialize();
});

export { Dashboard };
