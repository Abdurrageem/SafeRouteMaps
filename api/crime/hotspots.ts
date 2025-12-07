import type { VercelRequest, VercelResponse } from '@vercel/node';

// Crime data embedded for serverless deployment - Full data
const primaryCrimeData = {
  hotspots: [
    { 
      area: "Mfuleni", 
      district: "City of Cape Town",
      coordinates: { lat: -34.0053, lng: 18.6981 }, 
      risk_score: 95,
      stats: { contact_crime_total: 1013, carjacking: null, theft_motor_vehicle: 21, theft_from_motor_vehicle: null },
      source_note: "Contact-crime top-30 station entry from SAPS PDF"
    },
    { 
      area: "Nyanga", 
      district: "City of Cape Town",
      coordinates: { lat: -33.9873, lng: 18.5756 }, 
      risk_score: 92,
      stats: { contact_crime_total: 979, carjacking: null, theft_motor_vehicle: null, theft_from_motor_vehicle: 21 },
      source_note: "Contact-crime top-30 station entry from SAPS PDF"
    },
    { 
      area: "Delft", 
      district: "City of Cape Town",
      coordinates: { lat: -33.9631, lng: 18.6378 }, 
      risk_score: 85,
      stats: { contact_crime_total: 833, carjacking: null, theft_motor_vehicle: null, theft_from_motor_vehicle: null },
      source_note: "Contact-crime top-30 station entry from SAPS PDF"
    },
    { 
      area: "Kraaifontein", 
      district: "City of Cape Town",
      coordinates: { lat: -33.8511, lng: 18.7281 }, 
      risk_score: 83,
      stats: { contact_crime_total: 818, carjacking: null, theft_motor_vehicle: null, theft_from_motor_vehicle: null },
      source_note: "Contact-crime top-30 station entry from SAPS PDF"
    },
    { 
      area: "Khayelitsha", 
      district: "City of Cape Town",
      coordinates: { lat: -34.0333, lng: 18.6667 }, 
      risk_score: 90,
      stats: { contact_crime_total: null, carjacking: null, theft_motor_vehicle: null, theft_from_motor_vehicle: null },
      source_note: "Known high-crime area"
    },
    { 
      area: "Mitchells Plain", 
      district: "City of Cape Town",
      coordinates: { lat: -34.0500, lng: 18.6167 }, 
      risk_score: 75,
      stats: { contact_crime_total: null, carjacking: null, theft_motor_vehicle: null, theft_from_motor_vehicle: null },
      source_note: "Known high-crime area"
    },
    { 
      area: "Bellville", 
      district: "City of Cape Town",
      coordinates: { lat: -33.9017, lng: 18.6270 }, 
      risk_score: 55,
      stats: { contact_crime_total: 290, carjacking: null, theft_motor_vehicle: null, theft_from_motor_vehicle: null },
      source_note: "Top-30 station entry"
    },
    { 
      area: "Table View", 
      district: "City of Cape Town",
      coordinates: { lat: -33.8225, lng: 18.4875 }, 
      risk_score: 50,
      stats: { contact_crime_total: 267, carjacking: null, theft_motor_vehicle: null, theft_from_motor_vehicle: null },
      source_note: "Top-30 station entry"
    },
    { 
      area: "Gugulethu", 
      district: "City of Cape Town",
      coordinates: { lat: -33.9792, lng: 18.5678 }, 
      risk_score: 45,
      stats: { contact_crime_total: 43, carjacking: null, theft_motor_vehicle: null, theft_from_motor_vehicle: null },
      source_note: "Top-30 lists in SAPS PDF"
    },
    { 
      area: "Manenberg", 
      district: "City of Cape Town",
      coordinates: { lat: -33.9742, lng: 18.5411 }, 
      risk_score: 40,
      stats: { contact_crime_total: 24, carjacking: null, theft_motor_vehicle: null, theft_from_motor_vehicle: null },
      source_note: "Top-30 table entry"
    },
    { 
      area: "Harare", 
      district: "City of Cape Town",
      coordinates: { lat: -34.0311, lng: 18.6375 }, 
      risk_score: 38,
      stats: { contact_crime_total: 21, carjacking: null, theft_motor_vehicle: null, theft_from_motor_vehicle: null },
      source_note: "Top 30 pages in SAPS PDF"
    },
    { 
      area: "Philippi East", 
      district: "City of Cape Town",
      coordinates: { lat: -34.0167, lng: 18.5833 }, 
      risk_score: 35,
      stats: { contact_crime_total: null, carjacking: null, theft_motor_vehicle: null, theft_from_motor_vehicle: null },
      source_note: "Cape Town-area station"
    }
  ]
};

