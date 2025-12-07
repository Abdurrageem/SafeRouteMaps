import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { DatabaseService, LocationRow } from './database';
import { setupSignalR } from './signalr-hub';
import { CrimeDataService } from './crime-data';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Initialize database
const db = new DatabaseService(process.env.DATABASE_PATH || './data/locations.db');

// Initialize crime data service
const crimeDataService = new CrimeDataService('./data/cape-town-crime-stats.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist/public')));

// Setup SignalR
const { broadcastLocation, getConnectedClients } = setupSignalR(httpServer, db);

// API Routes

/**
 * Get all locations
 */
app.get('/api/locations', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 1000;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const locations = db.getAllLocations(limit, offset);
    
    res.json({
      success: true,
      locations: locations.map(mapLocationRow),
      total: locations.length,
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch locations' });
  }
});

/**
 * Get locations for a specific device
 */
app.get('/api/locations/device/:deviceId', (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    
    const locations = db.getLocationsByDevice(deviceId, limit);
    
    res.json({
      success: true,
      locations: locations.map(mapLocationRow),
      total: locations.length,
    });
  } catch (error) {
    console.error('Error fetching device locations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch device locations' });
  }
});

/**
 * Get locations within a time range
 */
app.get('/api/locations/range', (req: Request, res: Response) => {
  try {
    const from = new Date(req.query.from as string);
    const to = new Date(req.query.to as string);
    
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date range' });
    }
    
    const locations = db.getLocationsByTimeRange(from, to);
    
    res.json({
      success: true,
      locations: locations.map(mapLocationRow),
      total: locations.length,
    });
  } catch (error) {
    console.error('Error fetching locations by range:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch locations' });
  }
});

/**
 * Get locations within geographic bounds
 */
app.get('/api/locations/bounds', (req: Request, res: Response) => {
  try {
    const north = parseFloat(req.query.north as string);
    const south = parseFloat(req.query.south as string);
    const east = parseFloat(req.query.east as string);
    const west = parseFloat(req.query.west as string);
    
    if ([north, south, east, west].some(isNaN)) {
      return res.status(400).json({ success: false, error: 'Invalid bounds' });
    }
    
    const locations = db.getLocationsByBounds(north, south, east, west);
    
    res.json({
      success: true,
      locations: locations.map(mapLocationRow),
      total: locations.length,
    });
  } catch (error) {
    console.error('Error fetching locations by bounds:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch locations' });
  }
});

/**
 * Get latest location for each device
 */
app.get('/api/locations/latest', (req: Request, res: Response) => {
  try {
    const locations = db.getLatestLocationsByDevice();
    
    res.json({
      success: true,
      locations: locations.map(mapLocationRow),
    });
  } catch (error) {
    console.error('Error fetching latest locations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch latest locations' });
  }
});

/**
 * Get list of active devices
 */
