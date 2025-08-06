import { json } from '@sveltejs/kit';
import { WEATHER_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';
import { WeatherService } from '$lib/weather/weather-service';

// Initialize weather service
const weatherService = new WeatherService();
let weatherServiceInitialized = false;

async function initializeWeatherService() {
	if (weatherServiceInitialized) return;
	
	const configs: any = {};
	
	if (WEATHER_API_KEY) {
		configs.weatherapi = { apiKey: WEATHER_API_KEY, priority: 1, enabled: true };
	}
	
	await weatherService.initialize(configs);
	weatherServiceInitialized = true;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { lat, lon } = await request.json();
		
		if (!lat || !lon) {
			return json({
				success: false,
				error: 'Latitude and longitude are required'
			}, { status: 400 });
		}
		
		// Initialize weather service
		await initializeWeatherService();
		
		const availableProviders = weatherService.getAvailableProviders();
		if (availableProviders.length === 0) {
			return json({
				success: false,
				error: 'No weather providers available'
			}, { status: 500 });
		}
		
		// Compare providers
		const comparisonData = await weatherService.compareProviders(lat, lon);
		
		return json({
			success: true,
			data: comparisonData
		});
		
	} catch (error) {
		console.error('Weather comparison API error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return json({
			success: false,
			error: errorMessage
		}, { status: 500 });
	}
};