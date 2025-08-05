import { json } from '@sveltejs/kit';
import { WEATHER_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

interface WeatherRequest {
	lat: number;
	lng: number;
	days?: number;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { lat, lng, days = 3 }: WeatherRequest = await request.json();
		
		if (!WEATHER_API_KEY) {
			return json({
				success: false,
				error: 'Please set your WeatherAPI.com API key in environment variables'
			}, { status: 500 });
		}
		
		console.log(`Fetching weather for coordinates: ${lat}, ${lng}`);
		
		// WeatherAPI.com endpoint for forecast with 15-minute intervals
		const weatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${lat},${lng}&days=${days}&aqi=no&alerts=yes`;
		
		const response = await fetch(weatherUrl);
		
		if (!response.ok) {
			const errorText = await response.text();
			console.error('WeatherAPI error:', response.status, errorText);
			return json({
				success: false,
				error: `WeatherAPI error: ${response.status} - ${errorText}`
			}, { status: response.status });
		}
		
		const weatherData = await response.json();
		
		// Transform the data for bike-friendly format
		const bikeWeatherData = {
			location: {
				name: weatherData.location.name,
				country: weatherData.location.country,
				lat: weatherData.location.lat,
				lng: weatherData.location.lon
			},
			current: {
				temp_c: weatherData.current.temp_c,
				condition: weatherData.current.condition.text,
				wind_kph: weatherData.current.wind_kph,
				wind_dir: weatherData.current.wind_dir,
				wind_degree: weatherData.current.wind_degree,
				humidity: weatherData.current.humidity,
				cloud: weatherData.current.cloud,
				feels_like_c: weatherData.current.feelslike_c,
				uv: weatherData.current.uv,
				visibility_km: weatherData.current.vis_km,
				pressure_mb: weatherData.current.pressure_mb,
				precip_mm: weatherData.current.precip_mm,
				icon: weatherData.current.condition.icon
			},
			forecast: weatherData.forecast.forecastday.map((day: any) => ({
				date: day.date,
				maxtemp_c: day.day.maxtemp_c,
				mintemp_c: day.day.mintemp_c,
				condition: day.day.condition.text,
				icon: day.day.condition.icon,
				maxwind_kph: day.day.maxwind_kph,
				totalprecip_mm: day.day.totalprecip_mm,
				avghumidity: day.day.avghumidity,
				daily_chance_of_rain: day.day.daily_chance_of_rain,
				uv: day.day.uv,
				// Hourly data for detailed planning
				hourly: day.hour.map((hour: any) => ({
					time: hour.time,
					temp_c: hour.temp_c,
					condition: hour.condition.text,
					icon: hour.condition.icon,
					wind_kph: hour.wind_kph,
					wind_dir: hour.wind_dir,
					wind_degree: hour.wind_degree,
					humidity: hour.humidity,
					cloud: hour.cloud,
					feels_like_c: hour.feelslike_c,
					precip_mm: hour.precip_mm,
					chance_of_rain: hour.chance_of_rain,
					uv: hour.uv,
					visibility_km: hour.vis_km
				}))
			}))
		};
		
		return json({
			success: true,
			data: bikeWeatherData
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