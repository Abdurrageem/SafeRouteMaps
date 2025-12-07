import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  
  res.status(200).json({
    googleMapsApiKey: apiKey,
    mapCenter: {
      lat: -33.9249,
      lng: 18.4241
    },
    defaultZoom: 11
  });
}
