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
	preferredDepartureTime?: string; // User's preferred departure time in HH:MM format
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

// Utility function to fix floating point precision issues
function roundToDecimal(value: number, decimals: number = 1): number {
	return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * BIKE RATING CALCULATION METHODOLOGY
 * 
 * Base Score: 10.0 (perfect conditions)
 * 
 * PENALTIES (subtract from score):
 * 
 * 1. TEMPERATURE:
 *    - Dangerously cold (<-5°C): -4.0
 *    - Very cold (-5°C to 0°C): -3.0  
 *    - Cold (0°C to 5°C): -2.0
 *    - Cool (5°C to 10°C): -1.0
 *    - Hot (25°C to 30°C): -1.0
 *    - Very hot (30°C to 35°C): -2.0
 *    - Dangerously hot (>35°C): -3.0
 * 
 * 2. WIND (realistic cycling thresholds):
 *    - Dangerous (>50 km/h): -3.0
 *    - Very strong (35-50 km/h): -2.0
 *    - Strong (25-35 km/h): -1.0
 *    - Moderate (20-25 km/h): -0.5
 * 
 * 3. PRECIPITATION & RAIN:
 *    - Snow/sleet: -5.0
 *    - Heavy rain (>5mm): -4.0
 *    - Moderate rain (2-5mm): -3.0
 *    - Light rain (0.5-2mm): -2.0
 *    - Drizzle (<0.5mm): -1.0
 *    - Rain probability (only if no actual precipitation):
 *      * >80% chance: -1.5
 *      * 60-80% chance: -1.0
 *      * 40-60% chance: -0.5
 * 
 * 4. VISIBILITY:
 *    - Dangerous (<0.5km): -4.0
 *    - Very poor (0.5-1km): -3.0
 *    - Reduced (1-5km): -1.0
 * 
 * 5. UV INDEX:
 *    - Extreme (≥11): -0.5
 * 
 * BONUSES (add to score):
 * 
 * 1. PERFECT CONDITIONS (15-24°C, <10km/h wind, <10% rain chance, 0mm precipitation): +1.0
 * 
 * FINAL SCORE: Clamped between 1.0 and 10.0, based purely on weather conditions
 * 
 * OVERALL ROUTE RATING: Average of all weather points along the route
 */
function calculateBikeRating(weather: WeatherCondition): { score: number; factors: string[] } {
	let score = 10;
	const factors: string[] = [];

	// Temperature scoring
	if (weather.temperature < -5) {
		score = roundToDecimal(score - 4);
		factors.push('Dangerously cold (-4.0)');
	} else if (weather.temperature < 0) {
		score = roundToDecimal(score - 3);
		factors.push('Very cold temperature (-3.0)');
	} else if (weather.temperature < 5) {
		score = roundToDecimal(score - 2);
		factors.push('Cold temperature (-2.0)');
	} else if (weather.temperature < 10) {
		score = roundToDecimal(score - 1);
		factors.push('Cool temperature (-1.0)');
	} else if (weather.temperature > 35) {
		score = roundToDecimal(score - 3);
		factors.push('Dangerously hot (-3.0)');
	} else if (weather.temperature > 30) {
		score = roundToDecimal(score - 2);
		factors.push('Very hot temperature (-2.0)');
	} else if (weather.temperature > 25) {
		score = roundToDecimal(score - 1);
		factors.push('Hot temperature (-1.0)');
	}

	// Wind scoring - reduced penalties for more realistic cycling conditions
	if (weather.windSpeed > 50) {
		score = roundToDecimal(score - 3);
		factors.push('Dangerous wind speeds (-3.0)');
	} else if (weather.windSpeed > 35) {
		score = roundToDecimal(score - 2);
		factors.push('Very strong wind (-2.0)');
	} else if (weather.windSpeed > 25) {
		score = roundToDecimal(score - 1);
		factors.push('Strong wind (-1.0)');
	} else if (weather.windSpeed > 20) {
		score = roundToDecimal(score - 0.5);
		factors.push('Moderate wind (-0.5)');
	}

	// Rain and precipitation - combined scoring
	const conditionText = weather.condition.toLowerCase();
	const isSnowing = conditionText.includes('snow') || 
					  conditionText.includes('sleet') || 
					  conditionText.includes('blizzard');

	if (isSnowing) {
		score = roundToDecimal(score - 5);
		factors.push('Snow/sleet conditions (-5.0)');
	} else {
		// Calculate a combined rain impact score based on both precipitation and probability
		// Actual precipitation is weighted more heavily than probability
		let rainImpact = 0;
		
		// Precipitation amount scoring (weight: 70%)
		if (weather.precipitation > 5) {
			rainImpact += 4;
			factors.push('Heavy rain >5mm (-4.0)');
		} else if (weather.precipitation > 2) {
			rainImpact += 3;
			factors.push('Moderate rain 2-5mm (-3.0)');
		} else if (weather.precipitation > 0.5) {
			rainImpact += 2;
			factors.push('Light rain 0.5-2mm (-2.0)');
		} else if (weather.precipitation > 0.1) {
			rainImpact += 1;
			factors.push('Drizzle <0.5mm (-1.0)');
		}
		
		// Rain probability scoring (weight: 30%)
		// Only matters if there's no actual precipitation yet
		if (weather.precipitation <= 0.1) {
			if (weather.rainChance > 80) {
				rainImpact += 1.5;
				factors.push('Very high rain probability (-1.5)');
			} else if (weather.rainChance > 60) {
				rainImpact += 1;
				factors.push('High rain probability (-1.0)');
			} else if (weather.rainChance > 40) {
				rainImpact += 0.5;
				factors.push('Moderate rain probability (-0.5)');
			}
		}
		
		// Apply the combined rain impact
		const rainPenalty = roundToDecimal(Math.min(rainImpact, 4)); // Cap at -4 to avoid over-penalizing
		score = roundToDecimal(score - rainPenalty);
	}

	// Visibility
	if (weather.visibility < 0.5) {
		score = roundToDecimal(score - 4);
		factors.push('Dangerous visibility (-4.0)');
	} else if (weather.visibility < 1) {
		score = roundToDecimal(score - 3);
		factors.push('Very poor visibility (-3.0)');
	} else if (weather.visibility < 5) {
		score = roundToDecimal(score - 1);
		factors.push('Reduced visibility (-1.0)');
	}

	// UV
	if (weather.uvIndex >= 11) {
		score = roundToDecimal(score - 0.5);
		factors.push('Extreme UV - avoid if possible (-0.5)');
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
		score = roundToDecimal(score + 1.0);
		factors.push('Perfect biking weather! (+1.0)');
	}

	return { score: roundToDecimal(Math.max(1, Math.min(10, score))), factors };
}

/**
 * Generate intelligent departure recommendation based on weather analysis
 */
function generateDepartureRecommendation(departureOptions: DepartureOption[], preferredDepartureTime?: string): {
	bestIndex: number;
	recommendation: string;
	reasoning: string;
} {
	if (departureOptions.length === 0) {
		return {
			bestIndex: 0,
			recommendation: "No departure options available",
			reasoning: ""
		};
	}

	// Find the actual best weather conditions (highest score)
	const bestOption = departureOptions.reduce((best, current) => 
		current.overallBikeRating.score > best.overallBikeRating.score ? current : best
	);
	const bestIndex = departureOptions.indexOf(bestOption);
	const bestScore = bestOption.overallBikeRating.score;
	
	// Current conditions (leaving now)
	const nowOption = departureOptions[0];
	const nowScore = nowOption.overallBikeRating.score;
	
	// Check for weather deterioration - look at next 3-4 hours for significant drops
	let worseningFound = false;
	let worseningTime = 0;
	let worseningScore = nowScore;
	
	for (let i = 1; i < Math.min(departureOptions.length, 16); i++) { // Check next 4 hours (16 intervals)
		const futureScore = departureOptions[i].overallBikeRating.score;
		const scoreDrop = roundToDecimal(nowScore - futureScore);
		
		// Significant deterioration: >1.5 point drop from current conditions
		if (scoreDrop >= 1.5) {
			worseningFound = true;
			worseningTime = i * 15;
			worseningScore = futureScore;
			break;
		}
	}
	
	// Calculate score difference and time to best conditions
	const scoreDifference = roundToDecimal(bestScore - nowScore);
	const minutesToBest = bestIndex * 15;
	
	// Check user's preferred departure time if provided
	let preferredIndex = -1;
	let preferredScore = 0;
	if (preferredDepartureTime) {
		const now = new Date();
		const [hours, minutes] = preferredDepartureTime.split(':').map(Number);
		const preferredTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
		const minutesUntilPreferred = Math.max(0, Math.round((preferredTime.getTime() - now.getTime()) / (1000 * 60)));
		preferredIndex = Math.floor(minutesUntilPreferred / 15);
		
		if (preferredIndex >= 0 && preferredIndex < departureOptions.length) {
			preferredScore = departureOptions[preferredIndex].overallBikeRating.score;
		}
	}
	
	let recommendation: string;
	let reasoning: string;

	// Helper function to describe what will improve
	function getImprovementDetails(fromScore: number, toScore: number): string {
		if (toScore - fromScore < 0.5) return '';
		
		const bestOption = departureOptions[bestIndex];
		const nowOption = departureOptions[0];
		const bestFactors = bestOption.weatherAlongRoute.flatMap(point => point.bikeRating.factors);
		const nowFactors = nowOption.weatherAlongRoute.flatMap(point => point.bikeRating.factors);
		
		// Find positive factors in best time that aren't in current time
		const improvements = bestFactors.filter(factor => 
			factor.includes('+') && !nowFactors.some(nf => nf.includes(factor.split(' ')[0]))
		);
		
		// Find negative factors in current time that aren't in best time  
		const reductions = nowFactors.filter(factor => 
			factor.includes('-') && !bestFactors.some(bf => bf.includes(factor.split(' ')[0]))
		);
		
		const changes = [];
		if (improvements.length > 0) changes.push(`better: ${improvements[0]}`);
		if (reductions.length > 0) changes.push(`avoiding: ${reductions[0]}`);
		
		return changes.length > 0 ? ` (${changes.join(', ')})` : '';
	}

	// Priority 1: User's preferred time considerations
	if (preferredIndex >= 0) {
		const preferredTimeDiff = roundToDecimal(preferredScore - nowScore);
		const preferredVsBest = roundToDecimal(bestScore - preferredScore);
		const minutesToPreferred = preferredIndex * 15;
		
		if (preferredIndex === bestIndex) {
			// User's preferred time is the best time!
			recommendation = `🎯 Perfect! Leave at your preferred time`;
			reasoning = `Your preferred time (${preferredDepartureTime}) is optimal with a score of ${bestScore}/10`;
		} else if (preferredScore >= nowScore + 1.0) {
			// User's preferred time is significantly better than now
			recommendation = `🕒 Wait for your preferred time`;
			reasoning = `Your preferred time (${preferredDepartureTime}) is much better: ${preferredScore}/10 vs current ${nowScore}/10${getImprovementDetails(nowScore, preferredScore)}`;
		} else if (preferredVsBest <= 0.5) {
			// User's preferred time is close to the best
			recommendation = `🕒 Your preferred time works well`;
			reasoning = `Your time (${preferredDepartureTime}, ${preferredScore}/10) is nearly as good as the best (${bestScore}/10 in ${minutesToBest}min)`;
		} else if (preferredScore < nowScore - 1.0) {
			// User's preferred time is much worse than now
			recommendation = `⚠️ I'd suggest leaving now instead`;
			reasoning = `Your preferred time (${preferredDepartureTime}) would be worse: ${preferredScore}/10 vs current ${nowScore}/10. Best is ${bestScore}/10 in ${minutesToBest}min`;
		} else {
			// General case with user preference
			recommendation = `🤔 Your time vs optimal: ${preferredScore}/10 vs ${bestScore}/10`;
			reasoning = `Your preferred time (${preferredDepartureTime}): ${preferredScore}/10, optimal time (+${minutesToBest}min): ${bestScore}/10${getImprovementDetails(preferredScore, bestScore)}`;
		}
	}
	// Priority 2: Warn about deteriorating conditions
	else if (worseningFound && nowScore >= 6.0) {
		recommendation = `⚠️ Leave soon - weather deteriorating`;
		reasoning = `Current conditions are good (${nowScore}/10) but will drop significantly to ${worseningScore}/10 in ${worseningTime} minutes`;
	} else if (bestIndex === 0) {
		recommendation = "🚴‍♂️ Go Now!";
		reasoning = `Current conditions are optimal. Score: ${nowScore}/10`;
	} else if (scoreDifference < 0.5) {
		if (worseningFound) {
			recommendation = "🚴‍♂️ Leave now - conditions will worsen";
			reasoning = `Weather won't improve much (+${scoreDifference}) but will worsen to ${worseningScore}/10 in ${worseningTime}min`;
		} else {
			recommendation = "🚴‍♂️ Feel free to leave now";
			reasoning = `Weather won't improve significantly. Current: ${nowScore}/10, best in ${minutesToBest}min: ${bestScore}/10 (+${scoreDifference})`;
		}
	} else if (scoreDifference >= 0.5 && scoreDifference < 1.5) {
		if (worseningFound && minutesToBest > worseningTime) {
			recommendation = `⚠️ Leave now - weather will worsen before improving`;
			reasoning = `Conditions drop to ${worseningScore}/10 in ${worseningTime}min before improving to ${bestScore}/10 in ${minutesToBest}min`;
		} else {
			recommendation = `🕒 Consider waiting ${minutesToBest} minutes`;
			reasoning = `Weather will improve moderately. Current: ${nowScore}/10 → Best: ${bestScore}/10 (+${scoreDifference} improvement)${getImprovementDetails(nowScore, bestScore)}`;
		}
	} else {
		if (worseningFound && minutesToBest > worseningTime) {
			recommendation = `⚠️ Leave now or wait longer - weather will worsen first`;
			reasoning = `Conditions drop to ${worseningScore}/10 in ${worseningTime}min before improving to ${bestScore}/10 in ${minutesToBest}min`;
		} else {
			recommendation = `⏰ I'd recommend waiting ${minutesToBest} minutes`;
			reasoning = `Weather will improve significantly. Current: ${nowScore}/10 → Best: ${bestScore}/10 (+${scoreDifference} improvement)${getImprovementDetails(nowScore, bestScore)}`;
		}
	}

	return {
		bestIndex,
		recommendation,
		reasoning
	};
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
			preferredProvider,
			preferredDepartureTime
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
			const avgScore = roundToDecimal(weatherAlongRoute.reduce((sum, point) => sum + point.bikeRating.score, 0) / weatherAlongRoute.length);
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
					score: avgScore,
					summary,
					alerts
				},
				provider: usedProvider
			});
		}
		
		// Generate intelligent departure recommendation
		const recommendation = generateDepartureRecommendation(departureOptions, preferredDepartureTime);
		
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
			recommendation,
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