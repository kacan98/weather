import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface SearchRequest {
	query: string;
}

interface LocationResult {
	name: string;
	lat: number;
	lng: number;
	country?: string;
	region?: string;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { query }: SearchRequest = await request.json();
		
		if (!query || query.trim().length < 2) {
			return json({
				success: false,
				error: 'Query must be at least 2 characters'
			});
		}
		
		// First, get fresh session from Morecast
		const authResponse = await fetch('https://morecast.com/en/plan-your-route');
		const cookies = authResponse.headers.get('set-cookie') || '';
		
		// Search for locations
		const formData = new URLSearchParams();
		formData.append('query', query.trim());
		
		const searchResponse = await fetch('https://morecast.com/en/api/search-location', {
			method: 'POST',
			headers: {
				'Accept': '*/*',
				'Accept-Language': 'en,cs;q=0.9,da;q=0.8,ru;q=0.7,sv;q=0.6',
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
				'Origin': 'https://morecast.com',
				'Referer': 'https://morecast.com/en/plan-your-route',
				'X-Requested-With': 'XMLHttpRequest',
				'Cookie': cookies,
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
			},
			body: formData.toString()
		});
		
		if (!searchResponse.ok) {
			throw new Error(`Search API error: ${searchResponse.status}`);
		}
		
		const searchData = await searchResponse.json();
		
		// Transform the results to our format
		const locations: LocationResult[] = [];
		
		if (Array.isArray(searchData)) {
			for (const item of searchData) {
				if (item.lat && item.lng && item.name) {
					locations.push({
						name: item.name,
						lat: parseFloat(item.lat),
						lng: parseFloat(item.lng),
						country: item.country,
						region: item.region
					});
				}
			}
		}
		
		return json({
			success: true,
			data: locations
		});
		
	} catch (error) {
		console.error('Location search error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return json({
			success: false,
			error: errorMessage
		}, { status: 500 });
	}
};