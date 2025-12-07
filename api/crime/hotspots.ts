import type { VercelRequest, VercelResponse } from '@vercel/node';

// Crime data embedded for serverless deployment
const primaryCrimeData = {
  hotspots: [
    { area: "Mfuleni", coordinates: { lat: -34.0053, lng: 18.6981 }, risk_score: 95 },
    { area: "Nyanga", coordinates: { lat: -33.9873, lng: 18.5756 }, risk_score: 92 },
    { area: "Delft", coordinates: { lat: -33.9631, lng: 18.6378 }, risk_score: 85 },
    { area: "Kraaifontein", coordinates: { lat: -33.8511, lng: 18.7281 }, risk_score: 83 },
    { area: "Khayelitsha", coordinates: { lat: -34.0333, lng: 18.6667 }, risk_score: 90 },
    { area: "Mitchells Plain", coordinates: { lat: -34.0500, lng: 18.6167 }, risk_score: 75 },
    { area: "Bellville", coordinates: { lat: -33.9017, lng: 18.6270 }, risk_score: 55 },
    { area: "Table View", coordinates: { lat: -33.8225, lng: 18.4875 }, risk_score: 50 },
    { area: "Gugulethu", coordinates: { lat: -33.9792, lng: 18.5678 }, risk_score: 45 },
    { area: "Manenberg", coordinates: { lat: -33.9742, lng: 18.5411 }, risk_score: 40 },
    { area: "Harare", coordinates: { lat: -34.0311, lng: 18.6375 }, risk_score: 38 },
    { area: "Philippi East", coordinates: { lat: -34.0167, lng: 18.5833 }, risk_score: 35 }
  ]
};

const extendedAreas = {
  areas: [
    { area: "Claremont", coordinates: { lat: -33.9804, lng: 18.4657 }, risk_category: "Medium", safety_score: 62 },
    { area: "Wynberg", coordinates: { lat: -34.0039, lng: 18.4656 }, risk_category: "Medium", safety_score: 58 },
    { area: "Milnerton", coordinates: { lat: -33.8668, lng: 18.5112 }, risk_category: "Medium", safety_score: 64 },
    { area: "Sea Point", coordinates: { lat: -33.9180, lng: 18.3879 }, risk_category: "Medium", safety_score: 68 },
    { area: "Rondebosch", coordinates: { lat: -33.9581, lng: 18.4760 }, risk_category: "Medium", safety_score: 71 },
    { area: "Pinelands", coordinates: { lat: -33.9355, lng: 18.5135 }, risk_category: "Low", safety_score: 82 },
    { area: "Durbanville", coordinates: { lat: -33.8383, lng: 18.6470 }, risk_category: "Low", safety_score: 85 },
    { area: "Fish Hoek", coordinates: { lat: -34.1375, lng: 18.4274 }, risk_category: "Low", safety_score: 88 },
    { area: "Simon's Town", coordinates: { lat: -34.1950, lng: 18.4350 }, risk_category: "Low", safety_score: 90 },
    { area: "Llandudno", coordinates: { lat: -34.0110, lng: 18.3534 }, risk_category: "Very Low", safety_score: 96 },
    { area: "Noordhoek", coordinates: { lat: -34.0950, lng: 18.3737 }, risk_category: "Very Low", safety_score: 94 },
    { area: "Kommetjie", coordinates: { lat: -34.1389, lng: 18.3298 }, risk_category: "Very Low", safety_score: 95 }
  ]
};

function getRiskCategoryFromScore(score: number): string {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  if (score >= 20) return 'Low';
  return 'Very Low';
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Combine all hotspots
  const allHotspots = [
    ...primaryCrimeData.hotspots.map(h => ({
      area: h.area,
      coordinates: h.coordinates,
      risk_score: h.risk_score,
      risk_category: getRiskCategoryFromScore(h.risk_score)
    })),
    ...extendedAreas.areas.map(a => ({
      area: a.area,
      coordinates: a.coordinates,
      risk_score: 100 - a.safety_score,
      risk_category: a.risk_category
    }))
  ];

  res.status(200).json({
    success: true,
    hotspots: allHotspots,
    count: allHotspots.length
  });
}
