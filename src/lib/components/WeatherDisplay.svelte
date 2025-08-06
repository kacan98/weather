<script lang="ts">
	interface WeatherData {
		location: {
			name: string;
			country: string;
			lat: number;
			lng: number;
		};
		current: {
			temp_c: number;
			condition: string;
			wind_kph: number;
			wind_dir: string;
			humidity: number;
			feels_like_c: number;
			precip_mm: number;
			chance_of_rain?: number;
			icon: string;
		};
		forecast: Array<{
			date: string;
			maxtemp_c: number;
			mintemp_c: number;
			condition: string;
			icon: string;
			maxwind_kph: number;
			totalprecip_mm: number;
			daily_chance_of_rain: number;
			hourly: Array<{
				time: string;
				temp_c: number;
				condition: string;
				icon: string;
				wind_kph: number;
				wind_dir: string;
				precip_mm: number;
				chance_of_rain: number;
			}>;
		}>;
	}

	export let start: { lat: number; lng: number };

	let weatherData: WeatherData | null = null;
	let loading = false;
	let error = '';

	async function fetchWeather(lat: number, lng: number) {
		loading = true;
		error = '';
		
		try {
			const response = await fetch('/api/weather', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					lat,
					lng,
					days: 3
				})
			});
			
			const result = await response.json();
			
			if (result.success) {
				weatherData = result.data;
			} else {
				error = result.error || 'Failed to fetch weather data';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	function formatTime(timeString: string): string {
		return new Date(timeString).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
	}

	function getWindIcon(speed: number): string {
		if (speed < 5) return '🌀';
		if (speed < 15) return '💨';
		if (speed < 25) return '🌬️';
		return '🌪️';
	}

	function getRainColor(chance: number): string {
		if (chance < 20) return 'text-green-600';
		if (chance < 50) return 'text-yellow-600';
		if (chance < 80) return 'text-orange-600';
		return 'text-red-600';
	}

	// Fetch weather for start location when component loads
	$: if (start.lat && start.lng) {
		fetchWeather(start.lat, start.lng);
	}
</script>

<div class="bg-white rounded-lg shadow-md p-6">
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-xl font-semibold">🚴‍♂️ Bike Weather Forecast</h2>
		<button
			class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
			onclick={() => fetchWeather(start.lat, start.lng)}
			disabled={loading}
		>
			{loading ? 'Loading...' : '🔄 Refresh'}
		</button>
	</div>

	{#if error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
			<p class="font-medium">Error:</p>
			<p>{error}</p>
			{#if error.includes('API key')}
				<p class="mt-2 text-sm">
					Get your free API key from 
					<a href="https://www.weatherapi.com/" target="_blank" class="underline">WeatherAPI.com</a>
					and add it to your environment variables as WEATHER_API_KEY
				</p>
			{/if}
		</div>
	{/if}

	{#if loading}
		<div class="text-center py-8">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-2 text-gray-600">Fetching weather data...</p>
		</div>
	{/if}

	{#if weatherData}
		<div class="space-y-6">
			<!-- Current Weather -->
			<div class="bg-blue-50 rounded-lg p-4">
				<h3 class="font-medium mb-3">📍 Current Weather - {weatherData.location.name}, {weatherData.location.country}</h3>
				<div class="flex items-center space-x-4">
					<img src="https:{weatherData.current.icon}" alt={weatherData.current.condition} class="w-16 h-16" />
					<div>
						<p class="text-2xl font-bold">{weatherData.current.temp_c}°C</p>
						<p class="text-gray-600">{weatherData.current.condition}</p>
						<p class="text-sm">Feels like {weatherData.current.feels_like_c}°C</p>
					</div>
					<div class="text-sm space-y-1">
						<p>{getWindIcon(weatherData.current.wind_kph)} Wind: {weatherData.current.wind_kph} km/h {weatherData.current.wind_dir}</p>
						<p>💧 Humidity: {weatherData.current.humidity}%</p>
						<p>🌧️ Precipitation: {weatherData.current.precip_mm} mm</p>
					</div>
				</div>
			</div>

			<!-- Hourly Forecast for Today -->
			{#if weatherData.forecast[0]?.hourly}
				<div>
					<h3 class="font-medium mb-3">⏰ Today's Hourly Forecast (Perfect for Planning Your Ride!)</h3>
					<div class="overflow-x-auto">
						<div class="flex space-x-4 pb-4">
							{#each weatherData.forecast[0].hourly.slice(new Date().getHours()) as hour}
								<div class="flex-shrink-0 bg-gray-50 rounded-lg p-3 w-32 text-center">
									<p class="font-medium text-sm">{formatTime(hour.time)}</p>
									<img src="https:{hour.icon}" alt={hour.condition} class="w-8 h-8 mx-auto my-2" />
									<p class="text-lg font-bold">{hour.temp_c}°C</p>
									<p class="text-xs text-gray-600 mb-1">{hour.condition}</p>
									<p class="text-xs">{getWindIcon(hour.wind_kph)} {hour.wind_kph} km/h</p>
									<p class="text-xs {getRainColor(hour.chance_of_rain)}">
										🌧️ {hour.chance_of_rain}%
									</p>
									{#if hour.precip_mm > 0}
										<p class="text-xs text-blue-600">{hour.precip_mm}mm</p>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			<!-- 3-Day Forecast -->
			<div>
				<h3 class="font-medium mb-3">📅 3-Day Forecast</h3>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					{#each weatherData.forecast as day}
						<div class="bg-gray-50 rounded-lg p-4">
							<p class="font-medium">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
							<div class="flex items-center mt-2">
								<img src="https:{day.icon}" alt={day.condition} class="w-12 h-12" />
								<div class="ml-3">
									<p class="font-bold">{day.maxtemp_c}° / {day.mintemp_c}°</p>
									<p class="text-sm text-gray-600">{day.condition}</p>
								</div>
							</div>
							<div class="mt-3 text-sm space-y-1">
								<p>{getWindIcon(day.maxwind_kph)} Max Wind: {day.maxwind_kph} km/h</p>
								<p class="{getRainColor(day.daily_chance_of_rain)}">🌧️ Rain: {day.daily_chance_of_rain}%</p>
								{#if day.totalprecip_mm > 0}
									<p class="text-blue-600">💧 {day.totalprecip_mm}mm total</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>