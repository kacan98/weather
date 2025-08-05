<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import RouteInput from '$lib/components/RouteInput.svelte';
	import RouteWeatherDisplay from '$lib/components/RouteWeatherDisplay.svelte';
	
	interface Location {
		lat: number;
		lng: number;
	}
	
	let start: Location = { lat: 0, lng: 0 };
	let end: Location = { lat: 0, lng: 0 };
	let startName = '';
	let endName = '';
	let estimatedTravelTimeMinutes = 30;
	let currentStep = 1; // 1: Input locations, 2: Show weather
	let loading = false;
	let distance = 0;
	
	// Load from URL parameters on mount
	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		
		const startLat = params.get('start_lat');
		const startLng = params.get('start_lng');
		const endLat = params.get('end_lat');
		const endLng = params.get('end_lng');
		const travelTime = params.get('travel_time');
		
		if (startLat && startLng && endLat && endLng) {
			start = { lat: parseFloat(startLat), lng: parseFloat(startLng) };
			end = { lat: parseFloat(endLat), lng: parseFloat(endLng) };
			startName = params.get('start_name') || '';
			endName = params.get('end_name') || '';
			
			if (travelTime) {
				estimatedTravelTimeMinutes = parseInt(travelTime);
			}
			
			// If we have valid locations from URL, show the weather step
			if (startName && endName) {
				calculateDistance();
				currentStep = 2;
			}
		}
	});
	
	// Calculate distance between two points (Haversine formula)
	function calculateDistance() {
		const R = 6371; // Earth's radius in km
		const dLat = (end.lat - start.lat) * Math.PI / 180;
		const dLng = (end.lng - start.lng) * Math.PI / 180;
		const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
				Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) *
				Math.sin(dLng/2) * Math.sin(dLng/2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		distance = R * c; // Distance in km
	}
	
	// Update URL parameters
	function updateURL() {
		const params = new URLSearchParams();
		if (start.lat && start.lng) {
			params.set('start_lat', start.lat.toString());
			params.set('start_lng', start.lng.toString());
			params.set('start_name', startName);
		}
		if (end.lat && end.lng) {
			params.set('end_lat', end.lat.toString());
			params.set('end_lng', end.lng.toString());
			params.set('end_name', endName);
		}
		params.set('travel_time', estimatedTravelTimeMinutes.toString());
		
		const newURL = `${window.location.pathname}?${params.toString()}`;
		window.history.replaceState({}, '', newURL);
	}
	
	function handleLocationUpdate(event: CustomEvent) {
		const { start: newStart, end: newEnd, startName: newStartName, endName: newEndName } = event.detail;
		start = newStart;
		end = newEnd;
		startName = newStartName;
		endName = newEndName;
		updateURL();
	}
	
	function searchWeather() {
		if (!start.lat || !end.lat || !startName || !endName) {
			return;
		}
		
		calculateDistance();
		updateURL();
		currentStep = 2;
	}
	
	function backToLocationInput() {
		currentStep = 1;
	}
	
	function shareRoute() {
		navigator.clipboard.writeText(window.location.href);
		alert('Route link copied to clipboard! You can bookmark or share this link.');
	}
</script>

<div class="min-h-screen bg-gray-100">
	<div class="max-w-4xl mx-auto p-4">
		<header class="text-center mb-8">
			<h1 class="text-3xl font-bold text-blue-600 mb-1">🚴‍♂️ Smart Bike Weather</h1>
			<p class="text-gray-600 text-sm">Find the perfect time to start your bike ride</p>
		</header>
		
		{#if currentStep === 1}
			<!-- Step 1: Location Input -->
			<div class="max-w-2xl mx-auto">
				<div class="text-center mb-6">
					<div class="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
						Step 1 of 2 • Choose Your Route
					</div>
				</div>
				
				<RouteInput 
					bind:start 
					bind:end 
					bind:startName
					bind:endName
					on:update={handleLocationUpdate}
				/>
				
				<!-- Always show the search button, but enable/disable based on valid inputs -->
				<div class="mt-6 text-center">
					<button
						class="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
						on:click={searchWeather}
						disabled={!start.lat || !end.lat || !startName || !endName}
					>
						🔍 Analyze Weather Along Route
					</button>
					<p class="text-sm text-gray-500 mt-2">
						{#if !startName || !endName}
							Enter both start and end locations to continue
						{:else if !start.lat || !end.lat}
							Please select valid locations from the dropdown
						{:else}
							Get weather forecasts for different departure times
						{/if}
					</p>
				</div>
			</div>
			
		{:else if currentStep === 2}
			<!-- Step 2: Weather Results -->
			<div class="mb-4">
				<div class="flex items-center justify-between">
					<button
						class="text-blue-600 hover:text-blue-800 text-sm cursor-pointer"
						on:click={backToLocationInput}
					>
						← Back to route selection
					</button>
					
					<div class="flex items-center space-x-4">
						<div class="text-sm text-gray-600">
							📏 {distance.toFixed(1)} km • 🚴‍♂️ ~{Math.round(distance * 3.5)} min
						</div>
						<button
							class="text-blue-600 hover:text-blue-800 text-sm cursor-pointer"
							on:click={shareRoute}
						>
							🔗 Share Route
						</button>
					</div>
				</div>
			</div>
			
			<!-- Route Summary -->
			<div class="bg-white rounded-lg shadow-md p-4 mb-4">
				<div class="flex items-center justify-center space-x-3 text-gray-700">
					<span class="bg-green-100 px-3 py-1 rounded-full text-sm font-medium">
						🏠 {startName.length > 30 ? startName.substring(0, 30) + '...' : startName}
					</span>
					<span class="text-xl">→</span>
					<span class="bg-blue-100 px-3 py-1 rounded-full text-sm font-medium">
						🏢 {endName.length > 30 ? endName.substring(0, 30) + '...' : endName}
					</span>
				</div>
			</div>
			
			<RouteWeatherDisplay 
				{start} 
				{end} 
				{estimatedTravelTimeMinutes}
				autoFetch={true}
			/>
		{/if}
		
		<footer class="text-center mt-8 text-xs text-gray-500">
			<p>Weather data from <a href="https://www.weatherapi.com/" class="underline hover:text-blue-600 cursor-pointer">WeatherAPI.com</a> • Address search by <a href="https://nominatim.openstreetmap.org/" class="underline hover:text-blue-600 cursor-pointer">OpenStreetMap</a></p>
		</footer>
	</div>
</div>
