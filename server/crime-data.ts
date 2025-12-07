import fs from 'fs';
import path from 'path';

export interface CrimeStats {
  contact_crime_total: number | null;
  carjacking: number | null;
  theft_motor_vehicle: number | null;
  theft_from_motor_vehicle: number | null;
}

export interface CrimeHotspot {
  area: string;
  district: string;
  province: string;
  coordinates: { lat: number; lng: number };
  stats: CrimeStats;
  risk_score: number;
  risk_category: string;
  safety_score: number;
  source_note: string;
}

export interface ExtendedArea {
  area: string;
  district: string;
  province: string;
  coordinates: { lat: number; lng: number };
  stats: CrimeStats;
  risk_category: string;
  safety_score: number;
}

export interface ExtendedAreasData {
  city: string;
  province: string;
  risk_extension: string;
  last_updated: string;
  areas: ExtendedArea[];
  metadata: {
    data_type: string;
    categories: string[];
    compatible_with: string;
  };
}

export interface CrimeData {
  city: string;
  province: string;
  generated_from: string;
  last_updated: string;
  hotspots: CrimeHotspot[];
  metadata: {
    pdf_source: string;
    coordinate_source: string;
    risk_score_methodology: string;
  };
}

/**
 * CrimeDataService handles loading and processing crime statistics
 */
export class CrimeDataService {
  private crimeData: CrimeData | null = null;
  private extendedAreas: ExtendedAreasData | null = null;
  private allHotspots: CrimeHotspot[] = [];
  private dataPath: string;
  private extendedDataPath: string;

  constructor(
    dataPath: string = './data/cape-town-crime-stats.json',
    extendedPath: string = './data/cape-town-extended-areas.json'
  ) {
    this.dataPath = dataPath;
    this.extendedDataPath = extendedPath;
    this.loadData();
  }

  /**
   * Load crime data from JSON files and merge
   */
  private loadData(): void {
    try {
      // Load primary crime data (high-risk hotspots)
      if (fs.existsSync(this.dataPath)) {
        const rawData = fs.readFileSync(this.dataPath, 'utf-8');
        this.crimeData = JSON.parse(rawData);
        console.log(`Loaded primary crime data: ${this.crimeData?.hotspots.length} hotspots`);
      } else {
        console.warn(`Crime data file not found: ${this.dataPath}`);
      }

      // Load extended areas (medium, low, very low risk)
      if (fs.existsSync(this.extendedDataPath)) {
        const rawExtended = fs.readFileSync(this.extendedDataPath, 'utf-8');
        this.extendedAreas = JSON.parse(rawExtended);
        console.log(`Loaded extended areas: ${this.extendedAreas?.areas.length} areas`);
      } else {
        console.warn(`Extended areas file not found: ${this.extendedDataPath}`);
      }

      // Merge all data into unified hotspots array
      this.mergeAllData();
    } catch (error) {
      console.error('Failed to load crime data:', error);
    }
  }

  /**
   * Merge primary hotspots with extended areas into a unified format
   */
  private mergeAllData(): void {
    this.allHotspots = [];

    // Add primary hotspots (high risk - convert to unified format)
    if (this.crimeData?.hotspots) {
      for (const hotspot of this.crimeData.hotspots) {
        this.allHotspots.push({
          ...hotspot,
          risk_category: this.getRiskCategoryFromScore(hotspot.risk_score),
          safety_score: 100 - hotspot.risk_score,
        });
      }
    }

    // Add extended areas (convert safety_score to risk_score)
    if (this.extendedAreas?.areas) {
      for (const area of this.extendedAreas.areas) {
        this.allHotspots.push({
          area: area.area,
          district: area.district,
          province: area.province,
          coordinates: area.coordinates,
          stats: area.stats,
          risk_score: 100 - area.safety_score, // Convert safety score to risk score
          risk_category: area.risk_category,
          safety_score: area.safety_score,
          source_note: `Extended area data - ${area.risk_category} risk zone`,
        });
      }
    }

    console.log(`Total merged hotspots: ${this.allHotspots.length}`);
  }

