import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface WeatherRequest {
	start: { lat: number; lng: number };
	end: { lat: number; lng: number };
	departureTime?: string;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { start, end, departureTime }: WeatherRequest = await request.json();
		
		// First, get fresh tokens from Morecast
		const authResponse = await fetch('https://morecast.com/en/plan-your-route');
		const authHTML = await authResponse.text();
		
		// Extract CSRF token from the HTML
		const csrfMatch = authHTML.match(/name="_token" value="([^"]+)"/);
		const csrfToken = csrfMatch ? csrfMatch[1] : null;
		
		if (!csrfToken) {
			throw new Error('Could not get CSRF token');
		}
		
		// Get cookies from auth response
		const cookies = authResponse.headers.get('set-cookie') || '';
		
		// Prepare route request data
		const formData = new URLSearchParams();
		formData.append('mode', 'bicycle');
		formData.append('locations', `${start.lng}+${start.lat},${end.lng}+${end.lat}`);
		formData.append('utc_offset', '-21600');
		formData.append('depart_type', 'now');
		formData.append('start_date', new Date().toLocaleDateString('en-GB'));
		formData.append('start_time', departureTime || '09:00');
		
		// Make request to Morecast API
		const weatherResponse = await fetch('https://morecast.com/en/api/plan-route', {
			method: 'POST',
			headers: {
				'Accept': '*/*',
				'Accept-Language': 'en,cs;q=0.9,da;q=0.8,ru;q=0.7,sv;q=0.6',
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
				'Origin': 'https://morecast.com',
				'Referer': 'https://morecast.com/en/plan-your-route',
				'X-CSRF-TOKEN': csrfToken,
				'X-Requested-With': 'XMLHttpRequest',
				'Cookie': cookies,
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
			},
			body: formData.toString()
		});
		
		if (!weatherResponse.ok) {
			throw new Error(`Morecast API error: ${weatherResponse.status}`);
		}
		
		const weatherData = await weatherResponse.json();
		
		return json({
			success: true,
			data: weatherData
		});
		
	} catch (error) {
		console.error('Weather API error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return json({
			success: false,
			error: errorMessage
		}, { status: 500 });
	}
};