<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type * as L from 'leaflet';

	interface Location {
		lat: number;
		lng: number;
	}

	interface BikeRoutePoint {
		lat: number;
		lng: number;
		progress?: number;
	}

	interface WeatherRoutePoint {
		location: {
			lat: number;
			lng: number;
			progress: number;
		};
		weather?: any;
		bikeRating?: any;
	}

	export let start: Location;
	export let end: Location;
	export let weatherPoints: WeatherRoutePoint[] = [];
	export let selectedDepartureTime: string | undefined = undefined;
	export let estimatedTravelTimeMinutes: number = 30;

	let mapContainer: HTMLDivElement;
	let map: L.Map | null = null;
	let routeLayer: any;
	let weatherMarkers: any[] = [];
	let leafletLoaded = false;
	let routingService = 'Loading...';
	let routeDistance = 0;

	// Fetch bike route from our API
	async function fetchBikeRoute(start: Location, end: Location): Promise<BikeRoutePoint[]> {
		try {
			const response = await fetch('/api/bike-route', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ start, end })
			});
			
			const result = await response.json();
			if (result.success) {
				routingService = result.metadata?.routingService || 'Unknown';
				routeDistance = result.metadata?.totalDistance || 0;
				return result.routePoints;
			} else {
				console.error('Route fetch failed:', result.error);
				routingService = 'Fallback';
				return generateFallbackRoute(start, end);
			}
		} catch (error) {
			console.error('Route fetch error:', error);
			routingService = 'Fallback';
			return generateFallbackRoute(start, end);
		}
	}

	// Fallback to simple interpolation if routing service fails
	function generateFallbackRoute(start: Location, end: Location): BikeRoutePoint[] {
		const points: BikeRoutePoint[] = [];
		const numPoints = 5;
		
		for (let i = 0; i < numPoints; i++) {
			const progress = i / (numPoints - 1);
			points.push({
				lat: start.lat + (end.lat - start.lat) * progress,
				lng: start.lng + (end.lng - start.lng) * progress,
				progress
			});
		}
		
		return points;
	}

	function getWeatherIcon(iconUrl: string): string {
		// Convert WeatherAPI icon to emoji for map markers
		if (!iconUrl) return '🌤️';
		
		const url = iconUrl.toLowerCase();
		if (url.includes('sun') || url.includes('clear')) return '☀️';
		if (url.includes('cloud') && url.includes('sun')) return '⛅';
		if (url.includes('cloud')) return '☁️';
		if (url.includes('rain') || url.includes('drizzle')) return '🌧️';
		if (url.includes('snow')) return '❄️';
		if (url.includes('thunder') || url.includes('storm')) return '⛈️';
		if (url.includes('fog') || url.includes('mist')) return '🌫️';
		return '🌤️';
	}

	// Smart weather point spacing based on total distance
	function getOptimalWeatherPoints(route: BikeRoutePoint[], totalDistanceKm: number): number[] {
		const points = route.length;
		if (points === 0) return [];
		
		let spacing: number;
		if (totalDistanceKm <= 10) {
			spacing = Math.max(1, Math.floor(points / 3)); // 3 points max for short routes
		} else if (totalDistanceKm <= 25) {
			spacing = Math.max(1, Math.floor(points / 5)); // ~5km spacing
		} else if (totalDistanceKm <= 50) {
			spacing = Math.max(1, Math.floor(points / 7)); // ~7km spacing  
		} else if (totalDistanceKm <= 100) {
			spacing = Math.max(1, Math.floor(points / 10)); // ~10km spacing
		} else {
			spacing = Math.max(1, Math.floor(points / 15)); // ~15km spacing for very long routes
		}
		
		const indices = [];
		indices.push(0); // Always include start
		
		for (let i = spacing; i < points - spacing; i += spacing) {
			indices.push(i);
		}
		
		if (points > 1) {
			indices.push(points - 1); // Always include end
		}
		
		return [...new Set(indices)].sort((a, b) => a - b); // Remove duplicates and sort
	}

	// Calculate distance between points
	function calculateDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
		const R = 6371; // Earth's radius in km
		const dLat = (p2.lat - p1.lat) * Math.PI / 180;
		const dLng = (p2.lng - p1.lng) * Math.PI / 180;
		const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
				Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
				Math.sin(dLng/2) * Math.sin(dLng/2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		return R * c;
	}

	// Calculate total route distance
	function calculateRouteDistance(route: BikeRoutePoint[]): number {
		let totalDistance = 0;
		for (let i = 1; i < route.length; i++) {
			totalDistance += calculateDistance(route[i-1], route[i]);
		}
		return totalDistance;
	}

	function getRatingColor(score: number): string {
		if (score >= 8) return '#10b981'; // green
		if (score >= 6) return '#f59e0b'; // yellow
		if (score >= 4) return '#f97316'; // orange
		return '#ef4444'; // red
	}

	async function loadLeaflet() {
		if (!browser || leafletLoaded) return;
		
		try {
			// Load Leaflet CSS
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
			document.head.appendChild(link);
			
			// Load Leaflet JS
			const script = document.createElement('script');
			script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
			
			await new Promise((resolve, reject) => {
				script.onload = resolve;
				script.onerror = reject;
				document.head.appendChild(script);
			});
			
			leafletLoaded = true;
			return (window as { L?: typeof L }).L;
		} catch (error) {
			console.error('Failed to load Leaflet:', error);
			return null;
		}
	}

	async function initializeMap() {
		if (!browser || !mapContainer) return;
		
		const L = await loadLeaflet();
		if (!L) return;

		// Initialize map
		map = L.map(mapContainer).setView([start.lat, start.lng], 12);
		
		// Add OpenStreetMap tiles
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '© OpenStreetMap contributors'
		}).addTo(map);

		// Add start and end markers
		L.marker([start.lat, start.lng])
			.addTo(map)
			.bindPopup('🚩 Start')
			.openPopup();
			
		L.marker([end.lat, end.lng])
			.addTo(map)
			.bindPopup('🏁 End');

		await updateRoute();
	}

	async function updateRoute() {
		if (!map || !browser || !leafletLoaded) return;
		
		const LeafletLib = (window as { L?: typeof L }).L;
		if (!LeafletLib) return;

		console.log('Updating route...');

		// Clear existing route and markers
		if (routeLayer) {
			map.removeLayer(routeLayer);
		}
		weatherMarkers.forEach(marker => map?.removeLayer(marker));
		weatherMarkers = [];

		// Fetch actual bike route
		const route = await fetchBikeRoute(start, end);
		const totalDistance = calculateRouteDistance(route);
		
		console.log(`Route: ${route.length} points, ${totalDistance.toFixed(1)}km`);
		console.log('First few route points:', route.slice(0, 3));
		console.log('Routing service:', routingService);
		
		// Update distance if we got it from API
		if (routeDistance === 0) {
			routeDistance = totalDistance;
		}
		
		// Draw route line
		const routeCoords: L.LatLngTuple[] = route.map(point => [point.lat, point.lng] as L.LatLngTuple);
		console.log('Route coordinates sample:', routeCoords.slice(0, 3));
		
		routeLayer = LeafletLib.polyline(routeCoords, {
			color: '#3b82f6',
			weight: 4,
			opacity: 0.8
		}).addTo(map);

		// Add weather markers at start and end only if we have weather data
		if (weatherPoints && weatherPoints.length > 0) {
			console.log('Adding weather markers at start and end:', weatherPoints.length);
			
			// Start marker
			if (weatherPoints[0] && weatherPoints[0].weather && weatherPoints[0].bikeRating) {
				const startWeather = weatherPoints[0];
				const startMarker = LeafletLib.circleMarker([start.lat, start.lng], {
					radius: 14,
					fillColor: getRatingColor(startWeather.bikeRating.score),
					color: '#fff',
					weight: 3,
					opacity: 1,
					fillOpacity: 0.9
				}).addTo(map);

				const startPopupContent = `
					<div class="text-center" style="min-width: 140px;">
						<div class="text-sm font-medium mb-1 text-green-700">🚩 START</div>
						<div class="text-base font-medium mb-1">
							${getWeatherIcon(startWeather.weather.icon)} ${startWeather.weather.temp_c}°C
						</div>
						<div class="text-xs text-gray-600 mb-1">${startWeather.weather.condition}</div>
						<div class="text-xs space-y-0.5 mb-2">
							<div>💨 ${(startWeather.weather.wind_kph / 3.6).toFixed(1)} m/s</div>
							<div>💧 ${startWeather.weather.precip_mm.toFixed(1)} mm</div>
						</div>
						<div class="px-2 py-1 rounded text-xs font-medium" 
							 style="background-color: ${getRatingColor(startWeather.bikeRating.score)}; color: white;">
							🚴‍♂️ ${startWeather.bikeRating.score}/10
						</div>
						<div class="text-xs text-gray-600 mt-1">Departure: ${selectedDepartureTime ? new Date(selectedDepartureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Now'}</div>
					</div>
				`;
				
				startMarker.bindPopup(startPopupContent, {
					autoClose: false,
					closeOnClick: false
				}).openPopup();
				
				weatherMarkers.push(startMarker);
			}

			// End marker
			if (weatherPoints.length > 1) {
				const endWeather = weatherPoints[weatherPoints.length - 1];
				if (endWeather && endWeather.weather && endWeather.bikeRating) {
					const endMarker = LeafletLib.circleMarker([end.lat, end.lng], {
						radius: 14,
						fillColor: getRatingColor(endWeather.bikeRating.score),
						color: '#fff',
						weight: 3,
						opacity: 1,
						fillOpacity: 0.9
					}).addTo(map);

					// Calculate estimated arrival time based on selected departure time
					const departureTime = selectedDepartureTime ? new Date(selectedDepartureTime) : new Date();
					const arrivalTime = new Date(departureTime.getTime() + estimatedTravelTimeMinutes * 60000);
					const arrivalTimeStr = arrivalTime.toLocaleTimeString('en-US', {
						hour: '2-digit',
						minute: '2-digit',
						hour12: false
					});

					const endPopupContent = `
						<div class="text-center" style="min-width: 140px;">
							<div class="text-sm font-medium mb-1 text-blue-700">🏁 FINISH</div>
							<div class="text-base font-medium mb-1">
								${getWeatherIcon(endWeather.weather.icon)} ${endWeather.weather.temp_c}°C
							</div>
							<div class="text-xs text-gray-600 mb-1">${endWeather.weather.condition}</div>
							<div class="text-xs space-y-0.5 mb-2">
								<div>💨 ${(endWeather.weather.wind_kph / 3.6).toFixed(1)} m/s</div>
								<div>💧 ${endWeather.weather.precip_mm.toFixed(1)} mm</div>
							</div>
							<div class="px-2 py-1 rounded text-xs font-medium" 
								 style="background-color: ${getRatingColor(endWeather.bikeRating.score)}; color: white;">
								🚴‍♂️ ${endWeather.bikeRating.score}/10
							</div>
							<div class="text-xs text-gray-600 mt-1">Arrival: ~${arrivalTimeStr}</div>
						</div>
					`;
					
					endMarker.bindPopup(endPopupContent, {
						autoClose: false,
						closeOnClick: false
					}).openPopup();
					
					weatherMarkers.push(endMarker);
				}
			}
		} else {
			console.log('No weather points to display');
		}

		// Fit map to route bounds
		if (routeCoords.length > 0) {
			map?.fitBounds(routeCoords as L.LatLngBoundsExpression, { padding: [20, 20] });
		}
	}

	// Initialize map when component mounts
	onMount(() => {
		if (start.lat && start.lng && end.lat && end.lng) {
			initializeMap();
		}
	});

	// Update route when start/end changes
	$: if (map && start.lat && start.lng && end.lat && end.lng) {
		updateRoute();
	}

	// Create a reactive key that combines weather points and departure time
	$: mapUpdateKey = JSON.stringify({
		weatherPointsLength: weatherPoints?.length || 0,
		departureTime: selectedDepartureTime,
		hasWeather: weatherPoints?.[0]?.weather !== undefined
	});

	// Update weather markers when the key changes
	$: if (map && mapUpdateKey) {
		console.log('Map update triggered by key change:', mapUpdateKey);
		updateRoute();
	}
