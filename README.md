# SafeRouteMaps - Cape Town Crime Heatmap Dashboard

A TypeScript dashboard that integrates with Google Maps to display crime heatmaps and route optimization for Cape Town, South Africa. The dashboard visualizes crime statistics from SAPS (South African Police Service) data with multi-layer risk visualization.

## 🌐 Live Demo

**[View Live Dashboard](https://safe-route-maps-1wdl76i14-abdur-rageems-projects.vercel.app/)**

## Features

- 🗺️ **Interactive Google Map** - Light theme centered on Cape Town
- 🔥 **Multi-Layer Crime Heatmaps** - 4 separate layers for High, Medium, Low, and Very Low risk areas
- 🎯 **Risk Zone Circles** - Visual outlines around each crime hotspot
- 📍 **Interactive Markers** - Click hotspots to view detailed crime statistics
- 🛣️ **Route Optimization** - Calculate optimal safe routes
- 📡 **Real-time Updates** - SignalR/WebSocket integration for live location tracking
- 📊 **Live Statistics** - Active devices, data points, and route distances

## Crime Data

The dashboard displays crime statistics from 24 Cape Town areas:
- **12 High-Risk Areas**: Mfuleni, Nyanga, Delft, Khayelitsha, etc.
- **12 Extended Areas**: Medium, Low, and Very Low risk zones

Data source: SAPS Q1 2024/25 Crime Statistics

## Project Structure

```
SafeRouteMaps/
├── api/                       # Vercel Serverless Functions
│   ├── config.ts              # API config endpoint
│   ├── health.ts              # Health check endpoint
│   └── crime/
│       ├── hotspots.ts        # Crime hotspots endpoint
│       └── heatmap/
│           └── by-risk.ts     # Heatmap data by risk level
├── public/
│   └── index.html             # Dashboard HTML entry point
├── src/
│   ├── components/
│   │   ├── MapManager.ts      # Google Maps initialization
│   │   ├── HeatmapRenderer.ts # Heatmap layer management
│   │   └── RouteOptimizer.ts  # Route calculation
│   ├── services/
│   │   ├── SignalRService.ts  # Real-time communication
│   │   └── ApiService.ts      # HTTP API client
│   ├── types/
│   │   └── index.ts           # TypeScript definitions
│   └── index.ts               # Main dashboard entry
├── server/                    # Local development server
│   ├── index.ts               # Express server
│   ├── database.ts            # SQLite database service
│   ├── crime-data.ts          # Crime data service
│   └── signalr-hub.ts         # WebSocket hub
├── data/
│   ├── cape-town-crime-stats.json      # Primary crime data
│   └── cape-town-extended-areas.json   # Extended area data
├── vercel.json                # Vercel deployment config
├── package.json
├── tsconfig.json
└── webpack.config.js
```

## Deployment

### Vercel (Production)

The app is deployed on Vercel with serverless API functions.

**Live URL**: [https://safe-route-maps-1wdl76i14-abdur-rageems-projects.vercel.app/](https://safe-route-maps-1wdl76i14-abdur-rageems-projects.vercel.app/)

#### Deploy Your Own

1. Fork/clone this repository
2. Import to [Vercel](https://vercel.com)
3. Add environment variable: `GOOGLE_MAPS_API_KEY`
4. Deploy

### Local Development

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
- **Deployment**: Vercel (Serverless Functions)
- **Database**: SQLite (sql.js - pure JavaScript)
- **Real-time**: WebSocket (ws)
- **Client SignalR**: @microsoft/signalr

## API Endpoints (Vercel)

| Endpoint | Description |
|----------|-------------|
| `/api/health` | Health check |
| `/api/config` | Client configuration (API key) |
| `/api/crime/hotspots` | All crime hotspots with statistics |
| `/api/crime/heatmap/by-risk` | Heatmap points grouped by risk level |

## Screenshots

The dashboard displays:
- **Red Zones**: High-risk crime areas (Mfuleni, Nyanga, Khayelitsha, etc.)
- **Yellow Zones**: Medium-risk areas (Claremont, Wynberg, Sea Point, etc.)
- **Light Green Zones**: Low-risk areas (Pinelands, Durbanville, Fish Hoek, etc.)
- **Green Zones**: Very low-risk areas (Llandudno, Noordhoek, Kommetjie)

## License

MIT
