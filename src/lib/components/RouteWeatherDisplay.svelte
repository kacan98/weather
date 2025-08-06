<script lang="ts">
	import BikeRouteMap from './BikeRouteMap.svelte';
	import CurrentWeather from './CurrentWeather.svelte';
	
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
	}

	export let start: Location;
	export let end: Location;
	export let estimatedTravelTimeMinutes: number = 30;
	export let autoFetch: boolean = false;
	export let selectedProvider = 'weatherapi';
	export let availableProviders: any[] = [];

	let routeWeatherData: RouteWeatherData | null = null;
	let loading = false;
	let error = '';
	let selectedOptionIndex = 0;

	async function fetchRouteWeather() {
		if (!start.lat || !start.lng || !end.lat || !end.lng) {
			error = 'Please select both start and end locations';
			return;
		}

		loading = true;
		error = '';
		
		try {
			console.log(`Fetching route weather from (${start.lat}, ${start.lng}) to (${end.lat}, ${end.lng})`);
			
			const response = await fetch('/api/route-weather', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					start,
					end,
					departureIntervals: 12, // Show 3 hours instead of 2
					estimatedTravelTimeMinutes,
					preferredProvider: selectedProvider
				})
			});
			
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
			error = err instanceof Error ? err.message : 'Unknown error';
			console.error('Route weather fetch error:', err);
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
	
	// Create a unique key to prevent infinite loops
	$: fetchKey = `${start.lat}-${start.lng}-${end.lat}-${end.lng}-${selectedProvider}`;
	
	// Only auto-fetch when autoFetch is enabled and both locations are valid, and we haven't fetched this exact combination yet
	$: if (autoFetch && start.lat && start.lng && end.lat && end.lng && fetchKey !== lastFetchKey && !loading) {
		lastFetchKey = fetchKey;
		fetchRouteWeather();
	}
</script>

