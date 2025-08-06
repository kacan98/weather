<script lang="ts">
	import { onMount } from 'svelte';
	
	export let lat: number;
	export let lng: number;
	export let showComparison = true;
	
	let currentWeather: any = null;
	let loading = false;
	let error = '';
	
	async function fetchCurrentWeather() {
		if (!lat || !lng) return;
		
		loading = true;
		error = '';
		
		try {
			const response = await fetch('/api/current-weather', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ lat, lng })
			});
			
			const result = await response.json();
			
			if (!result.success) {
				throw new Error(result.error || 'Failed to fetch current weather');
			}
			
			currentWeather = result.data;
		} catch (err) {
			console.error('Error fetching current weather:', err);
			error = err instanceof Error ? err.message : 'Failed to load current weather';
		} finally {
			loading = false;
		}
	}
	
	onMount(() => {
		fetchCurrentWeather();
	});
	
	// Refresh every 5 minutes
	onMount(() => {
		const interval = setInterval(fetchCurrentWeather, 5 * 60 * 1000);
		return () => clearInterval(interval);
	});
	
	$: if (lat && lng) {
		fetchCurrentWeather();
	}
</script>

{#if currentWeather}
	<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
		<div class="flex items-center justify-between mb-2">
			<h3 class="text-lg font-semibold text-blue-900">Current Conditions</h3>
			<span class="text-xs text-gray-500">
				Updated: {new Date(currentWeather.current.last_updated).toLocaleTimeString()}
			</span>
		</div>
		
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
			<div class="bg-white rounded p-2">
				<div class="flex items-center space-x-2">
					<img src={currentWeather.current.condition.icon} alt={currentWeather.current.condition.text} class="w-10 h-10" />
					<div>
						<div class="text-2xl font-bold">{Math.round(currentWeather.current.temp_c)}°C</div>
						<div class="text-xs text-gray-600">Feels like {Math.round(currentWeather.current.feels_like_c)}°C</div>
					</div>
				</div>
			</div>
			
			<div class="bg-white rounded p-2">
				<div class="text-sm text-gray-600">Condition</div>
				<div class="font-semibold">{currentWeather.current.condition.text}</div>
				{#if currentWeather.current.is_raining}
					<div class="text-xs text-blue-600 font-medium">🌧️ Currently raining</div>
				{/if}
			</div>
			
			<div class="bg-white rounded p-2">
				<div class="text-sm text-gray-600">Precipitation</div>
				<div class="font-semibold">{currentWeather.current.precip_mm} mm</div>
				<div class="text-xs text-gray-500">Humidity: {currentWeather.current.humidity}%</div>
			</div>
			
			<div class="bg-white rounded p-2">
				<div class="text-sm text-gray-600">Wind</div>
				<div class="font-semibold">{Math.round(currentWeather.current.wind_kph)} km/h</div>
				<div class="text-xs text-gray-500">{currentWeather.current.wind_dir}</div>
				{#if currentWeather.current.gust_kph > currentWeather.current.wind_kph}
					<div class="text-xs text-orange-600">Gusts: {Math.round(currentWeather.current.gust_kph)} km/h</div>
				{/if}
			</div>
		</div>
		
		{#if showComparison}
			<div class="mt-3 p-2 bg-yellow-50 rounded text-sm">
				<span class="font-medium">💡 Tip:</span> Compare these current conditions with the forecast below. 
				If they differ significantly, the forecast may be less reliable for the immediate future.
			</div>
		{/if}
	</div>
{:else if loading}
	<div class="bg-gray-100 rounded-lg p-4 mb-4 animate-pulse">
		<div class="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
		<div class="h-20 bg-gray-300 rounded"></div>
	</div>
{:else if error}
	<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
		<p class="text-red-700">Unable to load current conditions: {error}</p>
	</div>
{/if}