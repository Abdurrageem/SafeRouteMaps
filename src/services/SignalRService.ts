import * as signalR from '@microsoft/signalr';
import { LocationData, SignalRMessage } from '../types';

/**
 * SignalRService handles real-time communication with the .NET MAUI mobile app
 */
export class SignalRService {
  private connection: signalR.HubConnection;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  // Event callbacks
  private onLocationUpdateCallbacks: ((location: LocationData) => void)[] = [];
  private onConnectionChangeCallbacks: ((connected: boolean) => void)[] = [];
  private onDeviceStatusCallbacks: ((deviceId: string, status: 'online' | 'offline') => void)[] = [];

  constructor(hubUrl: string = '/hub/location') {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff: 0, 2, 4, 8, 16... seconds (max 30 seconds)
          if (retryContext.previousRetryCount >= this.maxReconnectAttempts) {
            return null; // Stop reconnecting
          }
          return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
        },
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupEventHandlers();
  }

  /**
   * Set up SignalR event handlers
   */
  private setupEventHandlers(): void {
    // Handle location updates from mobile devices
    this.connection.on('ReceiveLocation', (location: LocationData) => {
      console.log('Received location update:', location);
      this.onLocationUpdateCallbacks.forEach((callback) => callback(location));
    });

    // Handle bulk location updates
    this.connection.on('ReceiveLocations', (locations: LocationData[]) => {
      console.log('Received bulk location update:', locations.length, 'points');
      locations.forEach((location) => {
        this.onLocationUpdateCallbacks.forEach((callback) => callback(location));
      });
    });

    // Handle device status changes
    this.connection.on('DeviceStatusChanged', (deviceId: string, status: 'online' | 'offline') => {
      console.log('Device status changed:', deviceId, status);
      this.onDeviceStatusCallbacks.forEach((callback) => callback(deviceId, status));
    });

    // Connection lifecycle events
    this.connection.onreconnecting((error) => {
      console.log('SignalR reconnecting...', error);
      this.isConnected = false;
      this.onConnectionChangeCallbacks.forEach((callback) => callback(false));
    });

    this.connection.onreconnected((connectionId) => {
      console.log('SignalR reconnected:', connectionId);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.onConnectionChangeCallbacks.forEach((callback) => callback(true));
    });

    this.connection.onclose((error) => {
      console.log('SignalR connection closed:', error);
      this.isConnected = false;
      this.onConnectionChangeCallbacks.forEach((callback) => callback(false));
    });
  }

  /**
   * Start the SignalR connection
   */
  async connect(): Promise<void> {
    try {
      await this.connection.start();
      console.log('SignalR connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.onConnectionChangeCallbacks.forEach((callback) => callback(true));
    } catch (error) {
      console.error('Failed to connect to SignalR hub:', error);
      this.isConnected = false;
      this.onConnectionChangeCallbacks.forEach((callback) => callback(false));
      throw error;
    }
  }

  /**
   * Stop the SignalR connection
   */
  async disconnect(): Promise<void> {
    try {
      await this.connection.stop();
      this.isConnected = false;
      this.onConnectionChangeCallbacks.forEach((callback) => callback(false));
    } catch (error) {
      console.error('Failed to disconnect from SignalR hub:', error);
    }
  }

  /**
   * Subscribe to location updates
   */
  onLocationUpdate(callback: (location: LocationData) => void): () => void {
    this.onLocationUpdateCallbacks.push(callback);
    return () => {
      const index = this.onLocationUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.onLocationUpdateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.onConnectionChangeCallbacks.push(callback);
    return () => {
      const index = this.onConnectionChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.onConnectionChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to device status changes
   */
  onDeviceStatus(callback: (deviceId: string, status: 'online' | 'offline') => void): () => void {
    this.onDeviceStatusCallbacks.push(callback);
    return () => {
      const index = this.onDeviceStatusCallbacks.indexOf(callback);
      if (index > -1) {
        this.onDeviceStatusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Request historical locations for a device
   */
  async requestDeviceHistory(deviceId: string, fromDate: Date, toDate: Date): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to SignalR hub');
    }

    await this.connection.invoke('GetDeviceHistory', deviceId, fromDate.toISOString(), toDate.toISOString());
  }

  /**
   * Join a specific device tracking group
   */
  async joinDeviceGroup(deviceId: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to SignalR hub');
    }

    await this.connection.invoke('JoinDeviceGroup', deviceId);
  }

  /**
   * Leave a device tracking group
   */
  async leaveDeviceGroup(deviceId: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to SignalR hub');
    }

    await this.connection.invoke('LeaveDeviceGroup', deviceId);
  }

  /**
   * Get connection state
   */
  getConnectionState(): boolean {
    return this.isConnected;
  }

  /**
   * Get the connection ID
   */
  getConnectionId(): string | null {
    return this.connection.connectionId;
  }
}
