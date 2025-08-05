<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import LocationSearch from './LocationSearch.svelte';
	
	interface Location {
		lat: number;
		lng: number;
	}
	
	export let start: Location;
	export let end: Location;
	export let startName = '';
	export let endName = '';
	
	const dispatch = createEventDispatcher();
	
	// Make sure the names are exported so parent can set them
	
	function swapLocations() {
		const temp = { ...start };
		const tempName = startName;
		start = { ...end };
		end = temp;
		startName = endName;
		endName = tempName;
		
		// Emit update
		dispatch('update', { start, end, startName, endName });
	}
	
	function handleStartSelect(event: CustomEvent) {
		start = { lat: event.detail.lat, lng: event.detail.lng };
		startName = event.detail.name;
		
		// Emit update
		dispatch('update', { start, end, startName, endName });
	}
	
	function handleEndSelect(event: CustomEvent) {
		end = { lat: event.detail.lat, lng: event.detail.lng };
		endName = event.detail.name;
		
		// Emit update
		dispatch('update', { start, end, startName, endName });
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
	
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
		<LocationSearch 
			label="Start Location" 
			icon="🏠" 
			placeholder="Search for your home address..."
			bind:value={startName}
			on:select={handleStartSelect}
		/>
		
		<LocationSearch 
			label="End Location" 
			icon="🏢" 
			placeholder="Search for your work address..."
			bind:value={endName}
			on:select={handleEndSelect}
		/>
	</div>
	
	{#if startName && endName}
		<div class="flex items-center justify-center space-x-4 text-gray-700 bg-green-50 rounded-lg p-4 border border-green-200">
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