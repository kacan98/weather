# 🚴‍♂️ Smart Bike Weather

A smart weather app for cyclists that analyzes weather conditions along your bike route and recommends the best departure times. Get detailed weather forecasts for different departure intervals to plan your perfect ride!

## Features

- 🗺️ **Route-based Weather**: Enter start and end locations to get weather analysis along your entire route
- ⏰ **Smart Timing**: See weather conditions for the next 2 hours in 15-minute intervals
- 🏆 **Best Time Recommendations**: AI-powered scoring system recommends optimal departure times
- 🔍 **Location Search**: Autocomplete search powered by WeatherAPI.com
- 🚴‍♂️ **Bike-Specific Ratings**: Weather conditions rated specifically for cycling comfort and safety
- ⚠️ **Smart Alerts**: Get warnings for rain, strong winds, extreme temperatures, and high UV

## Setup

1. **Install dependencies**:
   ```sh
   npm install
   ```

2. **Get a WeatherAPI.com API key**:
   - Visit [WeatherAPI.com](https://www.weatherapi.com/)
   - Sign up for a free account
   - Get your API key

3. **Configure environment variables**:
   - Copy `.env.example` to `.env`
   - Add your WeatherAPI.com API key:
     ```
     WEATHER_API_KEY=your_api_key_here
     ```

## Development

Start the development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## How It Works

1. **Enter Your Route**: Use the location search to find your start and end points
2. **Set Travel Time**: Adjust the estimated travel time for your bike ride
3. **Get Recommendations**: The app analyzes weather conditions and provides:
   - Weather forecasts at start, middle, and end of your route
   - Bike-friendly ratings (1-10 scale) for each departure time
   - Specific alerts for rain, wind, temperature, and UV conditions
   - Overall recommendation for the best time to leave

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
- `POST /api/weather` - Simple weather forecast (legacy)

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
- **WeatherAPI.com** - Weather data and location search

## License

MIT
