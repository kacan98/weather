<script lang="ts">
	export let comparisonData: any = {};
	export let location = { lat: 0, lon: 0, name: '' };
	
	$: providers = Object.keys(comparisonData.current || {});
	$: errors = comparisonData.errors || {};
	
	function formatValue(value: any, unit = '') {
		if (value === null || value === undefined) return 'N/A';
		if (typeof value === 'number') {
			return `${value.toFixed(1)}${unit}`;
		}
		return value;
	}
</script>

{#if providers.length > 0}
	<div class="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-sm mt-4">
		<h3 class="font-semibold text-gray-800 mb-4">Provider Comparison</h3>
		<p class="text-sm text-gray-600 mb-4">
			Comparing weather data for {location.name || `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`}
		</p>
		
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-200">
						<th class="text-left py-2 font-medium text-gray-700">Provider</th>
						<th class="text-right py-2 font-medium text-gray-700">Temperature</th>
						<th class="text-right py-2 font-medium text-gray-700">Feels Like</th>
						<th class="text-right py-2 font-medium text-gray-700">Humidity</th>
						<th class="text-right py-2 font-medium text-gray-700">Wind</th>
						<th class="text-right py-2 font-medium text-gray-700">Rain</th>
						<th class="text-left py-2 font-medium text-gray-700">Condition</th>
					</tr>
				</thead>
				<tbody>
					{#each providers as providerId}
						{@const data = comparisonData.current[providerId]}
						{@const error = errors[providerId]}
						<tr class="border-b border-gray-100">
							<td class="py-2 font-medium">
								{#if providerId === 'weatherapi'}WeatherAPI
								{:else if providerId === 'openweathermap'}OpenWeatherMap
								{:else if providerId === 'tomorrow'}Tomorrow.io
								{:else}{providerId}{/if}
							</td>
							{#if data}
								<td class="text-right py-2">{formatValue(data.temperature, '°C')}</td>
								<td class="text-right py-2">{formatValue(data.feelsLike, '°C')}</td>
								<td class="text-right py-2">{formatValue(data.humidity, '%')}</td>
								<td class="text-right py-2">{formatValue((data.windSpeed / 3.6), ' m/s', 1)}</td>
								<td class="text-right py-2">{formatValue(data.rainChance, '%')}</td>
								<td class="py-2">{data.condition}</td>
							{:else}
								<td colspan="6" class="text-red-500 text-xs py-2">
									{error || 'No data available'}
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		
		<div class="mt-4 text-xs text-gray-500">
			<p>Data accuracy may vary between providers. Consider multiple sources for critical decisions.</p>
		</div>
	</div>
{/if}