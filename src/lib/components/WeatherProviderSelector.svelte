<script>
	import { createEventDispatcher } from 'svelte';
	
	export let selectedProvider = 'weatherapi';
	export let availableProviders = [];
	export let showComparison = false;
	
	const dispatch = createEventDispatcher();
	
	function handleProviderChange(providerId) {
		selectedProvider = providerId;
		dispatch('providerChange', { providerId });
	}
	
	function toggleComparison() {
		showComparison = !showComparison;
		dispatch('toggleComparison', { show: showComparison });
	}
</script>

<div class="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-sm">
	<div class="flex items-center justify-between mb-3">
		<h3 class="font-semibold text-gray-800">Weather Provider</h3>
		{#if availableProviders.length > 1}
			<button
				onclick={toggleComparison}
				class="text-sm text-blue-600 hover:text-blue-800 transition-colors"
			>
				{showComparison ? 'Hide' : 'Compare'} Providers
			</button>
		{/if}
	</div>
	
	{#if availableProviders.length > 0}
		<div class="space-y-2">
			{#each availableProviders as provider}
				<label class="flex items-center space-x-2 cursor-pointer group">
					<input
						type="radio"
						bind:group={selectedProvider}
						value={provider.id}
						onchange={() => handleProviderChange(provider.id)}
						class="text-blue-600 focus:ring-blue-500"
					/>
					<span class="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
						{provider.name}
					</span>
					<span class="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
						Available
					</span>
				</label>
			{/each}
		</div>
	{:else}
		<div class="text-sm text-gray-500">
			No weather providers available. Please check your API keys.
		</div>
	{/if}
</div>