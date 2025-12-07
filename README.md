# Google Maps Real-time Dashboard

A TypeScript dashboard that integrates with Google Maps to display heatmaps and route optimization based on real-time location data. The dashboard communicates with mobile apps (built using .NET MAUI) via SignalR/WebSocket for real-time updates.

## Features

- 🗺️ **Interactive Google Map** - Dark theme with full map controls
- 🔥 **Real-time Heatmaps** - Visualize location density with customizable heatmaps
- 🛣️ **Route Optimization** - Calculate optimal routes between device locations
- 📡 **Real-time Updates** - SignalR/WebSocket integration for live location tracking
- 💾 **SQLite Database** - Persistent storage for location history
- 📊 **Live Statistics** - Active devices, data points, and route distances

## Project Structure

```
GoogleMaps/
├── public/
│   └── index.html           # Dashboard HTML entry point
├── src/
│   ├── components/
│   │   ├── MapManager.ts    # Google Maps initialization and management
│   │   ├── HeatmapRenderer.ts # Heatmap layer management
│   │   └── RouteOptimizer.ts  # Route calculation and optimization
│   ├── services/
│   │   ├── SignalRService.ts  # Real-time communication client
│   │   └── ApiService.ts      # HTTP API client
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   └── index.ts               # Main dashboard entry point
├── server/
│   ├── index.ts               # Express server with API routes
│   ├── database.ts            # SQLite database service
│   ├── signalr-hub.ts         # WebSocket hub for real-time updates
│   └── init-db.ts             # Database initialization script
├── package.json
├── tsconfig.json
├── webpack.config.js
└── .env.example
```

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Maps API Key with the following APIs enabled:
  - Maps JavaScript API
  - Directions API
  - Visualization Library

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and add your Google Maps API key:

```bash
cp .env.example .env
```

Edit `.env` and set your API key:

```env
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
PORT=3000
HOST=localhost
DATABASE_PATH=./data/locations.db
```

### 3. Initialize the Database

Create the SQLite database with sample data:

```bash
npm run init-db
```

### 4. Build the Project

```bash
npm run build
npm run build:client
```

### 5. Start the Server

```bash
npm start
```

Or for development with hot reload:

```bash
npm run dev
```

### 6. Access the Dashboard

Open your browser and navigate to:

```
http://localhost:8080
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/locations` | Get all locations |
| GET | `/api/locations/device/:deviceId` | Get locations for a device |
| GET | `/api/locations/range?from=&to=` | Get locations in time range |
| GET | `/api/locations/bounds?north=&south=&east=&west=` | Get locations in bounds |
| GET | `/api/locations/latest` | Get latest location per device |
| GET | `/api/devices` | Get active devices |
| GET | `/api/stats` | Get dashboard statistics |
| POST | `/api/locations` | Submit a new location |
| GET | `/api/config` | Get client configuration |
| GET | `/api/health` | Health check |

## SignalR/WebSocket Events

### Client to Server

| Event | Description |
|-------|-------------|
| `SendLocation` | Send location from mobile device |
| `JoinDeviceGroup` | Subscribe to specific device updates |
| `LeaveDeviceGroup` | Unsubscribe from device updates |
| `GetDeviceHistory` | Request historical location data |

### Server to Client

| Event | Description |
|-------|-------------|
| `ReceiveLocation` | Receive single location update |
| `ReceiveLocations` | Receive bulk location updates |
| `DeviceStatusChanged` | Device online/offline status |

## .NET MAUI Integration

To send locations from your .NET MAUI app, connect to the WebSocket hub and send location updates:

```csharp
// Example .NET MAUI SignalR client code
var connection = new HubConnectionBuilder()
    .WithUrl("http://your-server:3000/hub/location")
    .Build();

await connection.StartAsync();

// Send location update
await connection.InvokeAsync("SendLocation", new {
    deviceId = "device-001",
    latitude = 40.7128,
    longitude = -74.006,
    accuracy = 10.0,
    speed = 5.0
});
```

## Dashboard Controls

### Map Controls
- **Map Type**: Switch between Roadmap, Satellite, Hybrid, and Terrain views

### Heatmap Settings
- **Radius**: Adjust the blur radius of heatmap points
- **Opacity**: Control heatmap transparency
- **Intensity**: Set maximum intensity value

### Route Optimization
- **Optimize Routes**: Calculate optimal path through all device locations
- **Clear Routes**: Remove route display from map

## Development

### Run in Development Mode

```bash
npm run dev
```

This starts both the backend server and webpack dev server with hot reload.

### Build for Production

```bash
npm run build
npm run build:client
npm start
```

## Tech Stack

- **Frontend**: TypeScript, Google Maps JavaScript API, Webpack
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite (better-sqlite3)
- **Real-time**: WebSocket (ws)
- **Client SignalR**: @microsoft/signalr

## License

MIT
