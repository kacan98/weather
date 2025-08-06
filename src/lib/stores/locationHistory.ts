import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface SavedLocation {
	id: string;
	name: string;
	displayName: string;
	lat: number;
	lng: number;
	alias?: 'home' | 'work';
	isAlias: boolean;
	lastUsed: Date;
	useCount: number;
}

// Default aliases
const defaultAliases: SavedLocation[] = [
	{
		id: 'home-placeholder',
		name: 'Set Home Location',
		displayName: '🏠 Home',
		lat: 0,
		lng: 0,
		alias: 'home',
		isAlias: true,
		lastUsed: new Date(),
		useCount: 0
	},
	{
		id: 'work-placeholder',
		name: 'Set Work Location',
		displayName: '🏢 Work',
		lat: 0,
		lng: 0,
		alias: 'work',
		isAlias: true,
		lastUsed: new Date(),
		useCount: 0
	}
];

function createLocationHistoryStore() {
	const { subscribe, set, update } = writable<SavedLocation[]>([]);

	return {
		subscribe,
		
		// Initialize the store
		init() {
			if (!browser) return;
			
			try {
				const stored = localStorage.getItem('locationHistory');
				if (stored) {
					const locations: SavedLocation[] = JSON.parse(stored).map((loc: any) => ({
						...loc,
						lastUsed: new Date(loc.lastUsed)
					}));
					
					// Merge with default aliases if they don't exist
					const hasHome = locations.some(loc => loc.alias === 'home');
					const hasWork = locations.some(loc => loc.alias === 'work');
					
					const finalLocations = [...locations];
					if (!hasHome) finalLocations.unshift(defaultAliases[0]);
					if (!hasWork) finalLocations.splice(hasHome ? 1 : 0, 0, defaultAliases[1]);
					
					set(finalLocations);
				} else {
					// First time - set default aliases
					set([...defaultAliases]);
				}
			} catch (error) {
				console.error('Failed to load location history:', error);
				set([...defaultAliases]);
			}
		},
		
		// Add or update a location
		addLocation(location: { name: string; lat: number; lng: number }) {
			if (!browser) return;
			
			update(locations => {
				// Check if location already exists
				const existing = locations.find(loc => 
					Math.abs(loc.lat - location.lat) < 0.001 && 
					Math.abs(loc.lng - location.lng) < 0.001
				);
				
				if (existing && !existing.isAlias) {
					// Update existing location
					existing.lastUsed = new Date();
					existing.useCount += 1;
					// Move to top of recent locations
					return [existing, ...locations.filter(loc => loc.id !== existing.id)];
				} else {
					// Add new location
					const newLocation: SavedLocation = {
						id: `loc-${Date.now()}`,
						name: location.name,
						displayName: location.name,
						lat: location.lat,
						lng: location.lng,
						isAlias: false,
						lastUsed: new Date(),
						useCount: 1
					};
					
					// Keep aliases at top, then recent locations (max 8 recent)
					const aliases = locations.filter(loc => loc.isAlias);
					const recent = locations.filter(loc => !loc.isAlias).slice(0, 7);
					
					const updated = [...aliases, newLocation, ...recent];
					this.save(updated);
					return updated;
				}
			});
		},
		
		// Set an alias (Home/Work)
		setAlias(alias: 'home' | 'work', location: { name: string; lat: number; lng: number }) {
			if (!browser) return;
			
			update(locations => {
				const updated = locations.map(loc => {
					if (loc.alias === alias) {
						return {
							...loc,
							name: location.name,
							displayName: alias === 'home' ? '🏠 Home' : '🏢 Work',
							lat: location.lat,
							lng: location.lng,
							lastUsed: new Date(),
							useCount: loc.useCount + 1
						};
					}
					return loc;
				});
				
				this.save(updated);
				return updated;
			});
		},
		
		// Get location by alias
		getAlias(alias: 'home' | 'work'): SavedLocation | null {
			let result: SavedLocation | null = null;
			subscribe(locations => {
				const found = locations.find(loc => loc.alias === alias);
				result = (found && found.lat !== 0 && found.lng !== 0) ? found : null;
			})();
			return result;
		},
		
		// Remove a location
		removeLocation(id: string) {
			if (!browser) return;
			
			update(locations => {
				const updated = locations.filter(loc => loc.id !== id);
				this.save(updated);
				return updated;
			});
		},
		
		// Save to localStorage
		save(locations: SavedLocation[]) {
			if (!browser) return;
			
			try {
				localStorage.setItem('locationHistory', JSON.stringify(locations));
			} catch (error) {
				console.error('Failed to save location history:', error);
			}
		},
		
		// Clear all history (but keep aliases)
		clearHistory() {
			if (!browser) return;
			
			update(locations => {
				const aliases = locations.filter(loc => loc.isAlias);
				this.save(aliases);
				return aliases;
			});
		}
	};
}

export const locationHistory = createLocationHistoryStore();