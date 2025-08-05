<script lang="ts">
	interface Location {
		lat: number;
		lng: number;
	}
	
	interface TimeSlot {
		time: string;
		label: string;
		weather: any;
		loading: boolean;
		error: string | null;
	}
	
	export let start: Location;
	export let end: Location;
	
	// Create time slots for now, +15, +30, +45 minutes
	let timeSlots: TimeSlot[] = [
		{ time: getCurrentTime(), label: 'Now', weather: null, loading: false, error: null },
		{ time: addMinutes(15), label: '+15min', weather: null, loading: false, error: null },
		{ time: addMinutes(30), label: '+30min', weather: null, loading: false, error: null },
		{ time: addMinutes(45), label: '+45min', weather: null, loading: false, error: null }
	];
	
	function getCurrentTime(): string {
		const now = new Date();
		return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
	}
	
	function addMinutes(minutes: number): string {
		const now = new Date();
		now.setMinutes(now.getMinutes() + minutes);
		return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
	}
	
	async function fetchWeatherForTime(index: number) {
		const slot = timeSlots[index];
		slot.loading = true;
		slot.error = null;
		
		try {
			const response = await fetch('/api/weather', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					start,
					end,
					departureTime: slot.time
				})
			});
			
			const result = await response.json();
			
			if (result.success) {
				slot.weather = result.data;
			} else {
				slot.error = result.error || 'Unknown error';
			}
		} catch (err) {
			slot.error = err instanceof Error ? err.message : 'Network error';
		} finally {
			slot.loading = false;
		}
		
		// Trigger reactivity
		timeSlots = [...timeSlots];
	}
	
	async function loadAllWeather() {
		// Load all time slots in parallel
		const promises = timeSlots.map((_, index) => fetchWeatherForTime(index));
		await Promise.all(promises);
	}
	
	function getWeatherIcon(weather: any): string {
		if (!weather?.route?.weather) return '❓';
		
		// Simple weather icon mapping based on conditions
		const conditions = weather.route.weather[0]?.condition?.toLowerCase() || '';
		
		if (conditions.includes('rain')) return '🌧️';
		if (conditions.includes('cloud')) return '☁️';
		if (conditions.includes('sun')) return '☀️';
		if (conditions.includes('clear')) return '☀️';
		
		return '🌤️';
	}
	
	function getRainProbability(weather: any): number {
		return weather?.route?.weather?.[0]?.rain_probability || 0;
	}
	
	function getTemperature(weather: any): string {
		const temp = weather?.route?.weather?.[0]?.temperature;
		return temp ? `${temp}°C` : 'N/A';
	}
	
	function getWindSpeed(weather: any): string {
		const wind = weather?.route?.weather?.[0]?.wind_speed;
		return wind ? `${wind} km/h` : 'N/A';
	}
</script>

<div class="bg-white rounded-lg shadow-md p-6">
	<div class="flex justify-between items-center mb-6">
		<h2 class="text-xl font-semibold">Weather Timeline</h2>
		<button 
			class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
			onclick={loadAllWeather}
		>
			Load All Weather
		</button>
	</div>
	
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		{#each timeSlots as slot, index}
			<div class="border rounded-lg p-4 bg-gray-50">
				<div class="text-center mb-3">
					<div class="text-lg font-semibold">{slot.label}</div>
					<div class="text-sm text-gray-600">{slot.time}</div>
				</div>
				
				{#if slot.loading}
					<div class="text-center py-4">
						<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
						<div class="text-sm text-gray-500 mt-2">Loading...</div>
					</div>
				{:else if slot.error}
					<div class="text-center py-4">
						<div class="text-red-500 text-sm">{slot.error}</div>
						<button 
							class="text-blue-600 text-sm mt-2 hover:underline"
							onclick={() => fetchWeatherForTime(index)}
						>
							Retry
						</button>
					</div>
				{:else if slot.weather}
					<div class="text-center space-y-2">
						<div class="text-3xl">{getWeatherIcon(slot.weather)}</div>
						<div class="text-sm space-y-1">
							<div class="font-medium">{getTemperature(slot.weather)}</div>
							<div class="text-blue-600">🌧️ {getRainProbability(slot.weather)}%</div>
							<div class="text-gray-600">💨 {getWindSpeed(slot.weather)}</div>
						</div>
					</div>
				{:else}
					<div class="text-center py-4">
						<button 
							class="text-blue-600 text-sm hover:underline"
							onclick={() => fetchWeatherForTime(index)}
						>
							Load Weather
						</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>
	
	<div class="mt-6 text-xs text-gray-500 text-center">
		🚴‍♂️ Weather conditions along your bike route from home to work
	</div>
</div>