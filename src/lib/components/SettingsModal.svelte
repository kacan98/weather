<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Button from './ui/Button.svelte';
	import Card from './ui/Card.svelte';
	import WeatherProviderSelector from './WeatherProviderSelector.svelte';
	import { designSystem } from '$lib/styles/design-system';
	
	export let isOpen = false;
	export let selectedProvider = 'weatherapi';
	export let availableProviders: any[] = [];
	export let showComparison = false;
	export let preferredDepartureTime = '';
	export let estimatedTravelTimeMinutes = 30;
	
	const dispatch = createEventDispatcher();
	
	function closeModal() {
		isOpen = false;
		dispatch('close');
	}
	
	function handleProviderChange(event: any) {
		dispatch('providerChange', event.detail);
	}
	
	function handleToggleComparison(event: any) {
		dispatch('toggleComparison', event.detail);
	}
	
	function handlePreferredTimeChange() {
		dispatch('preferredTimeChange', { preferredDepartureTime });
	}
	
	function handleTravelTimeChange() {
		dispatch('travelTimeChange', { estimatedTravelTimeMinutes });
	}
	
	function clearPreferredTime() {
		preferredDepartureTime = '';
		handlePreferredTimeChange();
	}
</script>

{#if isOpen}
	<!-- Modal backdrop -->
	<div 
		class="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 cursor-pointer"
		on:click={closeModal}
		on:keydown={(e) => e.key === 'Escape' && closeModal()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="settings-title"
		tabindex="-1"
	>
		<!-- Modal content -->
		<div 
			class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
			on:click|stopPropagation
			on:keydown|stopPropagation
			role="document"
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-gray-200">
				<h2 id="settings-title" class="text-xl font-semibold text-gray-900">
					⚙️ Settings
				</h2>
				<Button
					variant="ghost"
					size="sm"
					on:click={closeModal}
					aria-label="Close settings"
					class="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1"
				>
					×
				</Button>
			</div>
			
			<!-- Content -->
			<div class="p-6 space-y-6">
				<!-- Weather Provider Selection -->
				<div>
					<h3 class="text-sm font-medium text-gray-700 mb-3">Weather Provider</h3>
					<WeatherProviderSelector 
						bind:selectedProvider
						bind:availableProviders
						bind:showComparison
						on:providerChange={handleProviderChange}
						on:toggleComparison={handleToggleComparison}
					/>
				</div>
				
				<!-- Preferred Departure Time -->
				<div>
					<label for="modal-preferred-time" class="block text-sm font-medium text-gray-700 mb-2">
						⏰ Preferred Departure Time
					</label>
					<div class="flex items-center gap-3">
						<input 
							id="modal-preferred-time"
							type="time" 
							bind:value={preferredDepartureTime}
							on:change={handlePreferredTimeChange}
							class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
						<span class="text-sm text-gray-500">Leave empty for "now"</span>
						{#if preferredDepartureTime}
							<button
								type="button"
								on:click={clearPreferredTime}
								class="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
							>
								Clear
							</button>
						{/if}
					</div>
				</div>
				
				<!-- Travel Time Estimate -->
				<div>
					<label for="travel-time" class="block text-sm font-medium text-gray-700 mb-2">
						🚴‍♂️ Estimated Travel Time
					</label>
					<div class="flex items-center gap-3">
						<input 
							id="travel-time"
							type="number" 
							min="5"
							max="180"
							bind:value={estimatedTravelTimeMinutes}
							on:change={handleTravelTimeChange}
							class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-20"
						/>
						<span class="text-sm text-gray-500">minutes</span>
					</div>
					<p class="text-xs text-gray-500 mt-1">Adjust based on your cycling speed and route difficulty</p>
				</div>
				
			</div>
			
			<!-- Footer -->
			<div class="p-6 border-t border-gray-200">
				<Button
					variant="primary"
					size="sm"
					on:click={closeModal}
					class="w-full"
				>
					Apply Settings
				</Button>
			</div>
		</div>
	</div>
{/if}