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
	export let value = ''; // Bindable value
	
	const dispatch = createEventDispatcher<{ select: Location & { name: string } }>();
	
	// Generate unique ID for this component instance
	const inputId = `location-input-${Math.random().toString(36).substr(2, 9)}`;
	
	let query = value;
	let results: SearchResult[] = [];
	let loading = false;
	let showResults = false;
	let searchTimeout: number;
	let hasSearched = false;
	
	// Update query when value changes from parent
	$: if (value !== query) {
		query = value;
	}
	
	async function searchLocations(searchQuery: string) {
		if (searchQuery.length < 2) {
			results = [];
			showResults = false;
			hasSearched = false;
			return;
		}
		
		loading = true;
		hasSearched = true;
		
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
		value = target.value; // Update bound value
		hasSearched = false;
		
		// Auto-search with debounce
		clearTimeout(searchTimeout);
		if (query.length >= 2) {
			searchTimeout = setTimeout(() => {
				searchLocations(query);
			}, 300); // Shorter debounce for better UX
		} else {
			results = [];
			showResults = false;
		}
	}
	
	function selectLocation(location: SearchResult) {
		query = location.name;
		value = location.name; // Update the bound value prop
		showResults = false;
		dispatch('select', {
			lat: location.lat,
			lng: location.lng,
			name: location.name
		});
	}
	
	// Update query when value changes from parent
	$: if (value !== query) {
		query = value;
	}
	
	function handleBlur() {
		// Delay hiding results to allow clicking
		setTimeout(() => {
			showResults = false;
		}, 300); // Increased delay
	}
	
	function handleFocus() {
		if (results.length > 0) {
			showResults = true;
		}
	}
</script>

<div class="relative">
	<label for={inputId} class="block text-sm font-medium text-gray-700 mb-1">
		{icon} {label}
	</label>
	
	<div class="relative">
		<input
			id={inputId}
			type="text"
			bind:value={query}
			on:input={handleInput}
			on:blur={handleBlur}
			on:focus={handleFocus}
			{placeholder}
			class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
			autocomplete="off"
		/>
		
		{#if loading}
			<div class="absolute right-3 top-1/2 transform -translate-y-1/2">
				<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
			</div>
		{/if}
	</div>
	
	{#if showResults}
		<div class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
			{#if results.length > 0}
				{#each results as location, index}
					<button
						type="button"
						class="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors focus:outline-none"
						on:mousedown|preventDefault={() => selectLocation(location)}
					>
						<div class="font-medium text-gray-900 text-sm">{location.name}</div>
						{#if location.region || location.country}
							<div class="text-xs text-gray-500">
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
			{:else if hasSearched && !loading && query.length >= 2}
				<div class="px-3 py-4 text-sm text-gray-500 text-center">
					No locations found. Try a different search term.
				</div>
			{/if}
		</div>
	{/if}
</div>