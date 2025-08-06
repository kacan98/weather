import { json } from '@sveltejs/kit';
import { WEATHER_API_KEY, OPENWEATHERMAP_API_KEY, TOMORROW_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';
import { WeatherService } from '$lib/weather/weather-service';
import type { WeatherCondition } from '$lib/weather/types';

interface RouteWeatherRequest {
	start: {
		lat: number;
		lng: number;
	};
	end: {
		lat: number;
		lng: number;
	};
	departureIntervals?: number; // How many 15-minute intervals to show (default: 8 = 2 hours)
	estimatedTravelTimeMinutes?: number; // Estimated travel time in minutes (default: 30)
	preferredProvider?: string; // Weather provider preference
}

interface RouteWeatherPoint {
	lat: number;
	lng: number;
	progress: number; // 0 to 1, how far along the route
	estimatedArrivalTime: string; // ISO string
}

interface DepartureOption {
	departureTime: string;
	arrivalTime: string;
	weatherAlongRoute: Array<{
		location: {
			lat: number;
			lng: number;
			progress: number;
		};
		weather: {
			time: string;
			temp_c: number;
			condition: string;
			icon?: string;
			wind_kph: number;
			wind_dir: string;
			wind_degree?: number;
			humidity: number;
			precip_mm: number;
			chance_of_rain: number;
			feels_like_c: number;
			uv: number;
			visibility_km: number;
		};
		bikeRating: {
			score: number; // 1-10, 10 being perfect biking weather
			factors: string[];
		};
	}>;
	overallBikeRating: {
		score: number;
		summary: string;
		alerts: string[];
	};
	provider?: string; // Which provider was used
}

// Initialize weather service
const weatherService = new WeatherService();
let weatherServiceInitialized = false;

async function initializeWeatherService() {
	if (weatherServiceInitialized) return;
	
	const configs: any = {};
	
	if (WEATHER_API_KEY) {
		configs.weatherapi = { apiKey: WEATHER_API_KEY, priority: 1, enabled: true };
	}
	
	if (OPENWEATHERMAP_API_KEY) {
		configs.openweathermap = { apiKey: OPENWEATHERMAP_API_KEY, priority: 2, enabled: true };
	}
	
	if (TOMORROW_API_KEY) {
		configs.tomorrow = { apiKey: TOMORROW_API_KEY, priority: 3, enabled: true };
	}
	
	await weatherService.initialize(configs);
	weatherServiceInitialized = true;
}

function calculateCyclingDistance(start: { lat: number; lng: number }, end: { lat: number; lng: number }): number {
	// Haversine formula for great-circle distance
	const R = 6371; // Earth's radius in km
	const dLat = (end.lat - start.lat) * Math.PI / 180;
	const dLng = (end.lng - start.lng) * Math.PI / 180;
	const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
			Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) *
			Math.sin(dLng/2) * Math.sin(dLng/2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	const distance = R * c;
	
	// Add 15% for actual cycling routes (accounting for roads, paths, detours)
	return distance * 1.15;
}

function calculateBikeRating(weather: WeatherCondition): { score: number; factors: string[] } {
	let score = 10;
	const factors: string[] = [];

	// Temperature scoring
	if (weather.temperature < -5) {
		score -= 4;
		factors.push('Dangerously cold');
	} else if (weather.temperature < 0) {
		score -= 3;
		factors.push('Very cold temperature');
	} else if (weather.temperature < 5) {
		score -= 2;
		factors.push('Cold temperature');
	} else if (weather.temperature < 10) {
		score -= 1;
		factors.push('Cool temperature');
	} else if (weather.temperature > 35) {
		score -= 3;
		factors.push('Dangerously hot');
	} else if (weather.temperature > 30) {
		score -= 2;
		factors.push('Very hot temperature');
	} else if (weather.temperature > 25) {
		score -= 1;
		factors.push('Hot temperature');
	}

	// Wind scoring
	if (weather.windSpeed > 40) {
		score -= 4;
		factors.push('Dangerous wind speeds');
	} else if (weather.windSpeed > 30) {
		score -= 3;
		factors.push('Very strong wind');
	} else if (weather.windSpeed > 20) {
		score -= 2;
		factors.push('Strong wind');
	} else if (weather.windSpeed > 15) {
		score -= 1;
		factors.push('Moderate wind');
	}

	// Rain and precipitation - combined scoring
	const conditionText = weather.condition.toLowerCase();
	const isSnowing = conditionText.includes('snow') || 
					  conditionText.includes('sleet') || 
					  conditionText.includes('blizzard');

	if (isSnowing) {
		score -= 5;
		factors.push('Snow/sleet conditions');
	} else {
		// Calculate a combined rain impact score based on both precipitation and probability
		// Actual precipitation is weighted more heavily than probability
		let rainImpact = 0;
		
		// Precipitation amount scoring (weight: 70%)
		if (weather.precipitation > 5) {
			rainImpact += 4;
			factors.push('Heavy rain (>5mm)');
		} else if (weather.precipitation > 2) {
			rainImpact += 3;
			factors.push('Moderate rain (2-5mm)');
		} else if (weather.precipitation > 0.5) {
			rainImpact += 2;
			factors.push('Light rain (0.5-2mm)');
		} else if (weather.precipitation > 0.1) {
			rainImpact += 1;
			factors.push('Drizzle (<0.5mm)');
		}
		
		// Rain probability scoring (weight: 30%)
		// Only matters if there's no actual precipitation yet
		if (weather.precipitation <= 0.1) {
			if (weather.rainChance > 80) {
				rainImpact += 1.5;
				factors.push('Very high rain probability');
			} else if (weather.rainChance > 60) {
				rainImpact += 1;
				factors.push('High rain probability');
			} else if (weather.rainChance > 40) {
				rainImpact += 0.5;
				factors.push('Moderate rain probability');
			}
		}
		
		// Apply the combined rain impact
		score -= Math.min(rainImpact, 4); // Cap at -4 to avoid over-penalizing
	}

	// Visibility
	if (weather.visibility < 0.5) {
		score -= 4;
		factors.push('Dangerous visibility');
	} else if (weather.visibility < 1) {
		score -= 3;
		factors.push('Very poor visibility');
	} else if (weather.visibility < 5) {
		score -= 1;
		factors.push('Reduced visibility');
	}

	// UV
	if (weather.uvIndex >= 11) {
		factors.push('Extreme UV - avoid if possible');
		score -= 0.5;
	} else if (weather.uvIndex >= 8) {
		factors.push('Very high UV - wear sunscreen');
	} else if (weather.uvIndex >= 6) {
		factors.push('High UV - sun protection recommended');
	}

	// Perfect conditions bonus
	if (weather.temperature >= 15 && weather.temperature <= 24 && 
		weather.windSpeed < 10 && 
		weather.rainChance < 10 && 
		weather.precipitation === 0) {
		score += 1;
		factors.push('Excellent biking weather!');
	}

	return { score: Math.max(1, Math.min(10, score)), factors };
}

async function generateRoutePoints(start: { lat: number; lng: number }, end: { lat: number; lng: number }): Promise<RouteWeatherPoint[]> {
	try {
		// Try to get actual bike route
		const routeResponse = await fetch('http://localhost:5173/api/bike-route', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ start, end })
		});
		
		if (routeResponse.ok) {
			const routeData = await routeResponse.json();
			if (routeData.success) {
				console.log(`Using actual bike route with ${routeData.routePoints.length} points`);
				return routeData.routePoints.map((point: any) => ({
					lat: point.lat,
					lng: point.lng,
					progress: point.progress,
					estimatedArrivalTime: ''
				}));
			}
		}
	} catch (error) {
		console.warn('Failed to fetch bike route, falling back to straight line:', error);
	}
	
	// Fallback to straight line route
	console.log('Using fallback straight-line route');
	const points: RouteWeatherPoint[] = [];
	const numPoints = 5;
	
	for (let i = 0; i < numPoints; i++) {
		const progress = i / (numPoints - 1);
		points.push({
			lat: start.lat + (end.lat - start.lat) * progress,
			lng: start.lng + (end.lng - start.lng) * progress,
			progress,
			estimatedArrivalTime: ''
		});
	}
	
	return points;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { 
			start, 
			end, 
			departureIntervals = 8, 
			estimatedTravelTimeMinutes = 30,
			preferredProvider
		}: RouteWeatherRequest = await request.json();
		
		// Initialize weather service
		await initializeWeatherService();
		
		const availableProviders = weatherService.getAvailableProviders();
		if (availableProviders.length === 0) {
			return json({
				success: false,
				error: 'No weather providers available. Please configure API keys.'
			}, { status: 500 });
		}
		
		if (!start?.lat || !start?.lng || !end?.lat || !end?.lng) {
			return json({
				success: false,
				error: 'Start and end coordinates are required'
			}, { status: 400 });
		}
		
		console.log(`Fetching route weather from ${start.lat},${start.lng} to ${end.lat},${end.lng}`);
		console.log(`Available providers: ${availableProviders.map(p => p.name).join(', ')}`);
		
		// Generate points along the route
		const routePoints = await generateRoutePoints(start, end);
		
		// Calculate cycling distance
		const distance = calculateCyclingDistance(start, end);
		
		// Generate departure options
		const departureOptions: DepartureOption[] = [];
		const now = new Date();
		let usedProvider = '';
		
		for (let i = 0; i < departureIntervals; i++) {
			const departureTime = new Date(now.getTime() + (i * 15 * 60 * 1000)); // 15 minutes intervals
			const arrivalTime = new Date(departureTime.getTime() + (estimatedTravelTimeMinutes * 60 * 1000));
			
			// Get weather data for all route points
			const weatherPromises = routePoints.map(async (point) => {
				const pointTime = new Date(departureTime.getTime() + (estimatedTravelTimeMinutes * 60 * 1000 * point.progress));
				
				try {
					// Get hourly forecast and find the closest hour
					const { data: hourlyForecast, provider } = await weatherService.getHourlyForecast(
						point.lat, 
						point.lng, 
						Math.max(24, Math.ceil((pointTime.getTime() - now.getTime()) / (1000 * 60 * 60)) + 1),
						preferredProvider
					);
					
					usedProvider = provider;
					
					// Find the closest weather data point to our desired time
					let closestWeather = hourlyForecast[0];
					let minTimeDiff = Math.abs((hourlyForecast[0].time || hourlyForecast[0].timestamp!).getTime() - pointTime.getTime());
					
					for (const weather of hourlyForecast) {
						const timeDiff = Math.abs((weather.time || weather.timestamp!).getTime() - pointTime.getTime());
						if (timeDiff < minTimeDiff) {
							minTimeDiff = timeDiff;
							closestWeather = weather;
						}
					}
					
					const bikeRating = calculateBikeRating(closestWeather);
					
					return {
						location: {
							lat: point.lat,
							lng: point.lng,
							progress: point.progress
						},
						weather: {
							time: (closestWeather.time || closestWeather.timestamp!).toISOString(),
							temp_c: closestWeather.temperature,
							condition: closestWeather.condition,
							icon: closestWeather.icon,
							wind_kph: closestWeather.windSpeed,
							wind_dir: closestWeather.windDirection,
							humidity: closestWeather.humidity,
							precip_mm: closestWeather.precipitation,
							chance_of_rain: closestWeather.rainChance,
							feels_like_c: closestWeather.feelsLike,
							uv: closestWeather.uvIndex,
							visibility_km: closestWeather.visibility
						},
						bikeRating
					};
				} catch (error) {
					console.error(`Failed to get weather for point ${point.lat},${point.lng}:`, error);
					throw error;
				}
			});
			
			const weatherAlongRoute = await Promise.all(weatherPromises);
			
			// Calculate overall rating for this departure time
			const avgScore = weatherAlongRoute.reduce((sum, point) => sum + point.bikeRating.score, 0) / weatherAlongRoute.length;
			const allFactors = weatherAlongRoute.flatMap(point => point.bikeRating.factors);
			const uniqueFactors = [...new Set(allFactors)];
			
			let summary = '';
			const alerts: string[] = [];
			
			if (avgScore >= 8) {
				summary = 'Excellent biking conditions';
			} else if (avgScore >= 6) {
				summary = 'Good biking conditions';
			} else if (avgScore >= 4) {
				summary = 'Fair biking conditions - be prepared';
			} else {
				summary = 'Challenging biking conditions';
			}
			
			// Add specific alerts
			if (weatherAlongRoute.some(p => p.weather.precip_mm > 1)) {
				alerts.push('⚠️ Rain expected - bring rain gear');
			}
			if (weatherAlongRoute.some(p => p.weather.wind_kph > 25)) {
				alerts.push('💨 Strong winds - ride carefully');
			}
			if (weatherAlongRoute.some(p => p.weather.temp_c < 5)) {
				alerts.push('🥶 Cold weather - dress warmly');
			}
			if (weatherAlongRoute.some(p => p.weather.temp_c > 28)) {
				alerts.push('☀️ Hot weather - stay hydrated');
			}
			if (weatherAlongRoute.some(p => p.weather.uv > 7)) {
				alerts.push('🧴 High UV - wear sunscreen');
			}
			
			departureOptions.push({
				departureTime: departureTime.toISOString(),
				arrivalTime: arrivalTime.toISOString(),
				weatherAlongRoute,
				overallBikeRating: {
					score: Math.round(avgScore * 10) / 10,
					summary,
					alerts
				},
				provider: usedProvider
			});
		}
		
		const result = {
			route: {
				start: { lat: start.lat, lng: start.lng },
				end: { lat: end.lat, lng: end.lng },
				estimatedTravelTimeMinutes,
				distance: Math.round(distance * 10) / 10
			},
			location: {
				name: `${start.lat.toFixed(2)}, ${start.lng.toFixed(2)}`,
				lat: start.lat,
				lng: start.lng
			},
			departureOptions,
			provider: usedProvider,
			availableProviders: availableProviders.map(p => ({ id: p.id, name: p.name }))
		};
		
		return json({
			success: true,
			data: result
		});
		
	} catch (error) {
		console.error('Route weather API error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return json({
			success: false,
			error: errorMessage
		}, { status: 500 });
	}
};