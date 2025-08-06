import { BaseWeatherProvider } from '../base-provider';
import type { WeatherCondition, WeatherForecast, SearchResult } from '../types';

export class TomorrowProvider extends BaseWeatherProvider {
	name = 'Tomorrow.io';
	id = 'tomorrow';
	private baseUrl = 'https://api.tomorrow.io/v4';
	
	protected async onInitialize(): Promise<void> {
		// Tomorrow.io doesn't require additional initialization
	}
	
	async getCurrentWeather(lat: number, lon: number): Promise<WeatherCondition> {
		// Tomorrow.io uses location parameter with lat,lon format
		const url = `${this.baseUrl}/weather/realtime?location=${lat},${lon}&apikey=${this.apiKey}&units=metric`;
		
		try {
			const response = await fetch(url);
			
			if (!response.ok) {
				const errorText = await response.text();
				console.error('Tomorrow.io realtime API error:', response.status, errorText);
				throw new Error(`Tomorrow.io error: ${response.status} ${response.statusText}`);
			}
			
			const data = await response.json();
			console.log('Tomorrow.io realtime response:', data);
			
			// The response structure is data.data.values
			if (!data.data || !data.data.values) {
				console.error('Unexpected Tomorrow.io realtime response structure:', data);
				throw new Error('Invalid response from Tomorrow.io');
			}
			
			return this.mapToWeatherCondition(data.data.values, data.data.time);
		} catch (error) {
			console.error('Tomorrow.io getCurrentWeather error:', error);
			throw error;
		}
	}
	
	async getHourlyForecast(lat: number, lon: number, hours: number = 24): Promise<WeatherCondition[]> {
		// For forecast, we use the timelines endpoint
		const now = new Date();
		const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
		
		// Build the fields parameter with all the fields we need
		const fields = [
			'temperature',
			'temperatureApparent',
			'humidity',
			'windSpeed',
			'windDirection',
			'windGust',
			'precipitationIntensity',
			'precipitationProbability',
			'weatherCode',
			'visibility',
			'uvIndex',
			'pressureSurfaceLevel'
		].join(',');
		
		const url = `${this.baseUrl}/timelines?location=${lat},${lon}&fields=${fields}&timesteps=1h&startTime=${now.toISOString()}&endTime=${endTime.toISOString()}&apikey=${this.apiKey}&units=metric`;
		
		try {
			const response = await fetch(url);
			
			if (!response.ok) {
				const errorText = await response.text();
				console.error('Tomorrow.io timelines API error:', response.status, errorText);
				throw new Error(`Tomorrow.io error: ${response.status} ${response.statusText}`);
			}
			
			const data = await response.json();
			console.log('Tomorrow.io timelines response:', data);
			
			// The response structure is data.data.timelines[0].intervals
			const timeline = data.data?.timelines?.[0];
			if (!timeline || !timeline.intervals) {
				console.error('Unexpected Tomorrow.io timelines response structure:', data);
				return [];
			}
			
			return timeline.intervals.slice(0, hours).map((interval: any) => {
				const time = interval.startTime || new Date().toISOString();
				const values = interval.values || {};
				return this.mapToWeatherCondition(values, time);
			});
		} catch (error) {
			console.error('Tomorrow.io getHourlyForecast error:', error);
			throw error;
		}
	}
	
	async getForecast(lat: number, lon: number): Promise<WeatherForecast> {
		try {
			const [current, hourly] = await Promise.all([
				this.getCurrentWeather(lat, lon),
				this.getHourlyForecast(lat, lon, 24)
			]);
			
			return {
				location: {
					name: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
					lat,
					lon
				},
				current,
				hourly
			};
		} catch (error) {
			console.error('Tomorrow.io getForecast error:', error);
			throw error;
		}
	}
	
	async searchLocation(query: string): Promise<SearchResult[]> {
		// Tomorrow.io doesn't provide geocoding, return empty array
		// In practice, you'd use another service for geocoding
		return [];
	}
	
	private mapToWeatherCondition(data: any, timeString: string | undefined): WeatherCondition {
		// Safely parse the time
		let validTime: Date;
		try {
			validTime = timeString ? new Date(timeString) : new Date();
			if (isNaN(validTime.getTime())) {
				validTime = new Date();
			}
		} catch {
			validTime = new Date();
		}
		
		// Map Tomorrow.io fields to our WeatherCondition interface
		return {
			temperature: data.temperature ?? 0,
			feelsLike: data.temperatureApparent ?? data.temperature ?? 0,
			humidity: data.humidity ?? 0,
			windSpeed: (data.windSpeed ?? 0) * 3.6, // Convert m/s to km/h
			windDirection: data.windDirection ? this.getWindDirection(data.windDirection) : 'N',
			windGust: ((data.windGust ?? data.windSpeed ?? 0) * 3.6),
			precipitation: data.precipitationIntensity ?? 0,
			rainChance: data.precipitationProbability ?? 0,
			visibility: data.visibility ?? 10, // Already in km
			uvIndex: data.uvIndex ?? 0,
			pressure: data.pressureSurfaceLevel ?? 1013,
			condition: this.mapWeatherCode(data.weatherCode ?? 0),
			description: this.mapWeatherCode(data.weatherCode ?? 0),
			icon: undefined, // Tomorrow.io doesn't provide icon URLs directly
			isDay: true, // Would need to calculate based on sunrise/sunset
			time: validTime
		};
	}
	
	private mapWeatherCode(code: number): string {
		// Tomorrow.io weather codes
		// https://docs.tomorrow.io/reference/weather-codes
		const weatherCodes: Record<number, string> = {
			0: 'Unknown',
			1000: 'Clear',
			1001: 'Cloudy',
			1100: 'Mostly Clear',
			1101: 'Partly Cloudy',
			1102: 'Mostly Cloudy',
			2000: 'Fog',
			2100: 'Light Fog',
			3000: 'Light Wind',
			3001: 'Wind',
			3002: 'Strong Wind',
			4000: 'Drizzle',
			4001: 'Rain',
			4200: 'Light Rain',
			4201: 'Heavy Rain',
			5000: 'Snow',
			5001: 'Flurries',
			5100: 'Light Snow',
			5101: 'Heavy Snow',
			6000: 'Freezing Drizzle',
			6001: 'Freezing Rain',
			6200: 'Light Freezing Rain',
			6201: 'Heavy Freezing Rain',
			7000: 'Ice Pellets',
			7101: 'Heavy Ice Pellets',
			7102: 'Light Ice Pellets',
			8000: 'Thunderstorm'
		};
		
		return weatherCodes[code] || 'Unknown';
	}
}