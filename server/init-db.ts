import { DatabaseService } from './database';
import { v4 as uuidv4 } from 'uuid';

/**
 * Initialize the database with sample data for testing
 */
async function initializeDatabase(): Promise<void> {
  console.log('Initializing database...');
  
  const db = new DatabaseService('./data/locations.db');
  
  // Wait for database to initialize
  await db.waitForInit();

  // Sample device IDs
  const devices = ['device-001', 'device-002', 'device-003', 'device-004', 'device-005'];

  // Sample locations around New York City
  const baseLocations = [
    { lat: 40.7128, lng: -74.006 },   // NYC Downtown
    { lat: 40.7580, lng: -73.9855 },  // Times Square
    { lat: 40.7484, lng: -73.9857 },  // Empire State
    { lat: 40.6892, lng: -74.0445 },  // Statue of Liberty
    { lat: 40.7829, lng: -73.9654 },  // Central Park
  ];

  const sampleLocations: Array<{
    id: string;
    deviceId: string;
    latitude: number;
    longitude: number;
    timestamp: Date;
    accuracy: number;
    speed: number;
    heading: number;
    altitude: number;
  }> = [];

  // Generate sample data for the past 24 hours
  const now = Date.now();
  const hoursBack = 24;

  for (let i = 0; i < 500; i++) {
    const device = devices[Math.floor(Math.random() * devices.length)];
    const baseLocation = baseLocations[Math.floor(Math.random() * baseLocations.length)];
    
    // Add some random variation to create realistic movement
    const lat = baseLocation.lat + (Math.random() - 0.5) * 0.05;
    const lng = baseLocation.lng + (Math.random() - 0.5) * 0.05;
    
    // Random time within the past 24 hours
    const timestamp = new Date(now - Math.random() * hoursBack * 3600000);

    sampleLocations.push({
      id: uuidv4(),
      deviceId: device,
      latitude: lat,
      longitude: lng,
      timestamp,
      accuracy: 5 + Math.random() * 20,
      speed: Math.random() * 30,
      heading: Math.random() * 360,
      altitude: 10 + Math.random() * 50,
    });
  }

  // Insert all locations
  db.insertLocations(sampleLocations);

  console.log(`Inserted ${sampleLocations.length} sample locations`);
  
  // Display stats
  const stats = db.getStats();
  console.log('Database stats:', stats);

  db.close();
  console.log('Database initialized successfully!');
}

initializeDatabase().catch(console.error);
