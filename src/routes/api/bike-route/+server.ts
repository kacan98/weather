import { json } from '@sveltejs/kit';
import { OPENROUTESERVICE_API_KEY, GRAPHHOPPER_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

interface BikeRouteRequest {
	start: {
		lat: number;
		lng: number;
	};
	end: {
		lat: number;
		lng: number;
	};
}

interface RoutePoint {
	lat: number;
	lng: number;
	progress: number;
}

// OpenRouteService API (free tier: 2000 requests/day)
// You can get a free API key at https://openrouteservice.org/
const ORS_API_KEY = OPENROUTESERVICE_API_KEY || 'your_openrouteservice_api_key_here';

async function fetchOpenRouteServiceRoute(start: { lat: number; lng: number }, end: { lat: number; lng: number }): Promise<RoutePoint[]> {
	try {
		const url = `https://api.openrouteservice.org/v2/directions/cycling-regular`;
		
		const requestBody = {
			coordinates: [[start.lng, start.lat], [end.lng, end.lat]], // ORS uses lng,lat order
			format: 'geojson',
			profile: 'cycling-regular',
			preference: 'recommended', // Prefer bike-friendly routes
			instructions: false,
			geometry_simplify: true
		};

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': ORS_API_KEY
			},
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			throw new Error(`OpenRouteService API error: ${response.status}`);
		}

		const data = await response.json();
		const coordinates = data.features[0].geometry.coordinates;
		
		// Convert to RoutePoint array with progress
		const routePoints: RoutePoint[] = coordinates.map((coord: [number, number], index: number) => ({
			lat: coord[1], // Convert from lng,lat to lat,lng
			lng: coord[0],
			progress: index / (coordinates.length - 1)
		}));

		// Simplify route to ~10-15 points for weather sampling
		return simplifyRoute(routePoints, 12);
		
	} catch (error) {
		console.error('OpenRouteService error:', error);
		throw error;
	}
}

// Alternative: Use GraphHopper (also free tier available)
async function fetchGraphHopperRoute(start: { lat: number; lng: number }, end: { lat: number; lng: number }): Promise<RoutePoint[]> {
	try {
		// GraphHopper API key (get free at https://www.graphhopper.com/)
		// const GRAPHHOPPER_API_KEY = 'your_graphhopper_api_key_here';
		
		const url = `https://graphhopper.com/api/1/route`;
		const params = new URLSearchParams();
		params.append('point', `${start.lat},${start.lng}`);
		params.append('point', `${end.lat},${end.lng}`);
		params.append('vehicle', 'bike');
		params.append('locale', 'en');
		params.append('optimize', 'true');
		params.append('instructions', 'false');
		params.append('calc_points', 'true');
		params.append('key', GRAPHHOPPER_API_KEY || 'your_graphhopper_api_key_here');

		const response = await fetch(`${url}?${params}`);
		
		if (!response.ok) {
			throw new Error(`GraphHopper API error: ${response.status}`);
		}

		const data = await response.json();
		const coordinates = data.paths[0].points.coordinates;
		
		const routePoints: RoutePoint[] = coordinates.map((coord: [number, number], index: number) => ({
			lat: coord[1],
			lng: coord[0],
			progress: index / (coordinates.length - 1)
		}));

		return simplifyRoute(routePoints, 12);
		
	} catch (error) {
		console.error('GraphHopper error:', error);
		throw error;
	}
}

// Fallback: Generate simple interpolated route
function generateFallbackRoute(start: { lat: number; lng: number }, end: { lat: number; lng: number }): RoutePoint[] {
	const points: RoutePoint[] = [];
	const numPoints = 8;
	
	for (let i = 0; i < numPoints; i++) {
		const progress = i / (numPoints - 1);
		points.push({
			lat: start.lat + (end.lat - start.lat) * progress,
			lng: start.lng + (end.lng - start.lng) * progress,
			progress
		});
	}
	
	return points;
}

