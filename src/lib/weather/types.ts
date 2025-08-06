export interface WeatherCondition {
	temperature: number;
	feelsLike: number;
	humidity: number;
	windSpeed: number;
	windDirection: string;
	precipitation: number;
	rainChance: number;
	visibility: number;
	uvIndex: number;
	condition: string;
	icon?: string;
	timestamp: Date;
}

export interface WeatherForecast {
	location: {
		name: string;
		lat: number;
		lon: number;
	};
	current?: WeatherCondition;
	hourly: WeatherCondition[];
	daily?: WeatherCondition[];
}

export interface WeatherProvider {
	name: string;
	id: string;
	available: boolean;
	
	initialize(apiKey: string): Promise<void>;
	getCurrentWeather(lat: number, lon: number): Promise<WeatherCondition>;
	getHourlyForecast(lat: number, lon: number, hours?: number): Promise<WeatherCondition[]>;
	getForecast(lat: number, lon: number): Promise<WeatherForecast>;
	searchLocation(query: string): Promise<SearchResult[]>;
}

export interface SearchResult {
	name: string;
	lat: number;
	lon: number;
	country?: string;
	region?: string;
}

export interface WeatherProviderConfig {
	apiKey: string;
	priority?: number;
	enabled?: boolean;
}