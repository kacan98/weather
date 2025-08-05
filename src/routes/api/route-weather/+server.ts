import { json } from '@sveltejs/kit';
import { WEATHER_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

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
			icon: string;
			wind_kph: number;
			wind_dir: string;
			wind_degree: number;
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

function calculateBikeRating(weather: any): { score: number; factors: string[] } {
	let score = 10;
	const factors: string[] = [];

	// Temperature scoring
	if (weather.temp_c < 0) {
		score -= 3;
		factors.push('Very cold temperature');
	} else if (weather.temp_c < 5) {
		score -= 2;
		factors.push('Cold temperature');
	} else if (weather.temp_c > 30) {
		score -= 2;
		factors.push('Very hot temperature');
	} else if (weather.temp_c > 25) {
		score -= 1;
		factors.push('Hot temperature');
	}

	// Wind scoring
	if (weather.wind_kph > 30) {
		score -= 3;
		factors.push('Very strong wind');
	} else if (weather.wind_kph > 20) {
		score -= 2;
		factors.push('Strong wind');
	} else if (weather.wind_kph > 15) {
		score -= 1;
		factors.push('Moderate wind');
	}

	// Rain scoring
	if (weather.precip_mm > 2) {
		score -= 4;
		factors.push('Heavy rain');
	} else if (weather.precip_mm > 0.5) {
		score -= 2;
		factors.push('Light rain');
	} else if (weather.chance_of_rain > 70) {
		score -= 2;
		factors.push('High chance of rain');
	} else if (weather.chance_of_rain > 40) {
		score -= 1;
		factors.push('Moderate chance of rain');
	}

	// Visibility
	if (weather.visibility_km < 1) {
		score -= 3;
		factors.push('Very poor visibility');
	} else if (weather.visibility_km < 5) {
		score -= 1;
		factors.push('Poor visibility');
	}

	// UV (for daytime rides)
	if (weather.uv > 8) {
		factors.push('High UV - wear sunscreen');
	}

	// Good conditions
	if (weather.temp_c >= 15 && weather.temp_c <= 22 && weather.wind_kph < 10 && weather.chance_of_rain < 20) {
		factors.push('Perfect biking weather!');
	}

	return { score: Math.max(1, Math.min(10, score)), factors };
}

function generateRoutePoints(start: { lat: number; lng: number }, end: { lat: number; lng: number }, numPoints: number = 3): RouteWeatherPoint[] {
	const points: RouteWeatherPoint[] = [];
	
	// Always include start and end
	points.push({
		lat: start.lat,
		lng: start.lng,
		progress: 0,
		estimatedArrivalTime: ''
	});

	// Add intermediate points
	for (let i = 1; i < numPoints - 1; i++) {
		const progress = i / (numPoints - 1);
		points.push({
			lat: start.lat + (end.lat - start.lat) * progress,
			lng: start.lng + (end.lng - start.lng) * progress,
			progress,
			estimatedArrivalTime: ''
		});
	}

	points.push({
		lat: end.lat,
		lng: end.lng,
		progress: 1,
		estimatedArrivalTime: ''
	});

	return points;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { 
			start, 
			end, 
			departureIntervals = 8, 
			estimatedTravelTimeMinutes = 30 
		}: RouteWeatherRequest = await request.json();
		
		if (!WEATHER_API_KEY) {
			return json({
				success: false,
				error: 'Please set your WeatherAPI.com API key in environment variables'
			}, { status: 500 });
		}
		
		if (!start?.lat || !start?.lng || !end?.lat || !end?.lng) {
			return json({
				success: false,
				error: 'Start and end coordinates are required'
			}, { status: 400 });
		}
		
		console.log(`Fetching route weather from ${start.lat},${start.lng} to ${end.lat},${end.lng}`);
		
		// Generate points along the route
		const routePoints = generateRoutePoints(start, end, 3);
		
		// Get weather data for all route points
		const weatherPromises = routePoints.map(async (point) => {
			const weatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${point.lat},${point.lng}&days=1&aqi=no&alerts=no`;
			const response = await fetch(weatherUrl);
			
			if (!response.ok) {
				throw new Error(`Weather API error for point ${point.lat},${point.lng}: ${response.status}`);
			}
			
			return response.json();
		});
		
		const weatherDataArray = await Promise.all(weatherPromises);
		
		console.log(`Successfully fetched weather for ${weatherDataArray.length} points along the route`);
		
		// Calculate cycling distance
		const distance = calculateCyclingDistance(start, end);
		
		// Generate departure options
		const departureOptions: DepartureOption[] = [];
		const now = new Date();
		
		for (let i = 0; i < departureIntervals; i++) {
			const departureTime = new Date(now.getTime() + (i * 15 * 60 * 1000)); // 15 minutes intervals
			const arrivalTime = new Date(departureTime.getTime() + (estimatedTravelTimeMinutes * 60 * 1000));
			
			// Calculate weather along route points using actual weather data for each point
			const weatherAlongRoute = routePoints.map((point, index) => {
				// Calculate the time for this point based on travel progress
				const pointTime = new Date(departureTime.getTime() + (estimatedTravelTimeMinutes * 60 * 1000 * point.progress));
				const hourIndex = Math.min(23, Math.max(0, pointTime.getHours()));
				
				// Use the weather data for this specific point
				const weatherData = weatherDataArray[index];
				const todayForecast = weatherData.forecast.forecastday[0];
				const weather = todayForecast.hour[hourIndex];
				
				const bikeRating = calculateBikeRating(weather);
				
				return {
					location: {
						lat: point.lat,
						lng: point.lng,
						progress: point.progress
					},
					weather: {
						time: weather.time,
						temp_c: weather.temp_c,
						condition: weather.condition.text,
						icon: weather.condition.icon,
						wind_kph: weather.wind_kph,
						wind_dir: weather.wind_dir,
						wind_degree: weather.wind_degree,
						humidity: weather.humidity,
						precip_mm: weather.precip_mm,
						chance_of_rain: weather.chance_of_rain,
						feels_like_c: weather.feelslike_c,
						uv: weather.uv,
						visibility_km: weather.vis_km
					},
					bikeRating
				};
			});
			
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
				}
			});
		}
		
		const result = {
			route: {
				start: { lat: start.lat, lng: start.lng },
				end: { lat: end.lat, lng: end.lng },
				estimatedTravelTimeMinutes,
				distance: Math.round(distance * 10) / 10 // Round to 1 decimal place
			},
			location: {
				name: weatherDataArray[0].location.name, // Use start location name
				country: weatherDataArray[0].location.country,
				lat: weatherDataArray[0].location.lat,
				lng: weatherDataArray[0].location.lon
			},
			departureOptions
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
