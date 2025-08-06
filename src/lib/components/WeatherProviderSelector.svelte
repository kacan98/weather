<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	export let selectedProvider = 'weatherapi';
	export let availableProviders: any[] = [];
	export let showComparison = false;
	
	const dispatch = createEventDispatcher();
	
	function handleProviderChange(providerId: string) {
		selectedProvider = providerId;
		dispatch('providerChange', { providerId });
	}
	
	function toggleComparison() {
		showComparison = !showComparison;
		dispatch('toggleComparison', { show: showComparison });
	}
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
	<div class="flex items-center justify-between">
		<span class="text-sm text-gray-600 mr-3">Weather Source:</span>
		{#if availableProviders.length > 0}
			<div class="flex gap-2">
				{#each availableProviders as provider}
					<button
						class="px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors {
							selectedProvider === provider.id 
								? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' 
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
						}"
						on:click={() => handleProviderChange(provider.id)}
					>
						{provider.name}
					</button>
				{/each}
			</div>
		{:else}
			<div class="text-sm text-gray-500">
				Loading providers...
			</div>
		{/if}
	</div>
</div>