app.get('/api/devices', (req: Request, res: Response) => {
  try {
    const devices = db.getActiveDevices();
    
    res.json({
      success: true,
      devices,
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch devices' });
  }
});

/**
 * Get dashboard statistics
 */
app.get('/api/stats', (req: Request, res: Response) => {
  try {
    const stats = db.getStats();
    
    res.json({
      success: true,
      ...stats,
      connectedClients: getConnectedClients(),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

/**
 * Submit a new location (for testing or REST API integration)
 */
app.post('/api/locations', (req: Request, res: Response) => {
  try {
    const { deviceId, latitude, longitude, accuracy, speed, heading, altitude } = req.body;
    
    if (!deviceId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'deviceId, latitude, and longitude are required' 
      });
    }
    
    const location = {
      id: `${deviceId}_${Date.now()}`,
      deviceId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date(),
      accuracy: accuracy ? parseFloat(accuracy) : undefined,
      speed: speed ? parseFloat(speed) : undefined,
      heading: heading ? parseFloat(heading) : undefined,
      altitude: altitude ? parseFloat(altitude) : undefined,
    };
    
    db.insertLocation(location);
    
    // Broadcast to connected clients via SignalR
    broadcastLocation(location);
    
    res.json({
      success: true,
      location: {
        id: location.id,
        deviceId: location.deviceId,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error inserting location:', error);
    res.status(500).json({ success: false, error: 'Failed to insert location' });
  }
});

/**
 * Get Google Maps API key (for frontend)
 */
app.get('/api/config', (req: Request, res: Response) => {
  res.json({
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  });
});

// ==================== CRIME DATA API ====================

/**
 * Get all crime hotspots
 */
app.get('/api/crime/hotspots', (req: Request, res: Response) => {
  try {
    const minRisk = parseInt(req.query.minRisk as string) || 0;
    const hotspots = minRisk > 0 
      ? crimeDataService.getHotspotsByRiskLevel(minRisk)
      : crimeDataService.getAllHotspots();
    
    res.json({
      success: true,
      hotspots,
      total: hotspots.length,
    });
  } catch (error) {
    console.error('Error fetching crime hotspots:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch crime hotspots' });
  }
});

/**
 * Get crime heatmap data
 */
app.get('/api/crime/heatmap', (req: Request, res: Response) => {
  try {
    const expanded = req.query.expanded === 'true';
    const pointsPerHotspot = parseInt(req.query.points as string) || 20;
    const radiusKm = parseFloat(req.query.radius as string) || 2;
    
    const heatmapData = expanded 
      ? crimeDataService.getExpandedHeatmapData(pointsPerHotspot, radiusKm)
      : crimeDataService.getHeatmapData();
    
    res.json({
      success: true,
      data: heatmapData,
      total: heatmapData.length,
    });
  } catch (error) {
    console.error('Error fetching crime heatmap data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch crime heatmap data' });
  }
});

/**
 * Get crime heatmap data grouped by risk level (for multi-layer visualization)
 */
app.get('/api/crime/heatmap/by-risk', (req: Request, res: Response) => {
  try {
    const pointsPerHotspot = parseInt(req.query.points as string) || 25;
    const radiusKm = parseFloat(req.query.radius as string) || 2.5;
    
    const heatmapData = crimeDataService.getHeatmapDataByRiskLevel(pointsPerHotspot, radiusKm);
    
    res.json({
      success: true,
      data: heatmapData,
      counts: {
        high: heatmapData.high.length,
        medium: heatmapData.medium.length,
        low: heatmapData.low.length,
        veryLow: heatmapData.veryLow.length,
      },
    });
  } catch (error) {
    console.error('Error fetching risk-level heatmap data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch risk-level heatmap data' });
  }
});

/**
 * Get crime data summary
 */
app.get('/api/crime/summary', (req: Request, res: Response) => {
  try {
    const summary = crimeDataService.getSummary();
    res.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    console.error('Error fetching crime summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch crime summary' });
  }
});

/**
 * Get risk level at a specific location
 */
app.get('/api/crime/risk', (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, error: 'lat and lng are required' });
    }
    
    const risk = crimeDataService.getRiskAtLocation(lat, lng);
    res.json({
      success: true,
      ...risk,
    });
  } catch (error) {
    console.error('Error fetching risk level:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch risk level' });
  }
});

/**
 * Get vehicle crime hotspots only
 */
app.get('/api/crime/vehicle', (req: Request, res: Response) => {
  try {
    const hotspots = crimeDataService.getVehicleCrimeHotspots();
    res.json({
      success: true,
      hotspots,
      total: hotspots.length,
    });
  } catch (error) {
    console.error('Error fetching vehicle crime hotspots:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vehicle crime hotspots' });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

/**
 * Serve the frontend for all other routes
 */
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../dist/public/index.html'));
});

/**
 * Map database row to API response format
 */
function mapLocationRow(row: LocationRow) {
  return {
    id: row.id,
    deviceId: row.device_id,
    latitude: row.latitude,
    longitude: row.longitude,
    timestamp: row.timestamp,
    accuracy: row.accuracy,
    speed: row.speed,
    heading: row.heading,
    altitude: row.altitude,
  };
}

// Start server
async function startServer() {
  // Wait for database to initialize
  await db.waitForInit();
  
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running at http://${HOST}:${PORT}`);
    console.log(`📍 API available at http://${HOST}:${PORT}/api`);
    console.log(`🔌 SignalR hub at http://${HOST}:${PORT}/hub/location`);
  });
}

startServer().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  db.close();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
