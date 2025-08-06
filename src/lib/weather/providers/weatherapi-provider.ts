import { BaseWeatherProvider } from '../base-provider';
import type { WeatherCondition, WeatherForecast, SearchResult } from '../types';

export class WeatherAPIProvider extends BaseWeatherProvider {
	name = 'WeatherAPI';
	id = 'weatherapi';
	private baseUrl = 'https://api.weatherapi.com/v1';
	
	protected async onInitialize(): Promise<void> {
		// WeatherAPI doesn't require additional initialization
	}
	
	async getCurrentWeather(lat: number, lon: number): Promise<WeatherCondition> {
		const url = `${this.baseUrl}/current.json?key=${this.apiKey}&q=${lat},${lon}&aqi=yes`;
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`WeatherAPI error: ${response.statusText}`);
		}
		
		const data = await response.json();
		return this.mapToWeatherCondition(data.current, new Date());
	}
	
	async getHourlyForecast(lat: number, lon: number, hours: number = 24): Promise<WeatherCondition[]> {
		const days = Math.ceil(hours / 24);
		const url = `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${lat},${lon}&days=${days}&aqi=yes&alerts=yes`;
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`WeatherAPI error: ${response.statusText}`);
		}
		
		const data = await response.json();
		const hourlyData: WeatherCondition[] = [];
		
		for (const day of data.forecast.forecastday) {
			for (const hour of day.hour) {
				hourlyData.push(this.mapToWeatherCondition(hour, new Date(hour.time)));
				if (hourlyData.length >= hours) break;
			}
			if (hourlyData.length >= hours) break;
		}
		
		return hourlyData.slice(0, hours);
	}
	
	async getForecast(lat: number, lon: number): Promise<WeatherForecast> {
		const url = `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${lat},${lon}&days=3&aqi=yes&alerts=yes`;
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`WeatherAPI error: ${response.statusText}`);
		}
		
		const data = await response.json();
		
		return {
			location: {
				name: data.location.name,
				lat: data.location.lat,
				lon: data.location.lon
			},
			current: this.mapToWeatherCondition(data.current, new Date()),
			hourly: await this.getHourlyForecast(lat, lon, 24),
			daily: data.forecast.forecastday.map((day: any) => 
				this.mapToWeatherCondition(day.day, new Date(day.date))
			)
		};
	}
	
	async searchLocation(query: string): Promise<SearchResult[]> {
		const url = `${this.baseUrl}/search.json?key=${this.apiKey}&q=${encodeURIComponent(query)}`;
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`WeatherAPI search error: ${response.statusText}`);
		}
		
		const data = await response.json();
		
		return data.map((item: any) => ({
			name: item.name,
			lat: item.lat,
			lon: item.lon,
			country: item.country,
			region: item.region
		}));
	}
	
	private mapToWeatherCondition(data: any, timestamp: Date): WeatherCondition {
		// Log data for debugging precipitation issues
		if (process.env.NODE_ENV === 'development') {
			console.log('WeatherAPI raw data sample:', {
				precip_mm: data.precip_mm,
				chance_of_rain: data.chance_of_rain,
				daily_chance_of_rain: data.daily_chance_of_rain,
				condition: data.condition?.text,
				humidity: data.humidity,
				availableFields: Object.keys(data)
			});
		}
		
		return {
			temperature: data.temp_c ?? data.avgtemp_c ?? 0,
			feelsLike: data.feelslike_c ?? data.temp_c ?? 0,
			humidity: data.humidity ?? 0,
			windSpeed: data.wind_kph ?? 0,
			windDirection: data.wind_dir ?? '',
			precipitation: data.precip_mm ?? 0,
			rainChance: data.chance_of_rain ?? data.daily_chance_of_rain ?? 0,
			visibility: data.vis_km ?? 10,
			uvIndex: data.uv ?? 0,
			condition: data.condition?.text ?? '',
			icon: data.condition?.icon,
			timestamp
		};
	}
}