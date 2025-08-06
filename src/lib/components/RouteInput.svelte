<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import LocationSearch from './LocationSearch.svelte';
	import { locationHistory, type SavedLocation } from '$lib/stores/locationHistory';
	import { designSystem } from '$lib/styles/design-system';
	
	interface Location {
		lat: number;
		lng: number;
	}
	
	export let start: Location;
	export let end: Location;
	export let startName = '';
	export let endName = '';
	export let preferredDepartureTime = ''; // Format: HH:MM, empty means "now"
	
	const dispatch = createEventDispatcher();
	let savedLocations: SavedLocation[] = [];
	
	onMount(() => {
		locationHistory.init();
		locationHistory.subscribe(locations => {
			savedLocations = locations;
		});
	});
	
	// Make sure the names are exported so parent can set them
	
	function swapLocations() {
		const temp = { ...start };
		const tempName = startName;
		start = { ...end };
		end = temp;
		startName = endName;
		endName = tempName;
		
		// Emit update
		dispatch('update', { start, end, startName, endName, preferredDepartureTime });
	}
	
	function handleStartSelect(event: CustomEvent) {
		start = { lat: event.detail.lat, lng: event.detail.lng };
		startName = event.detail.name;
		
		// Add to history if it's a new search result
		locationHistory.addLocation({
			name: event.detail.name,
			lat: event.detail.lat,
			lng: event.detail.lng
		});
		
		// Emit update
		dispatch('update', { start, end, startName, endName, preferredDepartureTime });
	}
	
	function handleEndSelect(event: CustomEvent) {
		end = { lat: event.detail.lat, lng: event.detail.lng };
		endName = event.detail.name;
		
		// Add to history if it's a new search result
		locationHistory.addLocation({
			name: event.detail.name,
			lat: event.detail.lat,
			lng: event.detail.lng
		});
		
		// Emit update
		dispatch('update', { start, end, startName, endName, preferredDepartureTime });
	}
	
	function selectSavedLocation(location: SavedLocation, isStart: boolean) {
		if (location.lat === 0 && location.lng === 0) {
			// This is a placeholder alias, ignore
			return;
		}
		
		if (isStart) {
			start = { lat: location.lat, lng: location.lng };
			startName = location.name;
		} else {
			end = { lat: location.lat, lng: location.lng };
			endName = location.name;
		}
		
		// Update use count
		locationHistory.addLocation({
			name: location.name,
			lat: location.lat,
			lng: location.lng
		});
		
		// Emit update
		dispatch('update', { start, end, startName, endName, preferredDepartureTime });
	}
	
	function setAlias(alias: 'home' | 'work', location: { name: string; lat: number; lng: number }) {
		locationHistory.setAlias(alias, location);
	}
	
	function getQuickAccessLocations() {
		return savedLocations.filter(loc => loc.isAlias || (!loc.isAlias && loc.useCount > 0)).slice(0, 6);
	}
</script>

<div class="bg-white rounded-lg shadow-md p-6">
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-xl font-semibold">📍 Choose Your Route</h2>
		{#if startName && endName}
			<button 
				class="text-gray-600 hover:text-blue-600 text-sm cursor-pointer transition-colors"
				on:click={swapLocations}
			>
				🔄 Swap
			</button>
		{/if}
	</div>
	
	<!-- Quick Access Locations -->
	{#if getQuickAccessLocations().length > 0}
		<div class="mb-4">
			<h3 class="text-sm font-medium text-gray-700 mb-2">Quick Access</h3>
			<div class="flex flex-wrap gap-2">
				{#each getQuickAccessLocations() as location}
					<div class="flex items-center gap-1">
						<button
							class="px-3 py-1.5 text-xs rounded-full border transition-colors cursor-pointer
							{location.lat === 0 && location.lng === 0 ? 'bg-gray-100 text-gray-400 border-gray-300' : 'bg-white hover:bg-blue-50 border-gray-300 hover:border-blue-400'}"
							on:click={() => selectSavedLocation(location, true)}
							disabled={location.lat === 0 && location.lng === 0}
						>
							{location.displayName}
						</button>
						<button
							class="px-2 py-1.5 text-xs rounded-full border transition-colors cursor-pointer
							{location.lat === 0 && location.lng === 0 ? 'bg-gray-100 text-gray-400 border-gray-300' : 'bg-white hover:bg-green-50 border-gray-300 hover:border-green-400'}"
							on:click={() => selectSavedLocation(location, false)}
							disabled={location.lat === 0 && location.lng === 0}
							title="Set as destination"
						>
							→
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}
	
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
		<div>
			<LocationSearch 
				label="Start Location" 
				icon="🏠" 
				placeholder="Search for your start location..."
				bind:value={startName}
				on:select={handleStartSelect}
			/>
			{#if startName && start.lat && start.lng}
				<div class="mt-2 flex gap-2">
					<button
						class="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors cursor-pointer"
						on:click={() => setAlias('home', { name: startName, lat: start.lat, lng: start.lng })}
					>
						Set as 🏠 Home
					</button>
					<button
						class="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 rounded transition-colors cursor-pointer"
						on:click={() => setAlias('work', { name: startName, lat: start.lat, lng: start.lng })}
					>
						Set as 🏢 Work
					</button>
				</div>
			{/if}
		</div>
		
		<div>
			<LocationSearch 
				label="End Location" 
				icon="🏢" 
				placeholder="Search for your destination..."
				bind:value={endName}
				on:select={handleEndSelect}
			/>
			{#if endName && end.lat && end.lng}
				<div class="mt-2 flex gap-2">
					<button
						class="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded transition-colors cursor-pointer"
						on:click={() => setAlias('home', { name: endName, lat: end.lat, lng: end.lng })}
					>
						Set as 🏠 Home
					</button>
					<button
						class="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 rounded transition-colors cursor-pointer"
						on:click={() => setAlias('work', { name: endName, lat: end.lat, lng: end.lng })}
					>
						Set as 🏢 Work
					</button>
				</div>
			{/if}
		</div>
	</div>
	
	<!-- Preferred Departure Time -->
	<div class="mt-4">
		<label for="preferred-time" class="block text-sm font-medium text-gray-700 mb-2">
			⏰ When would you like to leave? (optional)
		</label>
		<div class="flex items-center gap-3">
			<input 
				id="preferred-time"
				type="time" 
				bind:value={preferredDepartureTime}
				on:change={() => dispatch('update', { start, end, startName, endName, preferredDepartureTime })}
				class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			/>
			<span class="text-sm text-gray-500">Leave empty for "now"</span>
			{#if preferredDepartureTime}
				<button
					type="button"
					on:click={() => { preferredDepartureTime = ''; dispatch('update', { start, end, startName, endName, preferredDepartureTime }); }}
					class="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
				>
					Clear
				</button>
			{/if}
		</div>
	</div>
	
	{#if startName && endName}
		<div class="flex items-center justify-center space-x-4 text-gray-700 bg-green-50 rounded-lg p-4 border border-green-200 mt-4">
			<span class="bg-green-100 px-3 py-1 rounded-full text-sm font-medium">
				🏠 {startName.length > 25 ? startName.substring(0, 25) + '...' : startName}
			</span>
			<span class="text-2xl text-green-600">→</span>
			<span class="bg-blue-100 px-3 py-1 rounded-full text-sm font-medium">
				🏢 {endName.length > 25 ? endName.substring(0, 25) + '...' : endName}
			</span>
		</div>
	{/if}
</div>