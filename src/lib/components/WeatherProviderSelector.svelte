<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Button from './ui/Button.svelte';
	import Card from './ui/Card.svelte';
	import { designSystem } from '$lib/styles/design-system';
	
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

<Card variant="compact">
	<div class="flex items-center justify-between">
		<span class="{designSystem.typography.body.label} mr-3">Weather Source:</span>
		{#if availableProviders.length > 0}
			<div class="flex {designSystem.spacing.inline}">
				{#each availableProviders as provider}
					<Button
						variant={selectedProvider === provider.id ? 'active' : 'secondary'}
						size="sm"
						on:click={() => handleProviderChange(provider.id)}
					>
						{provider.name}
					</Button>
				{/each}
			</div>
		{:else}
			<div class="{designSystem.typography.body.small} {designSystem.animations.pulse}">
				Loading providers...
			</div>
		{/if}
	</div>
</Card>