const extendedAreas = {
  areas: [
    { 
      area: "Claremont", 
      district: "City of Cape Town",
      coordinates: { lat: -33.9804, lng: 18.4657 }, 
      risk_category: "Medium", 
      safety_score: 62,
      stats: { contact_crime_total: 145, carjacking: 4, theft_motor_vehicle: 18, theft_from_motor_vehicle: 22 }
    },
    { 
      area: "Wynberg", 
      district: "City of Cape Town",
      coordinates: { lat: -34.0039, lng: 18.4656 }, 
      risk_category: "Medium", 
      safety_score: 58,
      stats: { contact_crime_total: 198, carjacking: 5, theft_motor_vehicle: 21, theft_from_motor_vehicle: 27 }
    },
    { 
      area: "Milnerton", 
      district: "City of Cape Town",
      coordinates: { lat: -33.8668, lng: 18.5112 }, 
      risk_category: "Medium", 
      safety_score: 64,
      stats: { contact_crime_total: 167, carjacking: 3, theft_motor_vehicle: 12, theft_from_motor_vehicle: 19 }
    },
    { 
      area: "Sea Point", 
      district: "City of Cape Town",
      coordinates: { lat: -33.9180, lng: 18.3879 }, 
      risk_category: "Medium", 
      safety_score: 68,
      stats: { contact_crime_total: 121, carjacking: 2, theft_motor_vehicle: 8, theft_from_motor_vehicle: 14 }
    },
    { 
      area: "Rondebosch", 
      district: "City of Cape Town",
      coordinates: { lat: -33.9581, lng: 18.4760 }, 
      risk_category: "Medium", 
      safety_score: 71,
      stats: { contact_crime_total: 113, carjacking: 1, theft_motor_vehicle: 7, theft_from_motor_vehicle: 13 }
    },
    { 
      area: "Pinelands", 
      district: "City of Cape Town",
      coordinates: { lat: -33.9355, lng: 18.5135 }, 
      risk_category: "Low", 
      safety_score: 82,
      stats: { contact_crime_total: 69, carjacking: 0, theft_motor_vehicle: 3, theft_from_motor_vehicle: 6 }
    },
    { 
      area: "Durbanville", 
      district: "City of Cape Town",
      coordinates: { lat: -33.8383, lng: 18.6470 }, 
      risk_category: "Low", 
      safety_score: 85,
      stats: { contact_crime_total: 58, carjacking: 0, theft_motor_vehicle: 2, theft_from_motor_vehicle: 3 }
    },
    { 
      area: "Fish Hoek", 
      district: "City of Cape Town",
      coordinates: { lat: -34.1375, lng: 18.4274 }, 
      risk_category: "Low", 
      safety_score: 88,
      stats: { contact_crime_total: 44, carjacking: 0, theft_motor_vehicle: 1, theft_from_motor_vehicle: 2 }
    },
    { 
      area: "Simon's Town", 
      district: "City of Cape Town",
      coordinates: { lat: -34.1950, lng: 18.4350 }, 
      risk_category: "Low", 
      safety_score: 90,
      stats: { contact_crime_total: 38, carjacking: 0, theft_motor_vehicle: 1, theft_from_motor_vehicle: 1 }
    },
    { 
      area: "Llandudno", 
      district: "City of Cape Town",
      coordinates: { lat: -34.0110, lng: 18.3534 }, 
      risk_category: "Very Low", 
      safety_score: 96,
      stats: { contact_crime_total: 6, carjacking: 0, theft_motor_vehicle: 0, theft_from_motor_vehicle: 1 }
    },
    { 
      area: "Noordhoek", 
      district: "City of Cape Town",
      coordinates: { lat: -34.0950, lng: 18.3737 }, 
      risk_category: "Very Low", 
      safety_score: 94,
      stats: { contact_crime_total: 12, carjacking: 0, theft_motor_vehicle: 0, theft_from_motor_vehicle: 1 }
    },
    { 
      area: "Kommetjie", 
      district: "City of Cape Town",
      coordinates: { lat: -34.1389, lng: 18.3298 }, 
      risk_category: "Very Low", 
      safety_score: 95,
      stats: { contact_crime_total: 9, carjacking: 0, theft_motor_vehicle: 0, theft_from_motor_vehicle: 0 }
    }
  ]
};

function getRiskCategoryFromScore(score: number): string {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  if (score >= 20) return 'Low';
  return 'Very Low';
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Combine all hotspots with full data
  const allHotspots = [
    ...primaryCrimeData.hotspots.map(h => ({
      area: h.area,
      district: h.district,
      coordinates: h.coordinates,
      risk_score: h.risk_score,
      risk_category: getRiskCategoryFromScore(h.risk_score),
      safety_score: 100 - h.risk_score,
      stats: h.stats,
      source_note: h.source_note
    })),
    ...extendedAreas.areas.map(a => ({
      area: a.area,
      district: a.district,
      coordinates: a.coordinates,
      risk_score: 100 - a.safety_score,
      risk_category: a.risk_category,
      safety_score: a.safety_score,
      stats: a.stats,
      source_note: `${a.risk_category} risk area`
    }))
  ];

  res.status(200).json({
    success: true,
    hotspots: allHotspots,
    count: allHotspots.length
  });
}
