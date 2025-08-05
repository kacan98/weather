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
		
		console.log('Auth response status:', authResponse.status);
		console.log('Auth response headers:', Object.fromEntries(authResponse.headers.entries()));
		console.log('HTML length:', authHTML.length);
		console.log('HTML snippet:', authHTML.substring(0, 500));
		
		// Try multiple CSRF token patterns
		let csrfToken = null;
		
		// Pattern 1: name="_token" value="..."
		let csrfMatch = authHTML.match(/name="_token"\s+value="([^"]+)"/);
		if (csrfMatch) csrfToken = csrfMatch[1];
		
		// Pattern 2: meta name="csrf-token" content="..."
		if (!csrfToken) {
			csrfMatch = authHTML.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/);
			if (csrfMatch) csrfToken = csrfMatch[1];
		}
		
		// Pattern 3: window.Laravel = {"csrfToken":"..."}
		if (!csrfToken) {
			csrfMatch = authHTML.match(/window\.Laravel\s*=\s*{[^}]*"csrfToken"\s*:\s*"([^"]+)"/);
			if (csrfMatch) csrfToken = csrfMatch[1];
		}
		
		// Pattern 4: _token in script tags
		if (!csrfToken) {
			csrfMatch = authHTML.match(/"_token"\s*:\s*"([^"]+)"/);
			if (csrfMatch) csrfToken = csrfMatch[1];
		}
		
		console.log('Found CSRF token:', csrfToken);
		
		if (!csrfToken) {
			// Log more details for debugging
			console.log('Full HTML for debugging:', authHTML);
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