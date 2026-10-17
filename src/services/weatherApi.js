import { API_ORIGIN } from './farmerApi.js'

const WEATHER_API = 'https://api.open-meteo.com/v1/forecast'

export async function fetchFarmLocations() {
    const response = await fetch(`${API_ORIGIN}/api/farm-locations`)
    if (!response.ok) {
        throw new Error('Unable to load farm locations.')
    }
    return response.json()
}
export async function fetchWeather({ latitude, longitude }) {
    const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'precipitation',
            'weather_code',
            'wind_speed_10m',
            'wind_direction_10m',
            'is_day',
        ].join(','),
        daily: [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'precipitation_probability_max',
            'precipitation_sum',
            'wind_speed_10m_max',
            'sunrise',
            'sunset',
        ].join(','),
        timezone: 'auto',
        forecast_days: '7',
    })

    const response = await fetch(`${WEATHER_API}?${params}`)
    if (!response.ok) {
        throw new Error('Weather service is temporarily unavailable.')
    }
    return response.json()
}

export function getBrowserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('This browser does not support location services.'))
            return
        }

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
            () => reject(new Error('No farm location is registered and browser location access was not granted.')),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 15 * 60 * 1000 },
        )
    })
}
