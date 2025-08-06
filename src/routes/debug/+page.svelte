<script>
	let lat = 59.3293;  // Stockholm coordinates for testing
	let lon = 18.0686;
	let weatherData = null;
	let loading = false;

	async function debugWeather() {
		loading = true;
		try {
			const response = await fetch('/api/debug-weather', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ lat, lon })
			});
			
			const result = await response.json();
			weatherData = result;
		} catch (error) {
			weatherData = { error: error.message };
		}
		loading = false;
	}
</script>

<div class="min-h-screen bg-gray-100 p-4">
	<div class="max-w-4xl mx-auto">
		<h1 class="text-2xl font-bold mb-4">WeatherAPI Debug Tool</h1>
		
		<div class="bg-white rounded-lg p-4 mb-4">
			<h2 class="text-lg font-semibold mb-2">Test Location</h2>
			<div class="flex gap-4 items-center">
				<input bind:value={lat} type="number" step="0.0001" placeholder="Latitude" class="border rounded px-2 py-1" />
				<input bind:value={lon} type="number" step="0.0001" placeholder="Longitude" class="border rounded px-2 py-1" />
				<button onclick={debugWeather} disabled={loading} class="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50">
					{loading ? 'Loading...' : 'Debug Weather API'}
				</button>
			</div>
		</div>
		
		{#if weatherData}
			<div class="bg-white rounded-lg p-4">
				<h2 class="text-lg font-semibold mb-2">API Response Analysis</h2>
				
				{#if weatherData.success}
					<div class="space-y-4">
						<div>
							<h3 class="font-medium text-green-600">✅ Current Weather Fields:</h3>
							<div class="text-sm bg-gray-50 p-2 rounded mt-1">
								{weatherData.data.fieldAnalysis.currentFields.join(', ')}
							</div>
						</div>
						
						<div>
							<h3 class="font-medium text-green-600">✅ Forecast Hour Fields:</h3>
							<div class="text-sm bg-gray-50 p-2 rounded mt-1">
								{weatherData.data.fieldAnalysis.forecastHourFields.join(', ')}
							</div>
						</div>
						
						<div>
							<h3 class="font-medium text-green-600">✅ Forecast Day Fields:</h3>
							<div class="text-sm bg-gray-50 p-2 rounded mt-1">
								{weatherData.data.fieldAnalysis.forecastDayFields.join(', ')}
							</div>
						</div>
						
						{#if weatherData.data.current.current}
							<div>
								<h3 class="font-medium text-blue-600">🌡️ Current Precipitation Data:</h3>
								<div class="text-sm bg-blue-50 p-2 rounded mt-1">
									<div><strong>precip_mm:</strong> {weatherData.data.current.current.precip_mm}</div>
									<div><strong>humidity:</strong> {weatherData.data.current.current.humidity}%</div>
									<div><strong>condition:</strong> {weatherData.data.current.current.condition.text}</div>
								</div>
							</div>
						{/if}
						
						{#if weatherData.data.forecast.forecast?.forecastday?.[0]?.hour?.[0]}
							<div>
								<h3 class="font-medium text-blue-600">☔ First Hour Forecast Precipitation:</h3>
								{@const hour = weatherData.data.forecast.forecast.forecastday[0].hour[0]}
								<div class="text-sm bg-blue-50 p-2 rounded mt-1">
									<div><strong>precip_mm:</strong> {hour.precip_mm}</div>
									<div><strong>chance_of_rain:</strong> {hour.chance_of_rain}%</div>
									<div><strong>condition:</strong> {hour.condition.text}</div>
								</div>
							</div>
						{/if}
						
						<div>
							<h3 class="font-medium text-gray-600">📝 Raw Response (truncated):</h3>
							<pre class="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-96">{JSON.stringify(weatherData, null, 2)}</pre>
						</div>
					</div>
				{:else}
					<div class="text-red-600">
						<strong>Error:</strong> {weatherData.error}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>