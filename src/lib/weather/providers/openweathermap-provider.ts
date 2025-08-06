import { BaseWeatherProvider } from '../base-provider';
import type { WeatherCondition, WeatherForecast, SearchResult } from '../types';

export class OpenWeatherMapProvider extends BaseWeatherProvider {
	name = 'OpenWeatherMap';
	id = 'openweathermap';
	private baseUrl = 'https://api.openweathermap.org/data/2.5';
	private geoUrl = 'https://api.openweathermap.org/geo/1.0';
	
	protected async onInitialize(): Promise<void> {
		// OpenWeatherMap doesn't require additional initialization
	}
	
	async getCurrentWeather(lat: number, lon: number): Promise<WeatherCondition> {
		const url = `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`OpenWeatherMap error: ${response.statusText}`);
		}
		
		const data = await response.json();
		return this.mapToWeatherCondition(data);
	}
	
	async getHourlyForecast(lat: number, lon: number, hours: number = 24): Promise<WeatherCondition[]> {
		// OpenWeatherMap 2.5 API provides 5-day forecast with 3-hour steps
		// For hourly data, we'd need the One Call API (requires subscription)
		const url = `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`OpenWeatherMap error: ${response.statusText}`);
		}
		
		const data = await response.json();
		const hourlyData: WeatherCondition[] = [];
		
		// Interpolate 3-hour data to approximate hourly
		for (let i = 0; i < data.list.length - 1 && hourlyData.length < hours; i++) {
			const current = data.list[i];
			const next = data.list[i + 1];
			
			// Add current data point
			hourlyData.push(this.mapToWeatherCondition(current));
			
			// Interpolate 2 hours between 3-hour points
			if (hourlyData.length < hours) {
				for (let j = 1; j <= 2 && hourlyData.length < hours; j++) {
					const ratio = j / 3;
					hourlyData.push(this.interpolateWeather(current, next, ratio));
				}
			}
		}
		
		return hourlyData.slice(0, hours);
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
		const url = `${this.geoUrl}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${this.apiKey}`;
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`OpenWeatherMap geocoding error: ${response.statusText}`);
		}
		
		const data = await response.json();
		
		return data.map((item: any) => ({
			name: item.name,
			lat: item.lat,
			lon: item.lon,
			country: item.country,
			region: item.state
		}));
	}
	
	private mapToWeatherCondition(data: any): WeatherCondition {
		const timestamp = data.dt ? new Date(data.dt * 1000) : new Date();
		
		return {
			temperature: data.main?.temp ?? 0,
			feelsLike: data.main?.feels_like ?? 0,
			humidity: data.main?.humidity ?? 0,
			windSpeed: (data.wind?.speed ?? 0) * 3.6, // Convert m/s to km/h
			windDirection: this.getWindDirection(data.wind?.deg ?? 0),
			windGust: (data.wind?.gust ?? data.wind?.speed ?? 0) * 3.6,
			precipitation: data.rain?.['3h'] ?? data.rain?.['1h'] ?? 0,
			rainChance: data.pop ? data.pop * 100 : 0,
			visibility: (data.visibility ?? 10000) / 1000,
			uvIndex: 0, // Not available in free tier
			pressure: data.main?.pressure ?? 1013,
			condition: data.weather?.[0]?.main ?? '',
			description: data.weather?.[0]?.description ?? '',
			icon: data.weather?.[0]?.icon ? `https://openweathermap.org/img/w/${data.weather[0].icon}.png` : undefined,
			isDay: data.weather?.[0]?.icon?.endsWith('d') ?? true,
			time: timestamp
		};
	}
	
	private interpolateWeather(current: any, next: any, ratio: number): WeatherCondition {
		const interpolate = (curr: number, nxt: number) => curr + (nxt - curr) * ratio;
		
		const currentTime = current.dt * 1000;
		const nextTime = next.dt * 1000;
		const interpTime = new Date(currentTime + (nextTime - currentTime) * ratio);
		
		return {
			temperature: interpolate(current.main.temp, next.main.temp),
			feelsLike: interpolate(current.main.feels_like, next.main.feels_like),
			humidity: Math.round(interpolate(current.main.humidity, next.main.humidity)),
			windSpeed: interpolate(current.wind.speed, next.wind.speed) * 3.6,
			windDirection: this.getWindDirection(interpolate(current.wind.deg ?? 0, next.wind.deg ?? 0)),
			windGust: interpolate(current.wind.gust ?? current.wind.speed, next.wind.gust ?? next.wind.speed) * 3.6,
			precipitation: interpolate(current.rain?.['3h'] ?? 0, next.rain?.['3h'] ?? 0) / 3,
			rainChance: interpolate((current.pop ?? 0) * 100, (next.pop ?? 0) * 100),
			visibility: interpolate(current.visibility ?? 10000, next.visibility ?? 10000) / 1000,
			uvIndex: 0,
			pressure: interpolate(current.main.pressure, next.main.pressure),
			condition: ratio < 0.5 ? current.weather?.[0]?.main : next.weather?.[0]?.main,
			description: ratio < 0.5 ? current.weather?.[0]?.description : next.weather?.[0]?.description,
			icon: ratio < 0.5 ? 
				(current.weather?.[0]?.icon ? `https://openweathermap.org/img/w/${current.weather[0].icon}.png` : undefined) :
				(next.weather?.[0]?.icon ? `https://openweathermap.org/img/w/${next.weather[0].icon}.png` : undefined),
			isDay: ratio < 0.5 ? current.weather?.[0]?.icon?.endsWith('d') : next.weather?.[0]?.icon?.endsWith('d'),
			time: interpTime
		};
	}
	
	protected getWindDirection(degrees: number): string {
		const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
						   'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
		const index = Math.round(degrees / 22.5) % 16;
		return directions[index];
	}
}