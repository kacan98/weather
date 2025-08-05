<script lang="ts">
	import LocationSearch from './LocationSearch.svelte';
	
	interface Location {
		lat: number;
		lng: number;
	}
	
	export let start: Location;
	export let end: Location;
	
	let showAdvanced = false;
	let startName = 'Home';
	let endName = 'Work';
	
	function toggleAdvanced() {
		showAdvanced = !showAdvanced;
	}
	
	function swapLocations() {
		const temp = { ...start };
		const tempName = startName;
		start = { ...end };
		end = temp;
		startName = endName;
		endName = tempName;
	}
	
	function handleStartSelect(event: CustomEvent) {
		start = { lat: event.detail.lat, lng: event.detail.lng };
		startName = event.detail.name;
	}
	
	function handleEndSelect(event: CustomEvent) {
		end = { lat: event.detail.lat, lng: event.detail.lng };
		endName = event.detail.name;
	}
</script>

<div class="bg-white rounded-lg shadow-md p-6">
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-xl font-semibold">📍 Route Configuration</h2>
		<button 
			class="text-blue-600 text-sm hover:underline"
			onclick={toggleAdvanced}
		>
			{showAdvanced ? 'Hide' : 'Show'} Advanced
		</button>
	</div>
	
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
		<div>
			<LocationSearch 
				label="Start Location" 
				icon="🏠" 
				placeholder="Search for your home address..."
				onselect={handleStartSelect}
			/>
			
			{#if showAdvanced}
				<div class="mt-3 space-y-2">
					<input 
						type="number" 
						bind:value={start.lat}
						step="0.00001"
						class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
						placeholder="Latitude"
					/>
					<input 
						type="number" 
						bind:value={start.lng}
						step="0.00001"
						class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
						placeholder="Longitude"
					/>
				</div>
			{/if}
		</div>
		
		<div>
			<LocationSearch 
				label="End Location" 
				icon="🏢" 
				placeholder="Search for your work address..."
				onselect={handleEndSelect}
			/>
			
			{#if showAdvanced}
				<div class="mt-3 space-y-2">
					<input 
						type="number" 
						bind:value={end.lat}
						step="0.00001"
						class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
						placeholder="Latitude"
					/>
					<input 
						type="number" 
						bind:value={end.lng}
						step="0.00001"
						class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
						placeholder="Longitude"
					/>
				</div>
			{/if}
		</div>
	</div>
	
	{#if showAdvanced}
		<div class="flex justify-center mb-4">
			<button 
				class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm"
				onclick={swapLocations}
			>
				🔄 Swap Start ↔ End
			</button>
		</div>
	{/if}
	
	<div class="flex items-center justify-center space-x-4 text-gray-700 bg-gray-50 rounded-lg p-4">
		<span class="bg-green-100 px-3 py-1 rounded-full text-sm font-medium">
			🏠 {startName}
		</span>
		<span class="text-2xl">→</span>
		<span class="bg-blue-100 px-3 py-1 rounded-full text-sm font-medium">
			🏢 {endName}
		</span>
	</div>
	
	{#if showAdvanced}
		<div class="text-center text-xs text-gray-500 mt-2">
			Coordinates: {start.lat.toFixed(5)}, {start.lng.toFixed(5)} → {end.lat.toFixed(5)}, {end.lng.toFixed(5)}
		</div>
	{/if}
	
	<div class="text-center text-xs text-gray-500 mt-3">
		🚴‍♂️ Bicycle route mode • Weather along the path
	</div>
</div>