  /**
   * Determine risk category from risk score
   */
  private getRiskCategoryFromScore(riskScore: number): string {
    if (riskScore >= 80) return 'Very High';
    if (riskScore >= 60) return 'High';
    if (riskScore >= 40) return 'Medium';
    if (riskScore >= 20) return 'Low';
    return 'Very Low';
  }

  /**
   * Get all crime hotspots (merged from all sources)
   */
  getAllHotspots(): CrimeHotspot[] {
    return this.allHotspots;
  }

  /**
   * Get only the primary high-risk hotspots
   */
  getPrimaryHotspots(): CrimeHotspot[] {
    return this.crimeData?.hotspots.map(h => ({
      ...h,
      risk_category: this.getRiskCategoryFromScore(h.risk_score),
      safety_score: 100 - h.risk_score,
    })) || [];
  }

  /**
   * Get hotspots by risk category
   */
  getHotspotsByCategory(category: string): CrimeHotspot[] {
    return this.allHotspots.filter(h => h.risk_category.toLowerCase() === category.toLowerCase());
  }

  /**
   * Get hotspots filtered by minimum risk score
   */
  getHotspotsByRiskLevel(minScore: number): CrimeHotspot[] {
    return this.getAllHotspots().filter(h => h.risk_score >= minScore);
  }

  /**
   * Get hotspots sorted by risk score (highest first)
   */
  getHotspotsByRisk(): CrimeHotspot[] {
    return [...this.getAllHotspots()].sort((a, b) => b.risk_score - a.risk_score);
  }

  /**
   * Get hotspots with vehicle crime data
   */
  getVehicleCrimeHotspots(): CrimeHotspot[] {
    return this.getAllHotspots().filter(h => 
      h.stats.carjacking !== null ||
      h.stats.theft_motor_vehicle !== null ||
      h.stats.theft_from_motor_vehicle !== null
    );
  }

  /**
   * Convert hotspots to heatmap-compatible format with weights
   */
  getHeatmapData(): Array<{ lat: number; lng: number; weight: number }> {
    return this.getAllHotspots().map(hotspot => ({
      lat: hotspot.coordinates.lat,
      lng: hotspot.coordinates.lng,
      weight: hotspot.risk_score / 100, // Normalize to 0-1
    }));
  }

  /**
   * Get expanded heatmap data with multiple points per hotspot for better visualization
   */
  getExpandedHeatmapData(pointsPerHotspot: number = 20, radiusKm: number = 2): Array<{ lat: number; lng: number; weight: number }> {
    const points: Array<{ lat: number; lng: number; weight: number }> = [];

    for (const hotspot of this.getAllHotspots()) {
      // Add center point with full weight
      points.push({
        lat: hotspot.coordinates.lat,
        lng: hotspot.coordinates.lng,
        weight: hotspot.risk_score / 100,
      });

      // Add surrounding points with decreasing weights
      for (let i = 0; i < pointsPerHotspot; i++) {
        // Random angle
        const angle = Math.random() * 2 * Math.PI;
        // Random distance (weighted towards center)
        const distance = Math.random() * Math.random() * radiusKm;
        
        // Convert km to degrees (approximate)
        const latOffset = (distance / 111) * Math.cos(angle);
        const lngOffset = (distance / (111 * Math.cos(hotspot.coordinates.lat * Math.PI / 180))) * Math.sin(angle);
        
        // Weight decreases with distance
        const distanceWeight = 1 - (distance / radiusKm);
        
        points.push({
          lat: hotspot.coordinates.lat + latOffset,
          lng: hotspot.coordinates.lng + lngOffset,
          weight: (hotspot.risk_score / 100) * distanceWeight * 0.7,
        });
      }
    }

    return points;
  }

