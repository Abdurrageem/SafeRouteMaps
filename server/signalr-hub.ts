import { Server as HttpServer } from 'http';
import { DatabaseService } from './database';

// Note: For a production SignalR implementation with .NET MAUI clients,
// you would typically use a .NET backend with proper SignalR Hub.
// This is a simplified WebSocket implementation that mimics SignalR behavior
// for demonstration purposes. For production, consider using:
// 1. A separate .NET SignalR server
// 2. Azure SignalR Service
// 3. Or the @microsoft/signalr package with a compatible backend

interface LocationUpdate {
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

interface ConnectedClient {
  id: string;
  socket: any;
  deviceGroups: Set<string>;
}

// Using native WebSocket for simplicity
// In production, use @microsoft/signalr-server or a .NET backend
import { WebSocketServer, WebSocket } from 'ws';

let connectedClients: Map<string, ConnectedClient> = new Map();
let wss: WebSocketServer;

/**
 * Set up SignalR-like WebSocket hub for real-time communication
 */
export function setupSignalR(
  httpServer: HttpServer,
  db: DatabaseService
): {
  broadcastLocation: (location: LocationUpdate) => void;
  getConnectedClients: () => number;
} {
  // Create WebSocket server on /hub/location path
  wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/hub/location' 
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const clientId = generateClientId();
    const client: ConnectedClient = {
      id: clientId,
      socket: ws,
      deviceGroups: new Set(),
    };

    connectedClients.set(clientId, client);
    console.log(`Client connected: ${clientId}. Total clients: ${connectedClients.size}`);

    // Send connection confirmation
    sendToClient(ws, {
      type: 'connected',
      connectionId: clientId,
    });

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleClientMessage(client, message, db);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      connectedClients.delete(clientId);
      console.log(`Client disconnected: ${clientId}. Total clients: ${connectedClients.size}`);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
    });
  });

  console.log('WebSocket SignalR hub initialized');

  return {
    broadcastLocation,
    getConnectedClients: () => connectedClients.size,
  };
}

/**
 * Handle incoming client messages
 */
function handleClientMessage(
  client: ConnectedClient,
  message: any,
  db: DatabaseService
): void {
  switch (message.type) {
    case 'SendLocation':
      // Mobile device sending location
      const location: LocationUpdate = {
        id: `${message.deviceId}_${Date.now()}`,
        deviceId: message.deviceId,
        latitude: message.latitude,
        longitude: message.longitude,
        timestamp: new Date(),
        accuracy: message.accuracy,
        speed: message.speed,
        heading: message.heading,
        altitude: message.altitude,
      };

      // Store in database
      db.insertLocation(location);

      // Broadcast to all dashboard clients
      broadcastLocation(location);
      break;

    case 'JoinDeviceGroup':
      // Dashboard subscribing to specific device updates
      client.deviceGroups.add(message.deviceId);
      console.log(`Client ${client.id} joined device group: ${message.deviceId}`);
      break;

    case 'LeaveDeviceGroup':
      // Dashboard unsubscribing from device updates
      client.deviceGroups.delete(message.deviceId);
      console.log(`Client ${client.id} left device group: ${message.deviceId}`);
      break;

    case 'GetDeviceHistory':
      // Request historical data
      const from = new Date(message.from);
      const to = new Date(message.to);
      const locations = db.getLocationsByTimeRange(from, to);

      sendToClient(client.socket, {
        type: 'ReceiveLocations',
        locations: locations.map((loc) => ({
          id: loc.id,
          deviceId: loc.device_id,
          latitude: loc.latitude,
          longitude: loc.longitude,
          timestamp: loc.timestamp,
          accuracy: loc.accuracy,
          speed: loc.speed,
          heading: loc.heading,
          altitude: loc.altitude,
        })),
      });
      break;

    case 'ping':
      sendToClient(client.socket, { type: 'pong' });
      break;

    default:
      console.log('Unknown message type:', message.type);
  }
}

/**
 * Broadcast location update to all connected dashboard clients
 */
function broadcastLocation(location: LocationUpdate): void {
  const message = {
    type: 'ReceiveLocation',
    ...location,
    timestamp: location.timestamp instanceof Date 
      ? location.timestamp.toISOString() 
      : location.timestamp,
  };

  connectedClients.forEach((client) => {
    // Send to all clients or only those subscribed to this device
    if (client.deviceGroups.size === 0 || client.deviceGroups.has(location.deviceId)) {
      sendToClient(client.socket, message);
    }
  });
}

/**
 * Send message to a specific client
 */
function sendToClient(socket: WebSocket, message: any): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

/**
 * Generate a unique client ID
 */
function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Broadcast device status change to all clients
 */
export function broadcastDeviceStatus(deviceId: string, status: 'online' | 'offline'): void {
  const message = {
    type: 'DeviceStatusChanged',
    deviceId,
    status,
  };

  connectedClients.forEach((client) => {
    sendToClient(client.socket, message);
  });
}
