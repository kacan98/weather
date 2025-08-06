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
		const url = `${this.baseUrl}/weather/realtime?location=${lat},${lon}&apikey=${this.apiKey}`;
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`Tomorrow.io error: ${response.statusText}`);
		}
		
		const data = await response.json();
		return this.mapToWeatherCondition(data.data.values, new Date());
	}
	
	async getHourlyForecast(lat: number, lon: number, hours: number = 24): Promise<WeatherCondition[]> {
		const endTime = new Date();
		endTime.setHours(endTime.getHours() + hours);
		
		const url = `${this.baseUrl}/weather/forecast?location=${lat},${lon}&timesteps=1h&endTime=${endTime.toISOString()}&apikey=${this.apiKey}`;
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`Tomorrow.io error: ${response.statusText}`);
		}
		
		const data = await response.json();
		
		return data.timelines.hourly.slice(0, hours).map((hour: any) =>
			this.mapToWeatherCondition(hour.values, new Date(hour.time))
		);
	}
	
	async getForecast(lat: number, lon: number): Promise<WeatherForecast> {
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
	}
	
	async searchLocation(query: string): Promise<SearchResult[]> {
		// Tomorrow.io doesn't provide geocoding, return empty array
		// In practice, you'd use another service for geocoding
		return [];
	}
	
	private mapToWeatherCondition(data: any, timestamp: Date): WeatherCondition {
		return {
			temperature: data.temperature ?? 0,
			feelsLike: data.temperatureApparent ?? data.temperature ?? 0,
			humidity: data.humidity ?? 0,
			windSpeed: this.mpsToKmh(data.windSpeed ?? 0),
			windDirection: this.getWindDirection(data.windDirection ?? 0),
			precipitation: data.precipitationIntensity ?? 0,
			rainChance: data.precipitationProbability ?? 0,
			visibility: (data.visibility ?? 10) * 1000 / 1000, // Convert from miles to km
			uvIndex: data.uvIndex ?? 0,
			condition: this.mapWeatherCode(data.weatherCode ?? 0),
			timestamp
		};
	}
	
	private mapWeatherCode(code: number): string {
		const weatherCodes: Record<number, string> = {
			0: 'Unknown',
			1000: 'Clear, Sunny',
			1100: 'Mostly Clear',
			1101: 'Partly Cloudy',
			1102: 'Mostly Cloudy',
			1001: 'Cloudy',
			2000: 'Fog',
			2100: 'Light Fog',
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
		
		return weatherCodes[code] ?? 'Unknown';
	}
}