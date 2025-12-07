import { Loader } from '@googlemaps/js-api-loader';
import { MapConfig } from '../types';

/**
 * MapManager handles the initialization and management of the Google Map instance
 */
export class MapManager {
  private map: google.maps.Map | null = null;
  private loader: Loader;
  private mapElement: HTMLElement;
  private configOverrides: Partial<MapConfig>;
  private apiKey: string;

  constructor(elementId: string, apiKey: string, config?: Partial<MapConfig>) {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }
    this.mapElement = element;
    this.apiKey = apiKey;
    this.configOverrides = config || {};

    this.loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['visualization', 'geometry', 'places'],
    });
  }

  /**
   * Initialize the Google Map
   */
  async initialize(): Promise<google.maps.Map> {
    try {
      await this.loader.load();

      // Now that Google Maps is loaded, we can access google.maps
      const config: MapConfig = {
        center: { lat: 40.7128, lng: -74.006 }, // Default: New York City
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        ...this.configOverrides,
      };

      this.map = new google.maps.Map(this.mapElement, {
        center: config.center,
        zoom: config.zoom,
        mapTypeId: config.mapTypeId,
        styles: this.getDarkModeStyles(),
        mapTypeControl: true,
        mapTypeControlOptions: {
          position: google.maps.ControlPosition.TOP_LEFT,
        },
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_CENTER,
        },
        streetViewControl: false,
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: google.maps.ControlPosition.RIGHT_TOP,
        },
      });

      return this.map;
    } catch (error) {
      console.error('Failed to initialize Google Maps:', error);
      throw error;
    }
  }

  /**
   * Get the map instance
   */
  getMap(): google.maps.Map | null {
    return this.map;
  }

  /**
   * Set the map type
   */
  setMapType(type: string): void {
    if (this.map) {
      this.map.setMapTypeId(type as google.maps.MapTypeId);
    }
  }

  /**
   * Center the map on a specific location
   */
  centerOn(lat: number, lng: number, zoom?: number): void {
    if (this.map) {
      this.map.setCenter({ lat, lng });
      if (zoom) {
        this.map.setZoom(zoom);
      }
    }
  }

  /**
   * Fit the map bounds to include all given points
   */
  fitBounds(points: google.maps.LatLngLiteral[]): void {
    if (!this.map || points.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend(point));
    this.map.fitBounds(bounds, 50); // 50px padding
  }

  /**
   * Get dark mode styles for the map
   */
  private getDarkModeStyles(): google.maps.MapTypeStyle[] {
    return [
      { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
      {
        featureType: 'administrative.locality',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }],
      },
      {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }],
      },
      {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#263c3f' }],
      },
      {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#6b9a76' }],
      },
      {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#38414e' }],
      },
      {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#212a37' }],
      },
      {
        featureType: 'road',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9ca5b3' }],
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#746855' }],
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#1f2835' }],
      },
      {
        featureType: 'road.highway',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#f3d19c' }],
      },
      {
        featureType: 'transit',
        elementType: 'geometry',
        stylers: [{ color: '#2f3948' }],
      },
      {
        featureType: 'transit.station',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#d59563' }],
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#17263c' }],
      },
      {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#515c6d' }],
      },
      {
        featureType: 'water',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#17263c' }],
      },
    ];
  }
}
