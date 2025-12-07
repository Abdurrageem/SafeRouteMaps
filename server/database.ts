import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';

export interface LocationRow {
  id: string;
  device_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
}

/**
 * DatabaseService handles SQLite database operations for location data
 * Uses sql.js (pure JavaScript SQLite implementation)
 */
export class DatabaseService {
  private db: Database | null = null;
  private dbPath: string;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(dbPath: string = './data/locations.db') {
    this.dbPath = dbPath;
    // Start initialization
    this.initPromise = this.initialize();
  }

  /**
   * Initialize the database
   */
  private async initialize(): Promise<void> {
    try {
      // Ensure the directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Initialize sql.js
      const SQL = await initSqlJs();

      // Check if database file exists
      if (fs.existsSync(this.dbPath)) {
        const buffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(buffer);
      } else {
        this.db = new SQL.Database();
      }

      this.initializeSchema();
      this.initialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Wait for database to be ready
   */
  async waitForInit(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Initialize the database schema
   */
  private initializeSchema(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        timestamp TEXT NOT NULL,
        accuracy REAL,
        speed REAL,
        heading REAL,
        altitude REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_locations_device_id ON locations(device_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_locations_timestamp ON locations(timestamp)`);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT,
        last_seen TEXT,
        status TEXT DEFAULT 'offline',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.saveToFile();
  }

  /**
   * Save database to file
   */
  private saveToFile(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  /**
   * Insert a new location record
   */
  insertLocation(location: {
    id: string;
    deviceId: string;
    latitude: number;
    longitude: number;
    timestamp: Date;
    accuracy?: number;
    speed?: number;
    heading?: number;
    altitude?: number;
  }): void {
    if (!this.db) return;

    this.db.run(
      `INSERT INTO locations (id, device_id, latitude, longitude, timestamp, accuracy, speed, heading, altitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        location.id,
        location.deviceId,
        location.latitude,
        location.longitude,
        location.timestamp.toISOString(),
        location.accuracy ?? null,
        location.speed ?? null,
        location.heading ?? null,
        location.altitude ?? null,
      ]
    );

    // Update device last seen
    this.updateDeviceStatus(location.deviceId, 'online');
    this.saveToFile();
  }

  /**
   * Insert multiple location records
   */
  insertLocations(locations: Array<{
    id: string;
    deviceId: string;
    latitude: number;
    longitude: number;
    timestamp: Date;
    accuracy?: number;
    speed?: number;
    heading?: number;
    altitude?: number;
  }>): void {
    if (!this.db) return;

    for (const location of locations) {
      this.db.run(
        `INSERT INTO locations (id, device_id, latitude, longitude, timestamp, accuracy, speed, heading, altitude)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          location.id,
          location.deviceId,
          location.latitude,
          location.longitude,
          location.timestamp.toISOString(),
          location.accuracy ?? null,
          location.speed ?? null,
          location.heading ?? null,
          location.altitude ?? null,
        ]
      );
    }

    this.saveToFile();
  }

  /**
   * Get all locations
   */
  getAllLocations(limit: number = 1000, offset: number = 0): LocationRow[] {
    if (!this.db) return [];

    const result = this.db.exec(
      `SELECT * FROM locations ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`
    );

    return this.parseResults(result);
  }

  /**
   * Get locations for a specific device
   */
  getLocationsByDevice(deviceId: string, limit: number = 100): LocationRow[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(
      `SELECT * FROM locations WHERE device_id = ? ORDER BY timestamp DESC LIMIT ?`
    );
    stmt.bind([deviceId, limit]);

    const rows: LocationRow[] = [];
    while (stmt.step()) {
      rows.push(this.rowToLocation(stmt.getAsObject()));
    }
    stmt.free();

    return rows;
  }

  /**
   * Get locations within a time range
   */
  getLocationsByTimeRange(from: Date, to: Date): LocationRow[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(
      `SELECT * FROM locations WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC`
    );
    stmt.bind([from.toISOString(), to.toISOString()]);

    const rows: LocationRow[] = [];
    while (stmt.step()) {
      rows.push(this.rowToLocation(stmt.getAsObject()));
    }
    stmt.free();

    return rows;
  }

  /**
   * Get locations within a geographic bounding box
   */
  getLocationsByBounds(
    north: number,
    south: number,
    east: number,
    west: number
  ): LocationRow[] {
    if (!this.db) return [];

    const stmt = this.db.prepare(
      `SELECT * FROM locations 
       WHERE latitude <= ? AND latitude >= ? AND longitude <= ? AND longitude >= ?
       ORDER BY timestamp DESC`
    );
    stmt.bind([north, south, east, west]);

    const rows: LocationRow[] = [];
    while (stmt.step()) {
      rows.push(this.rowToLocation(stmt.getAsObject()));
    }
    stmt.free();

    return rows;
  }

  /**
   * Get the latest location for each device
   */
  getLatestLocationsByDevice(): LocationRow[] {
    if (!this.db) return [];

    const result = this.db.exec(`
      SELECT l.*
      FROM locations l
      INNER JOIN (
        SELECT device_id, MAX(timestamp) as max_timestamp
        FROM locations
        GROUP BY device_id
      ) latest ON l.device_id = latest.device_id AND l.timestamp = latest.max_timestamp
    `);

    return this.parseResults(result);
  }

  /**
   * Get list of unique device IDs
   */
  getDeviceIds(): string[] {
    if (!this.db) return [];

    const result = this.db.exec(`SELECT DISTINCT device_id FROM locations`);
    if (result.length === 0) return [];

    return result[0].values.map((row) => row[0] as string);
  }

  /**
   * Get active devices (seen in the last hour)
   */
  getActiveDevices(): string[] {
    if (!this.db) return [];

    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    const stmt = this.db.prepare(
      `SELECT DISTINCT device_id FROM locations WHERE timestamp >= ?`
    );
    stmt.bind([oneHourAgo]);

    const devices: string[] = [];
    while (stmt.step()) {
      devices.push(stmt.get()[0] as string);
    }
    stmt.free();

    return devices;
  }

  /**
   * Update device status
   */
  updateDeviceStatus(deviceId: string, status: 'online' | 'offline'): void {
    if (!this.db) return;

    // Check if device exists
    const stmt = this.db.prepare(`SELECT id FROM devices WHERE id = ?`);
    stmt.bind([deviceId]);
    const exists = stmt.step();
    stmt.free();

    if (exists) {
      this.db.run(
        `UPDATE devices SET last_seen = CURRENT_TIMESTAMP, status = ? WHERE id = ?`,
        [status, deviceId]
      );
    } else {
      this.db.run(
        `INSERT INTO devices (id, last_seen, status) VALUES (?, CURRENT_TIMESTAMP, ?)`,
        [deviceId, status]
      );
    }
  }

  /**
   * Get database statistics
   */
  getStats(): {
    totalLocations: number;
    activeDevices: number;
    lastUpdate: string | null;
  } {
    if (!this.db) {
      return { totalLocations: 0, activeDevices: 0, lastUpdate: null };
    }

    const countResult = this.db.exec('SELECT COUNT(*) as count FROM locations');
    const totalLocations = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;

    const activeDevices = this.getActiveDevices().length;

    const lastUpdateResult = this.db.exec('SELECT MAX(timestamp) as last_update FROM locations');
    const lastUpdate = lastUpdateResult.length > 0 && lastUpdateResult[0].values[0][0]
      ? (lastUpdateResult[0].values[0][0] as string)
      : null;

    return {
      totalLocations,
      activeDevices,
      lastUpdate,
    };
  }

  /**
   * Parse sql.js results to LocationRow array
   */
  private parseResults(result: any[]): LocationRow[] {
    if (result.length === 0) return [];

    const columns = result[0].columns;
    const values = result[0].values;

    return values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj as LocationRow;
    });
  }

  /**
   * Convert a row object to LocationRow
   */
  private rowToLocation(row: any): LocationRow {
    return {
      id: row.id,
      device_id: row.device_id,
      latitude: row.latitude,
      longitude: row.longitude,
      timestamp: row.timestamp,
      accuracy: row.accuracy,
      speed: row.speed,
      heading: row.heading,
      altitude: row.altitude,
    };
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.saveToFile();
      this.db.close();
    }
  }
}
