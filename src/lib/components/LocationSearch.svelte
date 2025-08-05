<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	interface Location {
		lat: number;
		lng: number;
	}
	
	interface SearchResult {
		name: string;
		lat: number;
		lng: number;
		country?: string;
		region?: string;
	}
	
	export let placeholder = 'Search for a location...';
	export let label = 'Location';
	export let icon = '📍';
	
	const dispatch = createEventDispatcher<{ select: Location & { name: string } }>();
	
	// Generate unique ID for this component instance
	const inputId = `location-input-${Math.random().toString(36).substr(2, 9)}`;
	
	let query = '';
	let results: SearchResult[] = [];
	let loading = false;
	let showResults = false;
	let searchTimeout: number;
	
	async function searchLocations(searchQuery: string) {
		if (searchQuery.length < 2) {
			results = [];
			showResults = false;
			return;
		}
		
		loading = true;
		
		try {
			const response = await fetch('/api/search', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ query: searchQuery })
			});
			
			const result = await response.json();
			
			if (result.success) {
				results = result.data || [];
				showResults = true;
			} else {
				console.error('Search error:', result.error);
				results = [];
				showResults = false;
			}
		} catch (error) {
			console.error('Search request failed:', error);
			results = [];
			showResults = false;
		} finally {
			loading = false;
		}
	}
	
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		query = target.value;
		
		// Debounce search
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			searchLocations(query);
		}, 300);
	}
	
	function selectLocation(location: SearchResult) {
		query = location.name;
		showResults = false;
		dispatch('select', {
			lat: location.lat,
			lng: location.lng,
			name: location.name
		});
	}
	
	function handleBlur() {
		// Delay hiding results to allow clicking
		setTimeout(() => {
			showResults = false;
		}, 200);
	}
	
	function handleFocus() {
		if (results.length > 0) {
			showResults = true;
		}
	}
</script>

<div class="relative">
	<label for={inputId} class="block text-sm font-medium text-gray-700 mb-2">
		{icon} {label}
	</label>
	
	<div class="relative">
		<input
			id={inputId}
			type="text"
			bind:value={query}
			oninput={handleInput}
			onblur={handleBlur}
			onfocus={handleFocus}
			{placeholder}
			class="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			autocomplete="off"
		/>
		
		{#if loading}
			<div class="absolute right-3 top-2.5">
				<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
			</div>
		{/if}
	</div>
	
	{#if showResults && results.length > 0}
		<div class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
			{#each results as location, index}
				<button
					class="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
					onclick={() => selectLocation(location)}
				>
					<div class="font-medium text-gray-900">{location.name}</div>
					{#if location.region || location.country}
						<div class="text-sm text-gray-500">
							{#if location.region}{location.region}{/if}
							{#if location.region && location.country}, {/if}
							{#if location.country}{location.country}{/if}
						</div>
					{/if}
					<div class="text-xs text-gray-400 mt-1">
						{location.lat.toFixed(4)}, {location.lng.toFixed(4)}
					</div>
				</button>
			{/each}
		</div>
	{:else if showResults && !loading && query.length >= 2}
		<div class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
			<div class="text-gray-500 text-sm">No locations found for "{query}"</div>
		</div>
	{/if}
</div>