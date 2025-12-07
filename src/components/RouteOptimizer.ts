import { RouteWaypoint, OptimizedRoute } from '../types';

/**
 * RouteOptimizer handles route calculation and optimization using Google Maps Directions API
 */
export class RouteOptimizer {
  private map: google.maps.Map;
  private directionsService: google.maps.DirectionsService;
  private directionsRenderer: google.maps.DirectionsRenderer;
  private markers: google.maps.Marker[] = [];
  private polylines: google.maps.Polyline[] = [];

  constructor(map: google.maps.Map) {
    this.map = map;
    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer({
      map: this.map,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#e94560',
        strokeWeight: 5,
        strokeOpacity: 0.8,
      },
      markerOptions: {
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#e94560',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      },
    });
  }

  /**
   * Optimize and calculate the best route through all waypoints
   */
  async optimizeRoute(
    waypoints: RouteWaypoint[],
    optimizeFor: 'distance' | 'duration' = 'duration'
  ): Promise<OptimizedRoute | null> {
    if (waypoints.length < 2) {
      console.warn('Need at least 2 waypoints to calculate a route');
      return null;
    }

    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const intermediateWaypoints = waypoints.slice(1, -1);

    const request: google.maps.DirectionsRequest = {
      origin: { lat: origin.latitude, lng: origin.longitude },
      destination: { lat: destination.latitude, lng: destination.longitude },
      waypoints: intermediateWaypoints.map((wp) => ({
        location: { lat: wp.latitude, lng: wp.longitude },
        stopover: true,
      })),
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: google.maps.TrafficModel.BEST_GUESS,
      },
    };

    try {
      const result = await this.directionsService.route(request);

      if (result.routes.length === 0) {
        console.warn('No routes found');
        return null;
      }

      const route = result.routes[0];
      this.directionsRenderer.setDirections(result);

      // Calculate total distance and duration
      let totalDistance = 0;
      let totalDuration = 0;

      route.legs.forEach((leg) => {
        totalDistance += leg.distance?.value || 0;
        totalDuration += leg.duration?.value || 0;
      });

      // Get optimized waypoint order
      const waypointOrder = route.waypoint_order || [];
      const optimizedWaypoints = [origin];

      waypointOrder.forEach((index) => {
        optimizedWaypoints.push(intermediateWaypoints[index]);
      });

      optimizedWaypoints.push(destination);

      return {
        waypoints: optimizedWaypoints,
        totalDistance,
        totalDuration,
        polyline: route.overview_polyline || '',
      };
    } catch (error) {
      console.error('Failed to calculate route:', error);
      throw error;
    }
  }

  /**
   * Calculate a simple route between two points
   */
  async calculateRoute(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number }
  ): Promise<google.maps.DirectionsResult | null> {
    const request: google.maps.DirectionsRequest = {
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    try {
      const result = await this.directionsService.route(request);
      this.directionsRenderer.setDirections(result);
      return result;
    } catch (error) {
      console.error('Failed to calculate route:', error);
      return null;
    }
  }

  /**
   * Draw a custom polyline on the map
   */
  drawPolyline(
    path: google.maps.LatLngLiteral[],
    options?: google.maps.PolylineOptions
  ): google.maps.Polyline {
    const polyline = new google.maps.Polyline({
      path,
      map: this.map,
      strokeColor: '#e94560',
      strokeWeight: 4,
      strokeOpacity: 0.8,
      ...options,
    });

    this.polylines.push(polyline);
    return polyline;
  }

  /**
   * Add a marker to the map
   */
  addMarker(
    position: google.maps.LatLngLiteral,
    options?: google.maps.MarkerOptions
  ): google.maps.Marker {
    const marker = new google.maps.Marker({
      position,
      map: this.map,
      ...options,
    });

    this.markers.push(marker);
    return marker;
  }

  /**
   * Clear all routes from the map
   */
  clearRoutes(): void {
    this.directionsRenderer.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult);
    
    // Clear custom polylines
    this.polylines.forEach((polyline) => polyline.setMap(null));
    this.polylines = [];

    // Clear markers
    this.markers.forEach((marker) => marker.setMap(null));
    this.markers = [];
  }

  /**
   * Show/hide the route
   */
  setRouteVisible(visible: boolean): void {
    this.directionsRenderer.setMap(visible ? this.map : null);
  }

  /**
   * Get the formatted distance string
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${meters} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }

  /**
   * Get the formatted duration string
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  }
}