</script>

<div class="bg-white rounded-lg shadow-md overflow-hidden">
	<div class="p-4 border-b">
		<div class="flex justify-between items-center">
			<div>
				<h3 class="text-lg font-semibold">🗺️ Bike Route & Weather Map</h3>
				<p class="text-sm text-gray-600">Interactive map showing your bike route with weather conditions</p>
			</div>
			<div class="text-right">
				{#if weatherPoints && weatherPoints.length > 0}
					<div class="text-xs text-green-600 font-medium">
						🌤️ {weatherPoints.length} weather points
					</div>
				{:else}
					<div class="text-xs text-gray-500">
						📍 Route only
					</div>
				{/if}
				<div class="text-xs text-gray-500 mt-1">
					{#if routeDistance > 0}
						📏 {routeDistance}km • 
					{/if}
					{routingService}
				</div>
			</div>
		</div>
	</div>
	
	<div class="relative">
		<div bind:this={mapContainer} class="w-full h-96"></div>
		
		<!-- Loading state -->
		{#if !leafletLoaded}
			<div class="absolute inset-0 bg-gray-100 flex items-center justify-center">
				<div class="text-center">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
					<p class="text-sm text-gray-600">Loading map...</p>
				</div>
			</div>
		{/if}
		
		<!-- Map Legend -->
		<div class="absolute top-3 right-3 bg-white rounded-lg shadow-lg p-3 text-xs">
			<div class="font-medium mb-2">Weather Rating</div>
			<div class="space-y-1">
				<div class="flex items-center">
					<div class="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
					<span>8-10: Excellent</span>
				</div>
				<div class="flex items-center">
					<div class="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
					<span>6-7: Good</span>
				</div>
				<div class="flex items-center">
					<div class="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
					<span>4-5: Fair</span>
				</div>
				<div class="flex items-center">
					<div class="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
					<span>1-3: Poor</span>
				</div>
			</div>
		</div>
	</div>
	
	<div class="p-3 bg-gray-50 text-xs text-gray-600">
		Map data © <a href="https://openstreetmap.org" class="text-blue-600 hover:underline">OpenStreetMap</a> contributors
	</div>
</div>

<style>
	/* Ensure Leaflet popup styles work */
	:global(.leaflet-popup-content-wrapper) {
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}
	
	:global(.leaflet-popup-content) {
		margin: 12px 16px;
		font-size: 13px;
		max-width: 200px;
	}
	
	:global(.leaflet-popup-tip) {
		border-radius: 2px;
	}
	
	/* Weather marker hover effect */
	:global(.leaflet-interactive:hover) {
		filter: brightness(1.1);
		transform: scale(1.1);
		transition: all 0.2s ease;
	}
</style>