// Simplify route to specified number of points using distance-based sampling
function simplifyRoute(points: RoutePoint[], targetCount: number): RoutePoint[] {
	if (points.length <= targetCount) {
		return points;
	}
	
	const simplified: RoutePoint[] = [points[0]]; // Always include start
	const totalDistance = calculateTotalDistance(points);
	const segmentDistance = totalDistance / (targetCount - 1);
	
	let currentDistance = 0;
	let targetDistance = segmentDistance;
	
	for (let i = 1; i < points.length - 1; i++) {
		const distToNext = calculateDistance(points[i - 1], points[i]);
		currentDistance += distToNext;
		
		if (currentDistance >= targetDistance && simplified.length < targetCount - 1) {
			simplified.push({
				...points[i],
				progress: simplified.length / (targetCount - 1)
			});
			targetDistance += segmentDistance;
		}
	}
	
	simplified.push(points[points.length - 1]); // Always include end
	
	// Recalculate progress for all points
	return simplified.map((point, index) => ({
		...point,
		progress: index / (simplified.length - 1)
	}));
}

function calculateDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
	const R = 6371; // Earth's radius in km
	const dLat = (p2.lat - p1.lat) * Math.PI / 180;
	const dLng = (p2.lng - p1.lng) * Math.PI / 180;
	const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
			Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
			Math.sin(dLng/2) * Math.sin(dLng/2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	return R * c;
}

function calculateTotalDistance(points: RoutePoint[]): number {
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		total += calculateDistance(points[i - 1], points[i]);
	}
	return total;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { start, end }: BikeRouteRequest = await request.json();
		
		if (!start?.lat || !start?.lng || !end?.lat || !end?.lng) {
			return json({
				success: false,
				error: 'Start and end coordinates are required'
			}, { status: 400 });
		}
		
		console.log(`Fetching bike route from ${start.lat},${start.lng} to ${end.lat},${end.lng}`);
		
		let routePoints: RoutePoint[] = [];
		let routingService = 'Fallback';
		
		// Try OpenRouteService first (if API key is configured)
		if (ORS_API_KEY && ORS_API_KEY !== 'your_openrouteservice_api_key_here') {
			try {
				console.log('Trying OpenRouteService...');
				routePoints = await fetchOpenRouteServiceRoute(start, end);
				routingService = 'OpenRouteService';
				console.log(`Successfully fetched route from OpenRouteService with ${routePoints.length} points`);
			} catch (error) {
				console.warn('OpenRouteService failed, trying GraphHopper:', error);
				
				// Try GraphHopper as backup
				if (GRAPHHOPPER_API_KEY && GRAPHHOPPER_API_KEY !== 'your_graphhopper_api_key_here') {
					try {
						console.log('Trying GraphHopper...');
						routePoints = await fetchGraphHopperRoute(start, end);
						routingService = 'GraphHopper';
						console.log(`Successfully fetched route from GraphHopper with ${routePoints.length} points`);
					} catch (ghError) {
						console.warn('GraphHopper also failed, using fallback:', ghError);
						routePoints = generateFallbackRoute(start, end);
					}
				} else {
					routePoints = generateFallbackRoute(start, end);
				}
			}
		} else if (GRAPHHOPPER_API_KEY && GRAPHHOPPER_API_KEY !== 'your_graphhopper_api_key_here') {
			try {
				console.log('Trying GraphHopper...');
				routePoints = await fetchGraphHopperRoute(start, end);
				routingService = 'GraphHopper';
				console.log(`Successfully fetched route from GraphHopper with ${routePoints.length} points`);
			} catch (error) {
				console.warn('GraphHopper failed, using fallback:', error);
				routePoints = generateFallbackRoute(start, end);
			}
		} else {
			console.log('No routing API keys configured, using fallback route');
			routePoints = generateFallbackRoute(start, end);
		}
		
		// Calculate route metadata
		const totalDistance = calculateTotalDistance(routePoints);
		const estimatedDurationMinutes = Math.round(totalDistance * 4); // ~15 km/h average cycling speed
		
		return json({
			success: true,
			routePoints,
			metadata: {
				totalDistance: Math.round(totalDistance * 10) / 10,
				estimatedDurationMinutes,
				pointCount: routePoints.length,
				routingService
			}
		});
		
	} catch (error) {
		console.error('Bike route API error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return json({
			success: false,
			error: errorMessage
		}, { status: 500 });
	}
};