  /**
   * Get heatmap data grouped by risk level for multi-layer visualization
   */
  getHeatmapDataByRiskLevel(pointsPerHotspot: number = 20, radiusKm: number = 2): {
    high: Array<{ lat: number; lng: number; weight: number }>;
    medium: Array<{ lat: number; lng: number; weight: number }>;
    low: Array<{ lat: number; lng: number; weight: number }>;
    veryLow: Array<{ lat: number; lng: number; weight: number }>;
  } {
    const result = {
      high: [] as Array<{ lat: number; lng: number; weight: number }>,
      medium: [] as Array<{ lat: number; lng: number; weight: number }>,
      low: [] as Array<{ lat: number; lng: number; weight: number }>,
      veryLow: [] as Array<{ lat: number; lng: number; weight: number }>,
    };

    for (const hotspot of this.getAllHotspots()) {
      // Determine which category this hotspot belongs to
      let targetArray: Array<{ lat: number; lng: number; weight: number }>;
      let intensityMultiplier: number;
      let effectiveRadius: number;
      
      if (hotspot.risk_score >= 60) {
        // High/Very High risk
        targetArray = result.high;
        intensityMultiplier = 1.0;
        effectiveRadius = radiusKm * 1.3;
      } else if (hotspot.risk_score >= 30) {
        // Medium risk
        targetArray = result.medium;
        intensityMultiplier = 0.75;
        effectiveRadius = radiusKm * 1.1;
      } else if (hotspot.risk_score >= 15) {
        // Low risk
        targetArray = result.low;
        intensityMultiplier = 0.5;
        effectiveRadius = radiusKm * 0.9;
      } else {
        // Very Low risk
        targetArray = result.veryLow;
        intensityMultiplier = 0.35;
        effectiveRadius = radiusKm * 0.7;
      }

      // Add center point
      targetArray.push({
        lat: hotspot.coordinates.lat,
        lng: hotspot.coordinates.lng,
        weight: intensityMultiplier,
      });

      // Add surrounding points
      for (let i = 0; i < pointsPerHotspot; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * Math.random() * effectiveRadius;
        
        const latOffset = (distance / 111) * Math.cos(angle);
        const lngOffset = (distance / (111 * Math.cos(hotspot.coordinates.lat * Math.PI / 180))) * Math.sin(angle);
        
        const distanceWeight = 1 - (distance / effectiveRadius);
        
        targetArray.push({
          lat: hotspot.coordinates.lat + latOffset,
          lng: hotspot.coordinates.lng + lngOffset,
          weight: intensityMultiplier * distanceWeight * 0.7,
        });
      }
    }

    return result;
  }

  /**
   * Get crime data summary
   */
  getSummary(): {
    city: string;
    totalHotspots: number;
    highRiskAreas: number;
    mediumRiskAreas: number;
    lowRiskAreas: number;
    veryLowRiskAreas: number;
    lastUpdated: string;
  } {
    const hotspots = this.getAllHotspots();
    return {
      city: this.crimeData?.city || 'Cape Town',
      totalHotspots: hotspots.length,
      highRiskAreas: hotspots.filter(h => h.risk_score >= 60).length,
      mediumRiskAreas: hotspots.filter(h => h.risk_score >= 30 && h.risk_score < 60).length,
      lowRiskAreas: hotspots.filter(h => h.risk_score >= 10 && h.risk_score < 30).length,
      veryLowRiskAreas: hotspots.filter(h => h.risk_score < 10).length,
      lastUpdated: this.crimeData?.last_updated || 'Unknown',
    };
  }

  /**
   * Get risk level for a given location
   */
  getRiskAtLocation(lat: number, lng: number): { riskScore: number; nearestHotspot: CrimeHotspot | null } {
    const hotspots = this.getAllHotspots();
    let nearestHotspot: CrimeHotspot | null = null;
    let minDistance = Infinity;

    for (const hotspot of hotspots) {
      const distance = this.calculateDistance(lat, lng, hotspot.coordinates.lat, hotspot.coordinates.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestHotspot = hotspot;
      }
    }

    // Calculate risk based on distance (risk decreases with distance)
    let riskScore = 0;
    if (nearestHotspot && minDistance < 5) { // Within 5km
      riskScore = nearestHotspot.risk_score * Math.max(0, 1 - (minDistance / 5));
    }

    return { riskScore: Math.round(riskScore), nearestHotspot };
  }

  /**
   * Calculate distance between two coordinates in km (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Reload data from file
   */
  reload(): void {
    this.loadData();
  }
}
