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

	// Temperature scoring (improved ranges)
	if (weather.temp_c < -5) {
		score -= 4;
		factors.push('Dangerously cold');
	} else if (weather.temp_c < 0) {
		score -= 3;
		factors.push('Very cold temperature');
	} else if (weather.temp_c < 5) {
		score -= 2;
		factors.push('Cold temperature');
	} else if (weather.temp_c < 10) {
		score -= 1;
		factors.push('Cool temperature');
	} else if (weather.temp_c > 35) {
		score -= 3;
		factors.push('Dangerously hot');
	} else if (weather.temp_c > 30) {
		score -= 2;
		factors.push('Very hot temperature');
	} else if (weather.temp_c > 25) {
		score -= 1;
		factors.push('Hot temperature');
	}

	// Wind scoring (consider gusts too if available)
	const effectiveWind = weather.gust_kph || weather.wind_kph;
	if (effectiveWind > 40) {
		score -= 4;
		factors.push('Dangerous wind speeds');
	} else if (effectiveWind > 30) {
		score -= 3;
		factors.push('Very strong wind');
	} else if (effectiveWind > 20) {
		score -= 2;
		factors.push('Strong wind');
	} else if (effectiveWind > 15) {
		score -= 1;
		factors.push('Moderate wind');
	}

	// Improved rain detection - check both precipitation and condition text
	const conditionText = (weather.condition?.text || '').toLowerCase();
	const isRaining = weather.precip_mm > 0 || 
					  conditionText.includes('rain') || 
					  conditionText.includes('drizzle') || 
					  conditionText.includes('shower') ||
					  conditionText.includes('thunderstorm');
	
	const isSnowing = conditionText.includes('snow') || 
					  conditionText.includes('sleet') || 
					  conditionText.includes('blizzard');

	if (isSnowing) {
		score -= 5;
		factors.push('Snow/sleet conditions');
	} else if (weather.precip_mm > 5 || conditionText.includes('heavy rain')) {
		score -= 4;
		factors.push('Heavy rain');
	} else if (weather.precip_mm > 2 || conditionText.includes('moderate rain')) {
		score -= 3;
		factors.push('Moderate rain');
	} else if (weather.precip_mm > 0.5 || isRaining) {
		score -= 2;
		factors.push('Light rain');
	} else if (weather.chance_of_rain > 80) {
		score -= 2;
		factors.push('Very high chance of rain');
	} else if (weather.chance_of_rain > 60) {
		score -= 1;
		factors.push('High chance of rain');
	} else if (weather.chance_of_rain > 40) {
		score -= 0.5;
		factors.push('Moderate chance of rain');
	}

	// Visibility (adjusted thresholds)
	if (weather.vis_km !== undefined && weather.vis_km < 0.5) {
		score -= 4;
		factors.push('Dangerous visibility');
	} else if (weather.vis_km !== undefined && weather.vis_km < 1) {
		score -= 3;
		factors.push('Very poor visibility');
	} else if (weather.vis_km !== undefined && weather.vis_km < 5) {
		score -= 1;
		factors.push('Reduced visibility');
	}

	// UV (for daytime rides)
	if (weather.uv >= 11) {
		factors.push('Extreme UV - avoid if possible');
		score -= 0.5;
	} else if (weather.uv >= 8) {
		factors.push('Very high UV - wear sunscreen');
	} else if (weather.uv >= 6) {
		factors.push('High UV - sun protection recommended');
	}

	// Perfect conditions bonus
	if (weather.temp_c >= 15 && weather.temp_c <= 24 && 
		effectiveWind < 10 && 
		weather.chance_of_rain < 10 && 
		weather.precip_mm === 0) {
		score += 1; // Bonus point for perfect conditions
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
		const routePoints = await generateRoutePoints(start, end);
		
		// Determine how many days of forecast we need
		const currentTime = new Date();
		const lastDepartureTime = new Date(currentTime.getTime() + ((departureIntervals - 1) * 15 * 60 * 1000));
		const lastArrivalTime = new Date(lastDepartureTime.getTime() + (estimatedTravelTimeMinutes * 60 * 1000));
		
		// Calculate days needed (WeatherAPI needs at least 1, max 14)
		const hoursNeeded = Math.ceil((lastArrivalTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60));
		const daysNeeded = Math.min(14, Math.max(1, Math.ceil(hoursNeeded / 24)));
		
		console.log(`Fetching ${daysNeeded} days of forecast data for ${hoursNeeded} hours ahead`);
		
		// Get weather data for all route points with correct number of days
		const weatherPromises = routePoints.map(async (point) => {
			const weatherUrl = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${point.lat},${point.lng}&days=${daysNeeded}&aqi=no&alerts=yes`;
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
				
				// Use the weather data for this specific point
				const weatherData = weatherDataArray[index];
				
				// Find the correct forecast day and hour
				let weather = null;
				let foundWeather = false;
				
				// Search through forecast days to find the matching time
				for (const forecastDay of weatherData.forecast.forecastday) {
					// Parse the forecast date
					const forecastDate = new Date(forecastDay.date);
					
					// Check if our point time falls on this forecast day
					if (pointTime.toDateString() === forecastDate.toDateString()) {
						// Get the hour index for this day
						const hourIndex = Math.min(23, Math.max(0, pointTime.getHours()));
						weather = forecastDay.hour[hourIndex];
						foundWeather = true;
						break;
					}
				}
				
				// Fallback to current conditions if we can't find forecast data
				if (!foundWeather) {
					console.warn(`Could not find forecast for ${pointTime.toISOString()}, using current conditions`);
					// Use current conditions as fallback
					weather = {
						time: weatherData.current.last_updated,
						temp_c: weatherData.current.temp_c,
						condition: weatherData.current.condition,
						wind_kph: weatherData.current.wind_kph,
						wind_dir: weatherData.current.wind_dir,
						wind_degree: weatherData.current.wind_degree,
						humidity: weatherData.current.humidity,
						precip_mm: weatherData.current.precip_mm,
						chance_of_rain: 0, // Current doesn't have this
						feelslike_c: weatherData.current.feelslike_c,
						uv: weatherData.current.uv,
						vis_km: weatherData.current.vis_km,
						gust_kph: weatherData.current.gust_kph
					};
				}
				
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
						condition: weather.condition?.text || weather.condition,
						icon: weather.condition?.icon || '',
						wind_kph: weather.wind_kph,
						wind_dir: weather.wind_dir,
						wind_degree: weather.wind_degree,
						humidity: weather.humidity,
						precip_mm: weather.precip_mm,
						chance_of_rain: weather.chance_of_rain,
						feels_like_c: weather.feelslike_c,
						uv: weather.uv,
						visibility_km: weather.vis_km,
						gust_kph: weather.gust_kph || weather.wind_kph
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
