import { json } from '@sveltejs/kit';
import { WEATHER_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { lat, lon } = await request.json();
		
		if (!WEATHER_API_KEY) {
			return json({ error: 'No API key configured' }, { status: 500 });
		}
		
		if (!lat || !lon) {
			return json({ error: 'Lat/lon required' }, { status: 400 });
		}
		
		// Test all WeatherAPI endpoints
		const baseUrl = 'https://api.weatherapi.com/v1';
		
		const [currentRes, forecastRes, historyRes] = await Promise.allSettled([
			// Current weather
			fetch(`${baseUrl}/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&aqi=yes`),
			
			// Forecast (let's try with more options)
			fetch(`${baseUrl}/forecast.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&days=3&aqi=yes&alerts=yes`),
			
			// History (yesterday for comparison)
			fetch(`${baseUrl}/history.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&dt=${new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0]}`)
		]);
		
		const results: any = {};
		
		if (currentRes.status === 'fulfilled' && currentRes.value.ok) {
			results.current = await currentRes.value.json();
		} else {
			results.current = { error: 'Failed to fetch current weather' };
		}
		
		if (forecastRes.status === 'fulfilled' && forecastRes.value.ok) {
			results.forecast = await forecastRes.value.json();
		} else {
			results.forecast = { error: 'Failed to fetch forecast' };
		}
		
		if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
			results.history = await historyRes.value.json();
		} else {
			results.history = { error: 'Failed to fetch history (may require paid plan)' };
		}
		
		// Let's also check what fields are available in each response
		results.fieldAnalysis = {
			currentFields: results.current.current ? Object.keys(results.current.current) : [],
			forecastHourFields: results.forecast.forecast?.forecastday?.[0]?.hour?.[0] ? Object.keys(results.forecast.forecast.forecastday[0].hour[0]) : [],
			forecastDayFields: results.forecast.forecast?.forecastday?.[0]?.day ? Object.keys(results.forecast.forecast.forecastday[0].day) : []
		};
		
		return json({
			success: true,
			data: results,
			timestamp: new Date().toISOString(),
			location: { lat, lon }
		});
		
	} catch (error) {
		console.error('Debug weather API error:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};