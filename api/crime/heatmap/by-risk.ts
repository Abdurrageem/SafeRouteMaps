import type { VercelRequest, VercelResponse } from '@vercel/node';

// Crime data embedded for serverless deployment
const primaryCrimeData = {
  "city": "Cape Town",
  "hotspots": [
    { "area": "Mfuleni", "coordinates": { "lat": -34.0053, "lng": 18.6981 }, "risk_score": 95 },
    { "area": "Nyanga", "coordinates": { "lat": -33.9873, "lng": 18.5756 }, "risk_score": 92 },
    { "area": "Delft", "coordinates": { "lat": -33.9631, "lng": 18.6378 }, "risk_score": 85 },
    { "area": "Kraaifontein", "coordinates": { "lat": -33.8511, "lng": 18.7281 }, "risk_score": 83 },
    { "area": "Bellville", "coordinates": { "lat": -33.9017, "lng": 18.6270 }, "risk_score": 55 },
    { "area": "Table View", "coordinates": { "lat": -33.8225, "lng": 18.4875 }, "risk_score": 50 },
    { "area": "Gugulethu", "coordinates": { "lat": -33.9792, "lng": 18.5678 }, "risk_score": 45 },
    { "area": "Manenberg", "coordinates": { "lat": -33.9742, "lng": 18.5411 }, "risk_score": 40 },
    { "area": "Harare", "coordinates": { "lat": -34.0311, "lng": 18.6375 }, "risk_score": 38 },
    { "area": "Philippi East", "coordinates": { "lat": -34.0167, "lng": 18.5833 }, "risk_score": 35 },
    { "area": "Khayelitsha", "coordinates": { "lat": -34.0333, "lng": 18.6667 }, "risk_score": 90 },
    { "area": "Mitchells Plain", "coordinates": { "lat": -34.0500, "lng": 18.6167 }, "risk_score": 75 }
  ]
};

const extendedAreas = {
  "areas": [
    { "area": "Claremont", "coordinates": { "lat": -33.9804, "lng": 18.4657 }, "risk_category": "Medium", "safety_score": 62 },
    { "area": "Wynberg", "coordinates": { "lat": -34.0039, "lng": 18.4656 }, "risk_category": "Medium", "safety_score": 58 },
    { "area": "Milnerton", "coordinates": { "lat": -33.8668, "lng": 18.5112 }, "risk_category": "Medium", "safety_score": 64 },
    { "area": "Sea Point", "coordinates": { "lat": -33.9180, "lng": 18.3879 }, "risk_category": "Medium", "safety_score": 68 },
    { "area": "Rondebosch", "coordinates": { "lat": -33.9581, "lng": 18.4760 }, "risk_category": "Medium", "safety_score": 71 },
    { "area": "Pinelands", "coordinates": { "lat": -33.9355, "lng": 18.5135 }, "risk_category": "Low", "safety_score": 82 },
    { "area": "Durbanville", "coordinates": { "lat": -33.8383, "lng": 18.6470 }, "risk_category": "Low", "safety_score": 85 },
    { "area": "Fish Hoek", "coordinates": { "lat": -34.1375, "lng": 18.4274 }, "risk_category": "Low", "safety_score": 88 },
    { "area": "Simon's Town", "coordinates": { "lat": -34.1950, "lng": 18.4350 }, "risk_category": "Low", "safety_score": 90 },
    { "area": "Llandudno", "coordinates": { "lat": -34.0110, "lng": 18.3534 }, "risk_category": "Very Low", "safety_score": 96 },
    { "area": "Noordhoek", "coordinates": { "lat": -34.0950, "lng": 18.3737 }, "risk_category": "Very Low", "safety_score": 94 },
    { "area": "Kommetjie", "coordinates": { "lat": -34.1389, "lng": 18.3298 }, "risk_category": "Very Low", "safety_score": 95 }
  ]
};

interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
  area: string;
}

function generateHeatmapPoints(lat: number, lng: number, weight: number, area: string, count: number, radius: number): HeatmapPoint[] {
  const points: HeatmapPoint[] = [];
  points.push({ lat, lng, weight, area });
  
  for (let i = 1; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    const distance = radius * 0.01 * Math.random();
    points.push({
      lat: lat + distance * Math.cos(angle),
      lng: lng + distance * Math.sin(angle),
      weight: weight * (0.7 + 0.3 * Math.random()),
      area
    });
  }
  return points;
}

function getRiskLevel(riskScore: number): string {
  if (riskScore >= 70) return 'high';
  if (riskScore >= 40) return 'medium';
  if (riskScore >= 20) return 'low';
  return 'veryLow';
}

function getRiskLevelFromCategory(category: string): string {
  switch (category) {
    case 'Medium': return 'medium';
    case 'Low': return 'low';
    case 'Very Low': return 'veryLow';
    default: return 'medium';
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const pointsPerHotspot = parseInt(req.query.points as string) || 10;
  const radius = parseFloat(req.query.radius as string) || 2;

  const result: Record<string, HeatmapPoint[]> = {
    high: [],
    medium: [],
    low: [],
    veryLow: []
  };

  // Process primary crime data
  for (const hotspot of primaryCrimeData.hotspots) {
    const riskLevel = getRiskLevel(hotspot.risk_score);
    const weight = hotspot.risk_score / 100;
    const points = generateHeatmapPoints(
      hotspot.coordinates.lat,
      hotspot.coordinates.lng,
      weight,
      hotspot.area,
      pointsPerHotspot,
      radius
    );
    result[riskLevel].push(...points);
  }

  // Process extended areas
  for (const area of extendedAreas.areas) {
    const riskLevel = getRiskLevelFromCategory(area.risk_category);
    const weight = (100 - area.safety_score) / 100;
    const points = generateHeatmapPoints(
      area.coordinates.lat,
      area.coordinates.lng,
      weight,
      area.area,
      pointsPerHotspot,
      radius
    );
    result[riskLevel].push(...points);
  }

  res.status(200).json({ success: true, data: result });
}
