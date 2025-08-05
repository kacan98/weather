<script lang="ts">
	import TimeMatrix from '$lib/components/TimeMatrix.svelte';
	import RouteInput from '$lib/components/RouteInput.svelte';
	
	interface Location {
		lat: number;
		lng: number;
	}
	
	let start: Location = { lat: 57.01226, lng: 9.9808 }; // Your home
	let end: Location = { lat: 57.0521, lng: 9.91543 }; // Your work
</script>

<div class="min-h-screen bg-gray-100">
	<div class="max-w-6xl mx-auto p-6">
		<header class="text-center mb-8">
			<h1 class="text-4xl font-bold text-blue-600 mb-2">🚴‍♂️ Bike Weather</h1>
			<p class="text-gray-600">Check weather conditions for different departure times</p>
		</header>
		
		<RouteInput bind:start bind:end />
		
		<TimeMatrix {start} {end} />
		
		<footer class="text-center mt-8 text-sm text-gray-500">
			<p>Weather data from Morecast.com via route planning API</p>
		</footer>
	</div>
</div>
