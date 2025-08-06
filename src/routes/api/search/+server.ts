import { json } from '@sveltejs/kit';
import { WEATHER_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

interface SearchRequest {
	query: string;
}

interface SearchResult {
	name: string;
	lat: number;
	lng: number;
	country?: string;
	region?: string;
	type?: string;
}

export const POST: RequestHandler = async ({ request }) => {
	const { query }: SearchRequest = await request.json();
	
	try {
		if (!query || query.trim().length < 2) {
			return json({
				success: true,
				data: []
			});
		}

		// Use Nominatim (OpenStreetMap) for better address search - completely free!
		const searchUrl = `https://nominatim.openstreetmap.org/search?` + 
			`q=${encodeURIComponent(query.trim())}&` +
			`format=json&` +
			`addressdetails=1&` +
			`limit=10&` +
			`countrycodes=dk,se,no,de,gb,us&` + // Prioritize Nordic countries + common ones
			`accept-language=en`;
		
		const response = await fetch(searchUrl, {
			headers: {
				'User-Agent': 'BikeWeatherApp/1.0 (https://your-domain.com)' // Required by Nominatim
			}
		});
		
		if (!response.ok) {
			const errorText = await response.text();
			console.error('Nominatim search error:', response.status, errorText);
			
			// Fallback to WeatherAPI.com if Nominatim fails
			return await fallbackToWeatherAPI(query);
		}
		
		const searchData = await response.json();
		
		// Transform Nominatim data to our format
		const results: SearchResult[] = searchData.map((location: any) => {
			// Build a nice display name from address components
			let displayName = location.display_name;
			
			// Try to create a more readable name
			if (location.address) {
				const addr = location.address;
				const parts = [];
				
				// Add house number and street
				if (addr.house_number && addr.road) {
					parts.push(`${addr.road} ${addr.house_number}`);
				} else if (addr.road) {
					parts.push(addr.road);
				}
				
				// Add locality/city
				if (addr.city) {
					parts.push(addr.city);
				} else if (addr.town) {
					parts.push(addr.town);
				} else if (addr.village) {
					parts.push(addr.village);
				} else if (addr.municipality) {
					parts.push(addr.municipality);
				}
				
				// Add country for international results
				if (addr.country) {
					parts.push(addr.country);
				}
				
				if (parts.length > 0) {
					displayName = parts.join(', ');
				}
			}
			
			return {
				name: displayName,
				lat: parseFloat(location.lat),
				lng: parseFloat(location.lon),
				country: location.address?.country,
				region: location.address?.state || location.address?.region,
				type: location.type || 'address'
			};
		});
		
		return json({
			success: true,
			data: results
		});
		
	} catch (error) {
		console.error('Location search error:', error);
		
		// Fallback to WeatherAPI.com search
		try {
			return await fallbackToWeatherAPI(query.trim());
		} catch (fallbackError) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			return json({
				success: false,
				error: errorMessage
			}, { status: 500 });
		}
	}
};

// Fallback function to use WeatherAPI.com if Nominatim fails
async function fallbackToWeatherAPI(query: string) {
	if (!WEATHER_API_KEY) {
		return json({
			success: false,
			error: 'Location search temporarily unavailable'
		}, { status: 500 });
	}

	const weatherSearchUrl = `https://api.weatherapi.com/v1/search.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(query.trim())}`;
	
	const response = await fetch(weatherSearchUrl);
	
	if (!response.ok) {
		throw new Error(`WeatherAPI fallback failed: ${response.status}`);
	}
	
	const searchData = await response.json();
	
	const results: SearchResult[] = searchData.map((location: any) => ({
		name: location.name,
		lat: location.lat,
		lng: location.lon,
		country: location.country,
		region: location.region,
		type: 'city'
	}));
	
	return json({
		success: true,
		data: results
	});
}