<div class="bg-white rounded-lg shadow-md p-4">
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-lg font-semibold">🗺️ Route Weather Analysis</h2>
		<div class="flex items-center space-x-2">
			<input 
				type="number" 
				bind:value={estimatedTravelTimeMinutes}
				min="5"
				max="180"
				step="5"
				class="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
			/>
			<span class="text-sm text-gray-600">min</span>
			<button
				class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 text-sm cursor-pointer transition-colors"
				on:click={fetchRouteWeather}
				disabled={loading || !start.lat || !end.lat}
			>
				{#if loading}
					<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
				{:else}
					🔄 Analyze Route
				{/if}
			</button>
		</div>
	</div>

	{#if error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-3 text-sm">
			<p class="font-medium">Error:</p>
			<p>{error}</p>
		</div>
	{/if}

	{#if loading}
		<div class="text-center py-6">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-2 text-gray-600 text-sm">Analyzing weather along your route...</p>
			<p class="text-xs text-gray-500">Getting forecasts for multiple points along your path</p>
		</div>
	{/if}
	
	{#if routeWeatherData}
		<!-- Current Weather Conditions -->
		<CurrentWeather lat={start.lat} lng={start.lng} showComparison={true} />
		
		<!-- Interactive Map -->
		<div class="mb-4">
			<BikeRouteMap 
				{start} 
				{end} 
				weatherPoints={routeWeatherData.departureOptions[selectedOptionIndex]?.weatherAlongRoute || []}
			/>
			
			{#if routeWeatherData.departureOptions[selectedOptionIndex]?.weatherAlongRoute?.length > 0}
				<div class="mt-2 text-xs text-gray-500 text-center">
					�️ Weather information is displayed automatically on the map at optimal intervals
				</div>
			{/if}
		</div>
		
		<div class="space-y-4">
			<!-- Route Info - Compact -->
			<div class="bg-blue-50 rounded p-3">
				<p class="text-sm">
					<strong>📍 {routeWeatherData.location.name}</strong> • 
					{routeWeatherData.route.estimatedTravelTimeMinutes} min ride • 
					Next 3 hours
				</p>
			</div>

			<!-- Weather Rating Chart -->
			<div class="bg-gray-50 rounded-lg p-4">
				<h3 class="font-medium mb-3 text-sm">🚴‍♂️ Bike Weather Rating Over Time</h3>
				
				<!-- Chart -->
				<div class="relative h-32 mb-2">
					<svg viewBox="0 0 400 100" class="w-full h-full">
						<!-- Grid lines -->
						{#each [0, 25, 50, 75, 100] as y}
							<line x1="0" y1={y} x2="400" y2={y} stroke="#e5e7eb" stroke-width="0.5"/>
						{/each}
						
						<!-- Rating bars and line -->
						{#if routeWeatherData.departureOptions.length > 0}
							{@const maxScore = 10}
							{@const barWidth = 380 / routeWeatherData.departureOptions.length}
							
							<!-- Bars -->
							{#each routeWeatherData.departureOptions as option, i}
								{@const x = (i * barWidth) + 10}
								{@const height = (option.overallBikeRating.score / maxScore) * 80}
								{@const y = 100 - height - 10}
								
								<rect 
									{x} 
									{y} 
									width={barWidth - 2} 
									{height}
									class="{option.overallBikeRating.score >= 8 ? 'fill-green-400' : 
									       option.overallBikeRating.score >= 6 ? 'fill-yellow-400' : 
									       option.overallBikeRating.score >= 4 ? 'fill-orange-400' : 'fill-red-400'}"
									opacity="0.7"
								/>
								
								<!-- Score text -->
								<text 
									x={x + barWidth/2} 
									y={y - 2} 
									text-anchor="middle" 
									class="fill-gray-700 text-xs font-medium"
								>
									{option.overallBikeRating.score}
								</text>
							{/each}
							
							<!-- Line connecting points -->
							{@const pathData = routeWeatherData.departureOptions.map((option, i) => {
								const x = (i * barWidth) + 10 + barWidth/2;
								const y = 100 - ((option.overallBikeRating.score / maxScore) * 80) - 10;
								return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
							}).join(' ')}
							
							<path d={pathData} stroke="#3b82f6" stroke-width="2" fill="none"/>
							
							<!-- Points -->
							{#each routeWeatherData.departureOptions as option, i}
								{@const x = (i * barWidth) + 10 + barWidth/2}
								{@const y = 100 - ((option.overallBikeRating.score / maxScore) * 80) - 10}
								
								<circle 
									{x} 
									{y} 
									r="3" 
									fill="#3b82f6"
									class="cursor-pointer hover:fill-blue-700"
								/>
							{/each}
						{/if}
					</svg>
				</div>

				<!-- Time labels -->
				<div class="flex justify-between text-xs text-gray-500 px-2">
					{#each routeWeatherData.departureOptions.slice(0, 6) as option, i}
						{#if i % 2 === 0}
							<span>{formatShortTime(option.departureTime)}</span>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Selected Time Details -->
			{#if routeWeatherData.departureOptions[selectedOptionIndex]}
				{@const selected = routeWeatherData.departureOptions[selectedOptionIndex]}
				<div class="border rounded-lg p-3 {selected.overallBikeRating.score >= 7 ? 'border-green-200 bg-green-50' : selected.overallBikeRating.score >= 5 ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}">
					<div class="flex justify-between items-center mb-2">
						<div>
							<h4 class="font-medium">
								Leave at {formatTime(selected.departureTime)} → Arrive {formatTime(selected.arrivalTime)}
							</h4>
							<p class="text-sm text-gray-600">
								{#if selectedOptionIndex === 0}🏃‍♂️ Leave now{:else}⏳ In {selectedOptionIndex * 15} minutes{/if}
							</p>
						</div>
						<div class="text-right">
							<div class="inline-flex items-center px-2 py-1 rounded-full {getRatingColor(selected.overallBikeRating.score)} text-sm">
								<span class="mr-1">{getRatingEmoji(selected.overallBikeRating.score)}</span>
								<span class="font-medium">{selected.overallBikeRating.score}/10</span>
							</div>
							<p class="text-xs mt-1">{selected.overallBikeRating.summary}</p>
						</div>
					</div>

					<!-- Alerts - Compact -->
					{#if selected.overallBikeRating.alerts.length > 0}
						<div class="flex flex-wrap gap-1 mb-2">
							{#each selected.overallBikeRating.alerts as alert}
								<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
									{alert}
								</span>
							{/each}
						</div>
					{/if}

					<!-- Route Weather - Horizontal layout -->
					<div class="grid grid-cols-3 gap-2">
						{#each selected.weatherAlongRoute as point, i}
							<div class="bg-white rounded p-2 border text-center">
								<div class="text-xs text-gray-500 mb-1">
									{i === 0 ? 'Start' : i === selected.weatherAlongRoute.length - 1 ? 'End' : 'Middle'}
								</div>
								
								<div class="flex items-center justify-center mb-1">
									<img src="https:{point.weather.icon}" alt={point.weather.condition} class="w-6 h-6" />
									<span class="ml-1 font-medium text-sm">{point.weather.temp_c}°C</span>
								</div>

								<div class="text-xs space-y-1">
									<p>💨 {point.weather.wind_kph} km/h</p>
									<p class="{point.weather.chance_of_rain > 50 ? 'text-blue-600' : 'text-gray-600'}">
										🌧️ {point.weather.chance_of_rain}%
									</p>
								</div>

								<div class="mt-1">
									<span class="inline-flex items-center px-1 py-0.5 rounded text-xs {getRatingColor(point.bikeRating.score)}">
										{getRatingEmoji(point.bikeRating.score)} {point.bikeRating.score}
									</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Quick Time Selector -->
			<div class="bg-gray-50 rounded p-3">
				<p class="text-sm font-medium mb-2">🕒 Select Departure Time (updates map):</p>
				<div class="flex flex-wrap gap-1">
					{#each routeWeatherData.departureOptions.slice(0, 8) as option, i}
						<button
							class="px-2 py-1 rounded text-xs border transition-colors cursor-pointer
							{selectedOptionIndex === i ? 
								'bg-blue-600 text-white border-blue-600' : 
								'bg-white hover:bg-gray-100 border-gray-300'}"
							on:click={() => selectedOptionIndex = i}
						>
							{#if i === 0}Now{:else}{i * 15}min{/if}
							<span class="ml-1 {getRatingBarColor(option.overallBikeRating.score)} text-white px-1 rounded">
								{option.overallBikeRating.score}
							</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Best Time Recommendation - Compact -->
			{#if routeWeatherData.departureOptions.length > 0}
				{@const bestOption = routeWeatherData.departureOptions.reduce((best, current) => 
					current.overallBikeRating.score > best.overallBikeRating.score ? current : best
				)}
				{@const bestIndex = routeWeatherData.departureOptions.indexOf(bestOption)}
				
				<div class="bg-green-50 border border-green-200 rounded p-3">
					<p class="text-sm">
						<strong>🏆 Best Time:</strong> 
						{formatTime(bestOption.departureTime)}
						{#if bestIndex === 0}(now!){:else}(in {bestIndex * 15}min){/if}
						- <span class="font-medium">{bestOption.overallBikeRating.score}/10</span>
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
