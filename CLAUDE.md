# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Bike Weather - A SvelteKit application that analyzes weather conditions along bike routes to recommend optimal departure times. The app provides route-specific weather forecasts and bike-friendly ratings.

## Commands

### Development
- `npm run dev` - Start development server (port 5173)
- `npm run build` - Build production version
- `npm run preview` - Preview production build
- `npm run check` - Run Svelte checks with TypeScript validation
- `npm run check:watch` - Run checks in watch mode

## Architecture

### Tech Stack
- **Framework**: SvelteKit with Svelte 5
- **Language**: TypeScript/JavaScript (mixed, using jsconfig.json for type checking)
- **Styling**: Tailwind CSS v4 (using @tailwindcss/vite)
- **Deployment**: Vercel adapter configured

### Project Structure
- `/src/routes/` - Page components and API endpoints
  - `/api/` - Server-side API endpoints (TypeScript)
    - `route-weather` - Main endpoint for route weather analysis
    - `bike-route` - Bike-friendly routing with OpenRouteService/GraphHopper
    - `search` - Location autocomplete
    - `weather` - Legacy weather endpoint
- `/src/lib/components/` - Reusable Svelte components
  - `BikeRouteMap.svelte` - Interactive map display
  - `LocationSearch.svelte` - Location autocomplete input
  - `RouteInput.svelte` - Route selection interface
  - `RouteWeatherDisplay.svelte` - Weather results display

### API Integration Pattern
The app uses a dual-API architecture:
1. **WeatherAPI.com** (Required) - Weather data and location search
2. **OpenRouteService/GraphHopper** (Optional) - Real bike routing, falls back to straight-line calculation if unavailable

Server endpoints handle API keys securely using `$env/static/private`. The route-weather endpoint attempts to fetch actual bike routes from the bike-route endpoint, falling back to straight-line interpolation.

### Key Implementation Details

#### Weather Rating System
The app calculates bike-friendly scores (1-10) based on:
- Temperature (optimal: 15-22°C)
- Wind speed (penalties above 15 km/h)
- Precipitation and rain chance
- Visibility and UV levels

See `calculateBikeRating()` in src/routes/api/route-weather/+server.ts:76

#### Route Point Generation
Routes are sampled at multiple points for weather analysis:
- With routing API: Uses actual route coordinates
- Fallback: 5 evenly-spaced points along straight line
- Each point includes progress percentage for time calculations

#### Environment Variables
Required in `.env`:
```
WEATHER_API_KEY=your_weatherapi_key
OPENROUTESERVICE_API_KEY=optional_routing_key
GRAPHHOPPER_API_KEY=optional_routing_key
```

### Component Communication
- Route state is managed via URL parameters for shareability
- Components use Svelte's event system for updates
- API responses follow consistent `{success, data/error}` structure

### Styling Patterns
- Tailwind CSS for all styling
- Mobile-responsive design
- Color-coded weather ratings (green/yellow/orange/red)
- Consistent button and card styling patterns

## Development Notes

- TypeScript checking is enabled but not enforced (allowJs: true)
- The app preserves route state in URL for bookmarking/sharing
- API calls include proper error handling with user-friendly messages
- Map integration uses Leaflet.js (loaded in BikeRouteMap component)