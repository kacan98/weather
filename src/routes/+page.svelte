<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import RouteInput from '$lib/components/RouteInput.svelte';
	import RouteWeatherDisplay from '$lib/components/RouteWeatherDisplay.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import WeatherProviderComparison from '$lib/components/WeatherProviderComparison.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import LoadingScreen from '$lib/components/ui/LoadingScreen.svelte';
	import { designSystem } from '$lib/styles/design-system';
	
	interface Location {
		lat: number;
		lng: number;
	}
	
	let start: Location = { lat: 0, lng: 0 };
	let end: Location = { lat: 0, lng: 0 };
	let startName = '';
	let endName = '';
	let preferredDepartureTime = '';
	let estimatedTravelTimeMinutes = 30;
	let currentStep = 1; // 1: Input locations, 2: Show weather
	let loading = false;
	let distance = 0;
	let initialLoad = true;
	let selectedProvider = 'weatherapi';
	let availableProviders: any[] = [];
	let showComparison = false;
	let comparisonData: any = {};
	let hasUrlParams = false;
	let urlParamsChecked = false; // Start with false to show loading by default
	let showSettingsModal = false;
	
	// Load from URL parameters on mount
	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		hasUrlParams = params.has('start_lat');
		
		const startLat = params.get('start_lat');
		const startLng = params.get('start_lng');
		const endLat = params.get('end_lat');
		const endLng = params.get('end_lng');
		const travelTime = params.get('travel_time');
		const preferredTime = params.get('preferred_time');
		
		if (startLat && startLng && endLat && endLng) {
			start = { lat: parseFloat(startLat), lng: parseFloat(startLng) };
			end = { lat: parseFloat(endLat), lng: parseFloat(endLng) };
			startName = params.get('start_name') || '';
			endName = params.get('end_name') || '';
			preferredDepartureTime = preferredTime || '';
			
			if (travelTime) {
				estimatedTravelTimeMinutes = parseInt(travelTime);
			}
			
			// If we have valid locations from URL, show the weather step
			if (startName && endName) {
				calculateDistance();
				currentStep = 2;
			}
		}
		
		// Mark URL params as checked and initial load as complete
		urlParamsChecked = true;
		initialLoad = false;
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
		
		// Calculate estimated travel time (assuming 15 km/h average cycling speed)
		estimatedTravelTimeMinutes = Math.round(distance * 4); // 60 min / 15 km = 4 min/km
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
		if (preferredDepartureTime) {
			params.set('preferred_time', preferredDepartureTime);
		}
		
		const newURL = `${window.location.pathname}?${params.toString()}`;
		window.history.replaceState({}, '', newURL);
	}
	
	function handleLocationUpdate(event: CustomEvent) {
		const { start: newStart, end: newEnd, startName: newStartName, endName: newEndName, preferredDepartureTime: newPreferredTime } = event.detail;
		start = newStart;
		end = newEnd;
		startName = newStartName;
		endName = newEndName;
		preferredDepartureTime = newPreferredTime || '';
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
	
	function swapLocations() {
		const tempStart = { ...start };
		const tempStartName = startName;
		start = { ...end };
		end = tempStart;
		startName = endName;
		endName = tempStartName;
		
		calculateDistance();
		updateURL();
	}
	
	function handleProviderChange(event: any) {
		selectedProvider = event.detail.providerId;
	}
	
	function handleSettingsModalProviderChange(event: any) {
		selectedProvider = event.detail.providerId;
	}
	
	function handlePreferredTimeChange(event: any) {
		preferredDepartureTime = event.detail.preferredDepartureTime;
		updateURL();
	}
	
	function handleTravelTimeChange(event: any) {
		estimatedTravelTimeMinutes = event.detail.estimatedTravelTimeMinutes;
		updateURL();
	}
	
	function openSettings() {
		showSettingsModal = true;
	}
	
	async function handleToggleComparison(event: any) {
		showComparison = event.detail.show;
		
		if (showComparison && start.lat && start.lng) {
			try {
				const response = await fetch('/api/weather-comparison', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ lat: start.lat, lon: start.lng })
				});
				
				if (response.ok) {
					const result = await response.json();
					if (result.success) {
						comparisonData = result.data;
					}
				}
			} catch (error) {
				console.error('Failed to fetch comparison data:', error);
			}
		}
	}
