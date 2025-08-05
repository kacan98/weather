<script lang="ts">
	interface Location {
		lat: number;
		lng: number;
	}
	
	export let start: Location;
	export let end: Location;
	
	let showAdvanced = false;
	
	function toggleAdvanced() {
		showAdvanced = !showAdvanced;
	}
	
	function swapLocations() {
		const temp = { ...start };
		start = { ...end };
		end = temp;
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
			<label class="block text-sm font-medium text-gray-700 mb-2">
				🏠 Start Location (Home)
			</label>
			<div class="space-y-2">
				<input 
					type="number" 
					bind:value={start.lat}
					step="0.00001"
					class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
					placeholder="Latitude"
					readonly={!showAdvanced}
				/>
				<input 
					type="number" 
					bind:value={start.lng}
					step="0.00001"
					class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
					placeholder="Longitude"
					readonly={!showAdvanced}
				/>
			</div>
		</div>
		
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-2">
				🏢 End Location (Work)
			</label>
			<div class="space-y-2">
				<input 
					type="number" 
					bind:value={end.lat}
					step="0.00001"
					class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
					placeholder="Latitude"
					readonly={!showAdvanced}
				/>
				<input 
					type="number" 
					bind:value={end.lng}
					step="0.00001"
					class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
					placeholder="Longitude"
					readonly={!showAdvanced}
				/>
			</div>
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
		<span class="bg-green-100 px-3 py-1 rounded-full text-sm">
			🏠 {start.lat.toFixed(4)}, {start.lng.toFixed(4)}
		</span>
		<span class="text-2xl">→</span>
		<span class="bg-blue-100 px-3 py-1 rounded-full text-sm">
			🏢 {end.lat.toFixed(4)}, {end.lng.toFixed(4)}
		</span>
	</div>
	
	<div class="text-center text-xs text-gray-500 mt-3">
		🚴‍♂️ Bicycle route mode • Weather along the path
	</div>
</div>