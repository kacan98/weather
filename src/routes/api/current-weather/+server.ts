import { json } from '@sveltejs/kit';
import { WEATHER_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

interface CurrentWeatherRequest {
	lat: number;
	lng: number;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { lat, lng }: CurrentWeatherRequest = await request.json();
		
		if (!WEATHER_API_KEY) {
			return json({
				success: false,
				error: 'Weather API key not configured'
			}, { status: 500 });
		}
		
		if (!lat || !lng) {
			return json({
				success: false,
				error: 'Latitude and longitude are required'
			}, { status: 400 });
		}
		
		// Fetch current weather with real-time data
		const weatherUrl = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lng}&aqi=yes`;
		const response = await fetch(weatherUrl);
		
		if (!response.ok) {
			const errorText = await response.text();
			console.error('Weather API error:', response.status, errorText);
			throw new Error(`Weather API error: ${response.status}`);
		}
		
		const data = await response.json();
		
		// Add rain detection based on current conditions
		const isRaining = data.current.precip_mm > 0 || 
						 data.current.condition.text.toLowerCase().includes('rain') ||
						 data.current.condition.text.toLowerCase().includes('drizzle') ||
						 data.current.condition.text.toLowerCase().includes('shower');
		
		return json({
			success: true,
			data: {
				location: {
					name: data.location.name,
					region: data.location.region,
					country: data.location.country,
					lat: data.location.lat,
					lon: data.location.lon,
					localtime: data.location.localtime,
					timezone: data.location.tz_id
				},
				current: {
					last_updated: data.current.last_updated,
					temp_c: data.current.temp_c,
					temp_f: data.current.temp_f,
					feels_like_c: data.current.feelslike_c,
					feels_like_f: data.current.feelslike_f,
					condition: {
						text: data.current.condition.text,
						icon: data.current.condition.icon,
						code: data.current.condition.code
					},
					wind_kph: data.current.wind_kph,
					wind_mph: data.current.wind_mph,
					wind_dir: data.current.wind_dir,
					wind_degree: data.current.wind_degree,
					pressure_mb: data.current.pressure_mb,
					precip_mm: data.current.precip_mm,
					precip_in: data.current.precip_in,
					humidity: data.current.humidity,
					cloud: data.current.cloud,
					visibility_km: data.current.vis_km,
					visibility_miles: data.current.vis_miles,
					uv: data.current.uv,
					gust_kph: data.current.gust_kph,
					gust_mph: data.current.gust_mph,
					is_raining: isRaining,
					air_quality: data.current.air_quality || null
				}
			}
		});
		
	} catch (error) {
		console.error('Current weather API error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return json({
			success: false,
			error: errorMessage
		}, { status: 500 });
	}
};