</script>

{#if !urlParamsChecked}
	<!-- Loading screen while checking URL params -->
	<LoadingScreen 
		message="🚴‍♂️ Smart Bike Weather" 
		subtitle="Loading..." 
	/>
{:else if initialLoad && hasUrlParams}
	<!-- Loading screen for URL-based routes -->
	<LoadingScreen 
		message="Loading Route" 
		subtitle="Loading..." 
	/>
{:else}
	{#if currentStep === 1}
		<!-- Step 1: Location Input - Centered on screen with proper height constraint -->
		<div class="h-screen {designSystem.colors.background.main} overflow-hidden relative">
			<div class="flex items-center justify-center h-full">
				<div class="max-w-2xl mx-auto px-4">
					<header class="text-center mb-6">
						<h1 class="{designSystem.typography.heading.main} mb-2">
							🚴‍♂️ BikeTime
						</h1>
						<p class="{designSystem.typography.body.main}">Find the perfect time to ride</p>
					</header>

					<div class="text-center mb-6">
						<div class="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
							Step 1 of 2 • Choose Your Route
						</div>
					</div>
					
					<RouteInput 
						bind:start 
						bind:end 
						bind:startName
						bind:endName
						bind:preferredDepartureTime
						on:update={handleLocationUpdate}
					/>
					
					<!-- Always show the search button, but enable/disable based on valid inputs -->
					<div class="mt-6 text-center">
						<Button
							variant="primary"
							size="lg"
							disabled={!start.lat || !end.lat || !startName || !endName}
							on:click={searchWeather}
						>
							🔍 Analyze Weather Along Route
						</Button>
						{#if !start.lat || !end.lat}
							<p class="text-sm text-gray-500 mt-2">
								Please select valid locations from the dropdown
							</p>
						{:else}
							<p class="text-sm text-gray-500 mt-2">
								Get weather forecasts for different departure times
							</p>
						{/if}
					</div>
					
					<!-- Simple footer for first page -->
					<div class="absolute bottom-4 left-0 right-0">
						<div class="text-xs text-gray-400 flex items-center justify-center gap-4">
							<span>© {new Date().getFullYear()} Karel Čančara</span>
							<a href="https://www.linkedin.com/in/kcancara/" class="flex items-center gap-1 hover:text-blue-600 cursor-pointer" target="_blank" rel="noopener" aria-label="LinkedIn profile">
								<svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
									<path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/>
								</svg>
							</a>
							<a href="mailto:karel.cancara@gmail.com" class="flex items-center gap-1 hover:text-blue-600 cursor-pointer" aria-label="Send email">
								<svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
									<path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
								</svg>
							</a>
						</div>
					</div>
				</div>
			</div>
		</div>
		
	{:else if currentStep === 2}
		<div class="min-h-screen {designSystem.colors.background.main}">
			<div class="max-w-4xl mx-auto p-4">
				<!-- Step 2: Weather Results -->
				<header class="text-center mb-8">
					<h1 class="{designSystem.typography.heading.main} mb-2">
						🚴‍♂️ BikeTime
					</h1>
					<p class="{designSystem.typography.body.main}">Find the perfect time to ride</p>
				</header>

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
								📏 {distance.toFixed(1)} km • 🚴‍♂️ ~{estimatedTravelTimeMinutes} min
							</div>
							<button
								class="text-blue-600 hover:text-blue-800 text-sm cursor-pointer"
								on:click={openSettings}
							>
								⚙️ Settings
							</button>
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
				<Card class="mb-6">
					<div class="space-y-4">
						<div class="flex items-center justify-center space-x-4 text-gray-700">
							<span class="bg-gradient-to-r from-green-100 to-green-50 px-4 py-2 rounded-full text-sm font-medium shadow-sm border border-green-200/50">
								🏠 {startName.length > 25 ? startName.substring(0, 25) + '...' : startName}
							</span>
							<button 
								class="text-2xl hover:text-blue-600 transition-colors cursor-pointer hover:scale-110 transform"
								on:click={swapLocations}
								title="Swap start and end locations"
							>
								🔄
							</button>
							<span class="bg-gradient-to-r from-blue-100 to-blue-50 px-4 py-2 rounded-full text-sm font-medium shadow-sm border border-blue-200/50">
								🏁 {endName.length > 25 ? endName.substring(0, 25) + '...' : endName}
							</span>
						</div>
						
						<!-- Quick Preferred Time Input -->
						{#if preferredDepartureTime}
							<div class="flex items-center justify-center space-x-3 text-sm">
								<span class="text-gray-600">⏰ Preferred departure:</span>
								<input 
									type="time" 
									bind:value={preferredDepartureTime}
									on:change={handlePreferredTimeChange}
									class="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
								<button
									type="button"
									on:click={() => { preferredDepartureTime = ''; handlePreferredTimeChange({ detail: { preferredDepartureTime: '' }}); }}
									class="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
								>
									Clear
								</button>
							</div>
						{/if}
					</div>
				</Card>
				
				
				<!-- Provider Comparison -->
				{#if showComparison}
					<WeatherProviderComparison 
						{comparisonData}
						location={{ lat: start.lat, lon: start.lng, name: startName }}
					/>
				{/if}
				
				<RouteWeatherDisplay 
					{start} 
					{end} 
					{estimatedTravelTimeMinutes}
					{selectedProvider}
					{preferredDepartureTime}
					autoFetch={true}
					bind:availableProviders
				/>
				
				<!-- Footer only shown on results page -->
				<footer class="text-center mt-8 space-y-3">
					<div class="text-xs text-gray-500">
						<p>Weather providers: 
							<a href="https://www.weatherapi.com/" class="underline hover:text-blue-600 cursor-pointer">WeatherAPI</a> • 
							<a href="https://openweathermap.org/" class="underline hover:text-blue-600 cursor-pointer">OpenWeatherMap</a> • 
							<a href="https://www.tomorrow.io/" class="underline hover:text-blue-600 cursor-pointer">Tomorrow.io</a> • 
							Address search by <a href="https://nominatim.openstreetmap.org/" class="underline hover:text-blue-600 cursor-pointer">OpenStreetMap</a>
						</p>
					</div>
					<div class="text-xs text-gray-400 flex items-center justify-center gap-4">
						<span>© {new Date().getFullYear()} Karel Čančara</span>
						<a href="https://www.linkedin.com/in/kcancara/" class="flex items-center gap-1 hover:text-blue-600 cursor-pointer" target="_blank" rel="noopener" aria-label="LinkedIn profile">
							<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
								<path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/>
							</svg>
						</a>
						<a href="mailto:karel.cancara@gmail.com" class="flex items-center gap-1 hover:text-blue-600 cursor-pointer" aria-label="Send email">
							<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
								<path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
							</svg>
						</a>
					</div>
				</footer>
			</div>
		</div>
		
		<!-- Settings Modal -->
		<SettingsModal 
			bind:isOpen={showSettingsModal}
			bind:selectedProvider
			bind:availableProviders
			bind:showComparison
			bind:preferredDepartureTime
			bind:estimatedTravelTimeMinutes
			on:close={() => showSettingsModal = false}
			on:providerChange={handleSettingsModalProviderChange}
			on:toggleComparison={handleToggleComparison}
			on:preferredTimeChange={handlePreferredTimeChange}
			on:travelTimeChange={handleTravelTimeChange}
		/>
	{/if}
{/if}
