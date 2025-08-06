<script lang="ts">
	import BikeRouteMap from './BikeRouteMap.svelte';
	import CurrentWeather from './CurrentWeather.svelte';
	import Card from './ui/Card.svelte';
	import LoadingScreen from './ui/LoadingScreen.svelte';
	import { designSystem, getRatingColorClasses, getProviderDisplayName } from '$lib/styles/design-system';
	
	interface Location {
		lat: number;
		lng: number;
	}

	interface RouteWeatherData {
		route: {
			start: Location;
			end: Location;
			estimatedTravelTimeMinutes: number;
		};
		location: {
			name: string;
			country: string;
			lat: number;
			lng: number;
		};
		departureOptions: Array<{
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
					precip_mm: number;
					chance_of_rain: number;
					feels_like_c: number;
					uv: number;
					visibility_km: number;
				};
				bikeRating: {
					score: number;
					factors: string[];
				};
			}>;
			overallBikeRating: {
				score: number;
				summary: string;
				alerts: string[];
			};
		}>;
		recommendation?: {
			bestIndex: number;
			recommendation: string;
			reasoning: string;
		};
		provider?: string;
	}

	export let start: Location;
	export let end: Location;
	export let estimatedTravelTimeMinutes: number = 30;
	export let autoFetch: boolean = false;
	export let selectedProvider = 'weatherapi';
	export let availableProviders: any[] = [];
	export let preferredDepartureTime = ''; // HH:MM format

	let routeWeatherData: RouteWeatherData | null = null;
	let loading = false;
	let error = '';
	let selectedOptionIndex = 0;
	let hoveredOptionIndex: number | null = null;

	async function fetchRouteWeather() {
		if (!start.lat || !start.lng || !end.lat || !end.lng) {
			error = 'Please select both start and end locations';
			return;
		}

		loading = true;
		error = '';
		
		try {
			console.log(`Fetching route weather from (${start.lat}, ${start.lng}) to (${end.lat}, ${end.lng}) with provider ${selectedProvider}`);
			
			// Add timeout to prevent infinite loading
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
			
			const response = await fetch('/api/route-weather', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					start,
					end,
					departureIntervals: 20, // Show 5 hours (20 * 15min intervals)
					estimatedTravelTimeMinutes,
					preferredProvider: selectedProvider,
					preferredDepartureTime
				}),
				signal: controller.signal
			});
			
			clearTimeout(timeoutId);
			
			const result = await response.json();
			
			if (result.success) {
				routeWeatherData = result.data;
				selectedOptionIndex = 0;
				
				// Update available providers
				if (result.data.availableProviders) {
					availableProviders = result.data.availableProviders;
				}
				
				console.log(`Successfully loaded weather data for ${result.data.departureOptions.length} departure times using ${result.data.provider}`);
			} else {
				error = result.error || 'Failed to fetch route weather data';
				console.error('Route weather API error:', result.error);
			}
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				error = `Request timed out after 15 seconds. ${selectedProvider} might be unavailable.`;
				console.error('Route weather request timed out for provider:', selectedProvider);
			} else {
				error = err instanceof Error ? err.message : 'Unknown error';
				console.error('Route weather fetch error:', err);
			}
		} finally {
			loading = false;
		}
	}

	function formatTime(isoString: string): string {
		return new Date(isoString).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
	}

	function formatShortTime(isoString: string): string {
		return new Date(isoString).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
	}

	function getRatingColor(score: number): string {
		if (score >= 8) return 'text-green-600 bg-green-100';
		if (score >= 6) return 'text-yellow-600 bg-yellow-100';
		if (score >= 4) return 'text-orange-600 bg-orange-100';
		return 'text-red-600 bg-red-100';
	}

	function getRatingBarColor(score: number): string {
		if (score >= 8) return 'bg-green-500';
		if (score >= 6) return 'bg-yellow-500';
		if (score >= 4) return 'bg-orange-500';
		return 'bg-red-500';
	}

	function getRatingEmoji(score: number): string {
		if (score >= 8) return '🟢';
		if (score >= 6) return '🟡';
		if (score >= 4) return '🟠';
		return '🔴';
	}

	let lastFetchKey = '';
	let lastProvider = selectedProvider;
	
	// Create a unique key to prevent infinite loops
	$: fetchKey = `${start.lat}-${start.lng}-${end.lat}-${end.lng}-${selectedProvider}`;
	
	// Clear data and show loading when provider changes
	$: if (selectedProvider !== lastProvider) {
		lastProvider = selectedProvider;
		routeWeatherData = null;
		error = '';
		if (start.lat && start.lng && end.lat && end.lng) {
			loading = true;
		}
	}
	
	// Only auto-fetch when autoFetch is enabled and both locations are valid, and we haven't fetched this exact combination yet
	$: if (autoFetch && start.lat && start.lng && end.lat && end.lng && fetchKey !== lastFetchKey && !loading) {
		lastFetchKey = fetchKey;
		fetchRouteWeather();
	}

	// Debug log when selected option changes
	$: if (routeWeatherData && routeWeatherData.departureOptions[selectedOptionIndex]) {
		console.log('Selected departure option changed:', {
			index: selectedOptionIndex,
			departureTime: routeWeatherData.departureOptions[selectedOptionIndex].departureTime,
			weatherPoints: routeWeatherData.departureOptions[selectedOptionIndex].weatherAlongRoute?.length || 0
		});
	}
