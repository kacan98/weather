import type { WeatherProvider, WeatherCondition, WeatherForecast, SearchResult, WeatherProviderConfig } from './types';
import { WeatherAPIProvider } from './providers/weatherapi-provider';
import { OpenWeatherMapProvider } from './providers/openweathermap-provider';
import { TomorrowProvider } from './providers/tomorrow-provider';

export class WeatherService {
	private providers: Map<string, WeatherProvider> = new Map();
	private fallbackOrder: string[] = ['weatherapi', 'openweathermap', 'tomorrow'];
	
	constructor() {
		this.providers.set('weatherapi', new WeatherAPIProvider());
		this.providers.set('openweathermap', new OpenWeatherMapProvider());
		this.providers.set('tomorrow', new TomorrowProvider());
	}
	
	async initialize(configs: Record<string, WeatherProviderConfig>): Promise<void> {
		const initPromises = Array.from(this.providers.entries()).map(async ([id, provider]) => {
			const config = configs[id];
			if (config?.apiKey && config.enabled !== false) {
				try {
					await provider.initialize(config.apiKey);
					console.log(`Initialized ${provider.name} provider`);
				} catch (error) {
					console.warn(`Failed to initialize ${provider.name}:`, error);
					provider.available = false;
				}
			} else {
				provider.available = false;
			}
		});
		
		await Promise.all(initPromises);
		
		// Update fallback order based on priority
		this.fallbackOrder = Array.from(this.providers.entries())
			.filter(([id, provider]) => provider.available)
			.sort((a, b) => (configs[a[0]]?.priority ?? 0) - (configs[b[0]]?.priority ?? 0))
			.map(([id]) => id);
		
		console.log('Weather service fallback order:', this.fallbackOrder);
	}
	
	getProvider(id: string): WeatherProvider | undefined {
		return this.providers.get(id);
	}
	
	getAvailableProviders(): WeatherProvider[] {
		return Array.from(this.providers.values()).filter(provider => provider.available);
	}
	
	async getCurrentWeather(lat: number, lon: number, preferredProvider?: string): Promise<{
		data: WeatherCondition;
		provider: string;
		errors?: string[];
	}> {
		const errors: string[] = [];
		const order = preferredProvider 
			? [preferredProvider, ...this.fallbackOrder.filter(id => id !== preferredProvider)]
			: this.fallbackOrder;
		
		for (const providerId of order) {
			const provider = this.providers.get(providerId);
			if (!provider?.available) continue;
			
			try {
				const data = await provider.getCurrentWeather(lat, lon);
				return { data, provider: providerId, errors: errors.length > 0 ? errors : undefined };
			} catch (error) {
				const errorMsg = `${provider.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
				errors.push(errorMsg);
				console.warn(`Failed to get current weather from ${provider.name}:`, error);
			}
		}
		
		throw new Error(`All weather providers failed: ${errors.join(', ')}`);
	}
	
	async getHourlyForecast(lat: number, lon: number, hours: number = 24, preferredProvider?: string): Promise<{
		data: WeatherCondition[];
		provider: string;
		errors?: string[];
	}> {
		const errors: string[] = [];
		const order = preferredProvider 
			? [preferredProvider, ...this.fallbackOrder.filter(id => id !== preferredProvider)]
			: this.fallbackOrder;
		
		for (const providerId of order) {
			const provider = this.providers.get(providerId);
			if (!provider?.available) continue;
			
			try {
				const data = await provider.getHourlyForecast(lat, lon, hours);
				return { data, provider: providerId, errors: errors.length > 0 ? errors : undefined };
			} catch (error) {
				const errorMsg = `${provider.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
				errors.push(errorMsg);
				console.warn(`Failed to get hourly forecast from ${provider.name}:`, error);
			}
		}
		
		throw new Error(`All weather providers failed: ${errors.join(', ')}`);
	}
	
	async getForecast(lat: number, lon: number, preferredProvider?: string): Promise<{
		data: WeatherForecast;
		provider: string;
		errors?: string[];
	}> {
		const errors: string[] = [];
		const order = preferredProvider 
			? [preferredProvider, ...this.fallbackOrder.filter(id => id !== preferredProvider)]
			: this.fallbackOrder;
		
		for (const providerId of order) {
			const provider = this.providers.get(providerId);
			if (!provider?.available) continue;
			
			try {
				const data = await provider.getForecast(lat, lon);
				return { data, provider: providerId, errors: errors.length > 0 ? errors : undefined };
			} catch (error) {
				const errorMsg = `${provider.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
				errors.push(errorMsg);
				console.warn(`Failed to get forecast from ${provider.name}:`, error);
			}
		}
		
		throw new Error(`All weather providers failed: ${errors.join(', ')}`);
	}
	
	async searchLocation(query: string, preferredProvider?: string): Promise<{
		data: SearchResult[];
		provider: string;
		errors?: string[];
	}> {
		const errors: string[] = [];
		const order = preferredProvider 
			? [preferredProvider, ...this.fallbackOrder.filter(id => id !== preferredProvider)]
			: this.fallbackOrder;
		
		for (const providerId of order) {
			const provider = this.providers.get(providerId);
			if (!provider?.available) continue;
			
			try {
				const data = await provider.searchLocation(query);
				if (data.length > 0) {
					return { data, provider: providerId, errors: errors.length > 0 ? errors : undefined };
				}
			} catch (error) {
				const errorMsg = `${provider.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
				errors.push(errorMsg);
				console.warn(`Failed to search location from ${provider.name}:`, error);
			}
		}
		
		throw new Error(`All weather providers failed for location search: ${errors.join(', ')}`);
	}
	
	async compareProviders(lat: number, lon: number): Promise<{
		current: Record<string, WeatherCondition | null>;
		errors: Record<string, string>;
	}> {
		const current: Record<string, WeatherCondition | null> = {};
		const errors: Record<string, string> = {};
		
		const promises = Array.from(this.providers.entries())
			.filter(([_, provider]) => provider.available)
			.map(async ([id, provider]) => {
				try {
					current[id] = await provider.getCurrentWeather(lat, lon);
				} catch (error) {
					current[id] = null;
					errors[id] = error instanceof Error ? error.message : 'Unknown error';
				}
			});
		
		await Promise.all(promises);
		
		return { current, errors };
	}
}