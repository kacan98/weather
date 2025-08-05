````markdown
# 🚴‍♂️ Smart Bike Weather

A smart weather app for cyclists that analyzes weather conditions along your actual bike route and recommends the best departure times. Get detailed weather forecasts for different departure intervals to plan your perfect ride!

## 🆕 New Features

- 🗺️ **Interactive Route Maps**: See your actual bike route on an interactive map with weather markers
- 🚴‍♂️ **Real Bike Routing**: Uses OpenRouteService or GraphHopper for actual bike-friendly routes (not straight lines!)
- 🌤️ **Weather Along Route**: Visual weather markers showing conditions at different points along your path
- 📱 **Better Mobile Experience**: Responsive design optimized for phones and tablets

## Features

- 🗺️ **Route-based Weather**: Enter start and end locations to get weather analysis along your entire route
- ⏰ **Smart Timing**: See weather conditions for the next 3 hours in 15-minute intervals
- 🏆 **Best Time Recommendations**: AI-powered scoring system recommends optimal departure times
- 🔍 **Location Search**: Autocomplete search powered by WeatherAPI.com
- 🚴‍♂️ **Bike-Specific Ratings**: Weather conditions rated specifically for cycling comfort and safety
- ⚠️ **Smart Alerts**: Get warnings for rain, strong winds, extreme temperatures, and high UV
- 🗺️ **Interactive Maps**: Visual route display with weather conditions marked along the path

## Setup

1. **Install dependencies**:
   ```sh
   npm install
   ```

2. **Get API keys**:

   **Required: WeatherAPI.com** (for weather data)
   - Visit [WeatherAPI.com](https://www.weatherapi.com/)
   - Sign up for a free account (1 million requests/month free)
   - Get your API key

   **Optional: OpenRouteService** (for real bike routing)
   - Visit [OpenRouteService.org](https://openrouteservice.org/)
   - Sign up for a free account (2000 requests/day free)
   - Get your API key for better bike routing

3. **Configure environment variables**:
   - Copy `.env.example` to `.env`
   - Add your API keys:
     ```
     # Required
     WEATHER_API_KEY=your_weatherapi_key_here
     
     # Optional (enables real bike routing instead of straight lines)
     OPENROUTESERVICE_API_KEY=your_openrouteservice_key_here
     ```

## Development

Start the development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## How It Works

### Basic Usage
1. **Enter Your Route**: Use the location search to find your start and end points
2. **Set Travel Time**: Adjust the estimated travel time for your bike ride
3. **Get Recommendations**: The app analyzes weather conditions and provides:
   - Interactive map showing your route
   - Weather forecasts at multiple points along your route
   - Bike-friendly ratings (1-10 scale) for each departure time
   - Specific alerts for rain, wind, temperature, and UV conditions
   - Overall recommendation for the best time to leave

### Routing Options

**With OpenRouteService API Key** (Recommended):
- Real bike-friendly routing that avoids highways
- Considers bike lanes, paths, and cycling infrastructure
- More accurate distance and time estimates
- Routes around obstacles and follows actual roads

**Without API Key** (Fallback):
- Simple straight-line routing between points
- Less accurate but still functional
- Good for short distances or when API limits are reached

### Interactive Map Features
- **Route Visualization**: See your actual path on the map
- **Weather Markers**: Click markers to see detailed weather at each point
- **Color-coded Ratings**: Green = excellent, Yellow = good, Orange = fair, Red = poor
- **Responsive Design**: Works on desktop and mobile devices

## Weather Rating System

The app uses a 10-point scoring system specifically designed for cycling:

- **🟢 8-10**: Excellent biking conditions
- **🟡 6-7**: Good biking conditions  
- **🟠 4-5**: Fair conditions - be prepared
- **🔴 1-3**: Challenging conditions

Factors considered:
- Temperature (optimal: 15-22°C)
- Wind speed (penalty for >15 km/h)
- Precipitation and rain chance
- Visibility conditions
- UV levels for sun protection

## API Endpoints

- `POST /api/search` - Location autocomplete search
- `POST /api/route-weather` - Route-based weather analysis
- `POST /api/bike-route` - Bike-friendly routing (with OpenRouteService)
- `POST /api/weather` - Simple weather forecast (legacy)

## Configuration Options

### Routing Services

The app supports multiple routing services:

1. **OpenRouteService** (Free: 2000 requests/day)
   - Best for cycling routes
   - Considers bike infrastructure
   - [Get API key](https://openrouteservice.org/)

2. **GraphHopper** (Free: 2500 requests/day)
   - Alternative routing service
   - Good bike routing capabilities
   - [Get API key](https://www.graphhopper.com/)

3. **Fallback** (No API key needed)
   - Simple straight-line routing
   - Always available as backup

### Environment Variables

```bash
# Required
WEATHER_API_KEY=your_weatherapi_key_here

# Optional routing services (pick one)
OPENROUTESERVICE_API_KEY=your_openrouteservice_key_here
GRAPHHOPPER_API_KEY=your_graphhopper_key_here
```

## Building

To create a production version:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

## Tech Stack

- **SvelteKit** - Full-stack web framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Leaflet.js** - Interactive maps
- **WeatherAPI.com** - Weather data and location search
- **OpenRouteService** - Bike-friendly routing
- **OpenStreetMap** - Map tiles and data

## Contributing

Feel free to open issues or submit pull requests! Some ideas for contributions:

- Additional routing service integrations
- More detailed weather analysis
- Better mobile experience
- Elevation profile integration
- Route preferences (scenic, fast, safe)

## License

MIT

````