</script>

<Card>

	{#if error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3 text-sm">
			<p class="font-medium">Error:</p>
			<p>{error}</p>
		</div>
	{/if}

	{#if loading}
		<LoadingScreen 
			message="Getting Weather Data" 
			subtitle="Loading..." 
		/>
	{/if}
	
	{#if routeWeatherData}
		<!-- Intelligent Departure Recommendation -->
		{#if routeWeatherData.recommendation && routeWeatherData.departureOptions.length > 0}
			{@const bestOption = routeWeatherData.departureOptions[routeWeatherData.recommendation.bestIndex]}
			
			<Card>
				<div class="text-center py-6">
					<div class="{designSystem.typography.heading.recommendation} mb-4">
						{routeWeatherData.recommendation.recommendation}
					</div>
					<div class="text-lg text-gray-600 mb-2">
						{routeWeatherData.recommendation.reasoning}
					</div>
					<div class="text-sm text-gray-500 mb-3">
						Best conditions at {formatTime(bestOption.departureTime)}
					</div>
					<div class="inline-flex items-center px-4 py-2 rounded-full {getRatingColor(bestOption.overallBikeRating.score)} text-lg">
						<span class="mr-2">{getRatingEmoji(bestOption.overallBikeRating.score)}</span>
						<span class="font-semibold">{bestOption.overallBikeRating.score}/10</span>
						<span class="ml-2 text-sm">{bestOption.overallBikeRating.summary}</span>
					</div>
					{#if bestOption.overallBikeRating.alerts.length > 0}
						<div class="mt-3 text-sm text-yellow-700">
							{bestOption.overallBikeRating.alerts[0]}
						</div>
					{/if}
					
					<!-- Best time rating factors -->
					{#if bestOption.weatherAlongRoute.flatMap(point => point.bikeRating.factors).length > 0}
						{@const bestFactors = bestOption.weatherAlongRoute.flatMap(point => point.bikeRating.factors)}
						{@const bestUniqueFactors = [...new Set(bestFactors)]}
						<div class="mt-4 text-xs text-gray-500 space-y-2">
							<p class="font-medium text-gray-600">What makes this the best time?</p>
							<div class="flex flex-wrap justify-center gap-1">
								{#each bestUniqueFactors as factor}
									<span class="px-2 py-1 bg-gray-100 rounded text-xs">
										{factor}
									</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</Card>
		{/if}
		
		<!-- Interactive Map -->
		<div class="mb-4">
			<BikeRouteMap 
				{start} 
				{end} 
				weatherPoints={routeWeatherData.departureOptions[selectedOptionIndex]?.weatherAlongRoute || []}
				selectedDepartureTime={routeWeatherData.departureOptions[selectedOptionIndex]?.departureTime}
				{estimatedTravelTimeMinutes}
			/>
			
			{#if routeWeatherData.departureOptions[selectedOptionIndex]?.weatherAlongRoute?.length > 0}
				<div class="mt-2 text-xs text-gray-500 text-center">
					�️ Weather information is displayed automatically on the map at optimal intervals
				</div>
			{/if}
		</div>
		
		<div class="{designSystem.spacing.section}">
			<!-- Route Info - Simplified -->
			<div class="text-center text-sm text-gray-600 mb-4">
				{routeWeatherData.route.estimatedTravelTimeMinutes} min ride • 
				{getProviderDisplayName(routeWeatherData.provider)} forecast
			</div>


			<!-- Weather Details for Selected Time -->
			{#if routeWeatherData.departureOptions[selectedOptionIndex] && selectedOptionIndex !== 0}
				{@const selected = routeWeatherData.departureOptions[selectedOptionIndex]}
				<Card>
					<div class="text-center mb-3">
						<h3 class="font-medium text-gray-800 mb-1">Weather at {formatTime(selected.departureTime)}</h3>
						<div class="inline-flex items-center px-3 py-1 rounded-full {getRatingColor(selected.overallBikeRating.score)}">
							<span class="mr-1">{getRatingEmoji(selected.overallBikeRating.score)}</span>
							<span class="font-medium">{selected.overallBikeRating.score}/10</span>
						</div>
					</div>

					{#if selected.overallBikeRating.alerts.length > 0}
						<div class="text-center mb-3 text-sm text-yellow-700">
							{selected.overallBikeRating.alerts[0]}
						</div>
					{/if}

					<!-- Quick weather summary -->
					{#if selected.weatherAlongRoute.length > 0}
						{@const startWeather = selected.weatherAlongRoute[0]}
						<div class="text-center text-sm text-gray-600 mb-3">
							{startWeather.weather.temp_c}°C • 
							{(startWeather.weather.wind_kph / 3.6).toFixed(1)} m/s wind • 
							{startWeather.weather.precip_mm.toFixed(1)}mm rain
						</div>
					{/if}
					
					<!-- Rating breakdown - show factors that affected the score -->
					{#if selected.weatherAlongRoute.flatMap(point => point.bikeRating.factors).length > 0}
						{@const allFactors = selected.weatherAlongRoute.flatMap(point => point.bikeRating.factors)}
						{@const uniqueFactors = [...new Set(allFactors)]}
						<div class="text-xs text-gray-500 space-y-1">
							<p class="font-medium text-gray-600 text-center">Rating factors:</p>
							<div class="flex flex-wrap justify-center gap-1">
								{#each uniqueFactors as factor}
									<span class="px-2 py-1 bg-gray-100 rounded text-xs">
										{factor}
									</span>
								{/each}
							</div>
						</div>
					{/if}
				</Card>
			{/if}


			<!-- Alternative Times - Simplified -->
			<div class="text-center">
				<p class="text-sm font-medium mb-3 text-gray-700">Other departure times:</p>
				<div class="flex flex-wrap justify-center gap-2 max-w-full">
					{#each routeWeatherData.departureOptions as option, i}
						<button
							class="flex-shrink-0 px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer min-w-0
							{selectedOptionIndex === i ? 
								'bg-blue-600 text-white border-blue-600' : 
								'bg-white/80 hover:bg-blue-50 border-gray-300'}"
							on:click={() => selectedOptionIndex = i}
						>
							<div class="whitespace-nowrap">{#if i === 0}Now{:else}+{i * 15}min{/if}</div>
							<div class="text-xs mt-1 {selectedOptionIndex === i ? 'text-blue-200' : getRatingColor(option.overallBikeRating.score)}">
								{option.overallBikeRating.score}/10
							</div>
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</Card>
