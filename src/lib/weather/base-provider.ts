import type { WeatherProvider, WeatherCondition, WeatherForecast, SearchResult } from './types';

export abstract class BaseWeatherProvider implements WeatherProvider {
	abstract name: string;
	abstract id: string;
	available: boolean = false;
	protected apiKey: string = '';
	
	async initialize(apiKey: string): Promise<void> {
		this.apiKey = apiKey;
		this.available = !!apiKey;
		await this.onInitialize();
	}
	
	protected abstract onInitialize(): Promise<void>;
	
	abstract getCurrentWeather(lat: number, lon: number): Promise<WeatherCondition>;
	abstract getHourlyForecast(lat: number, lon: number, hours?: number): Promise<WeatherCondition[]>;
	abstract getForecast(lat: number, lon: number): Promise<WeatherForecast>;
	abstract searchLocation(query: string): Promise<SearchResult[]>;
	
	protected kelvinToCelsius(kelvin: number): number {
		return kelvin - 273.15;
	}
	
	protected mpsToKmh(mps: number): number {
		return mps * 3.6;
	}
	
	protected getWindDirection(degrees: number): string {
		const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
						   'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
		const index = Math.round(degrees / 22.5) % 16;
		return directions[index];
	}
}