import { useCallback, useEffect, useMemo, useState } from 'react'
import '../assets/styles/weather.css'
import { fetchFarmLocations, fetchWeather, getBrowserLocation } from '../services/weatherApi.js'

const WEATHER_CODES = {
    0: ['Clear sky', '☀️'],
    1: ['Mainly clear', '🌤️'],
    2: ['Partly cloudy', '⛅'],
    3: ['Overcast', '☁️'],
    45: ['Fog', '🌫️'],
    48: ['Rime fog', '🌫️'],
    51: ['Light drizzle', '🌦️'],
    53: ['Drizzle', '🌦️'],
    55: ['Heavy drizzle', '🌧️'],
    61: ['Light rain', '🌦️'],
    63: ['Rain', '🌧️'],
    65: ['Heavy rain', '🌧️'],
    71: ['Light snow', '🌨️'],
    73: ['Snow', '🌨️'],
    75: ['Heavy snow', '❄️'],
    80: ['Rain showers', '🌦️'],
    81: ['Rain showers', '🌧️'],
    82: ['Heavy rain showers', '⛈️'],
    95: ['Thunderstorm', '⛈️'],
    96: ['Thunderstorm with hail', '⛈️'],
    99: ['Thunderstorm with hail', '⛈️'],
}

function weatherDescription(code) {
    return WEATHER_CODES[code] || ['Changing conditions', '🌤️']
}

function formatDay(date) {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(`${date}T12:00:00`))
}

function formatTime(dateTime) {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(dateTime))
}

function getDirection(degrees) {
    return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degrees / 45) % 8]
}

function getFarmGuidance(weather) {
    const currentCode = weather.current.weather_code
    const rainChance = Math.max(...weather.daily.precipitation_probability_max.slice(0, 2))
    if ([95, 96, 99].includes(currentCode)) return 'Thunderstorms are possible. Avoid field work and keep people and equipment under shelter.'
    if (rainChance >= 70) return 'Rain is likely soon. Consider delaying spraying, fertilizer application, and drying activities.'
    if (weather.current.temperature_2m >= 34) return 'Hot conditions expected. Check irrigation, protect livestock from heat, and schedule heavy work early.'
    if (weather.current.wind_speed_10m >= 30) return 'Strong winds are present. Secure loose materials and postpone spraying.'
    return 'Conditions look suitable for routine field work. Continue checking the forecast before spraying or harvesting.'
}

function WeatherDashboard({ session, farmId }) {
    const resolvedFarmId = farmId ?? session?.farmId
    const [weather, setWeather] = useState(null)
    const [location, setLocation] = useState(null)
    const [locationSource, setLocationSource] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [lastUpdated, setLastUpdated] = useState(null)

    const loadWeather = useCallback(async () => {
        try {
            setIsLoading(true)
            setError('')
            const locations = await fetchFarmLocations()
            const farmLocation = locations.find((item) => Number(item.farmId) === Number(resolvedFarmId))
            const nextLocation = farmLocation
                ? { latitude: Number(farmLocation.latitude), longitude: Number(farmLocation.longitude), label: farmLocation.locationAddress, farmName: farmLocation.farmName }
                : { ...(await getBrowserLocation()), label: 'Your current location' }
            const data = await fetchWeather(nextLocation)
            setLocation(nextLocation)
            setLocationSource(farmLocation ? 'Registered farm location' : 'Browser location')
            setWeather(data)
            setLastUpdated(new Date())
        } catch (requestError) {
            setError(requestError.message || 'Unable to load the weather forecast.')
        } finally {
            setIsLoading(false)
        }
    }, [resolvedFarmId])

    useEffect(() => {
        const timer = window.setTimeout(loadWeather, 0)
        return () => window.clearTimeout(timer)
    }, [loadWeather])

    const currentDescription = useMemo(
        () => weather ? weatherDescription(weather.current.weather_code) : ['', ''],
        [weather],
    )

    if (isLoading) {
        return <main className="weather-page"><p className="weather-message">Loading your farm weather...</p></main>
    }

    if (error) {
        return (
            <main className="weather-page">
                <section className="weather-card weather-error" role="alert">
                    <h1>Farm weather</h1>
                    <p>{error}</p>
                    <button type="button" className="weather-button" onClick={loadWeather}>Try again</button>
                </section>
            </main>
        )
    }

    return (
        <main className="weather-page">
            <header className="weather-header">
                <div>
                    <p className="weather-eyebrow">FARM PLANNING TOOL</p>
                    <h1>Farm weather</h1>
                    <p>{location?.farmName || 'Your farm'} · {location?.label}</p>
                    <small>{locationSource}{lastUpdated ? ` · Updated ${lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</small>
                </div>
                <button type="button" className="weather-button" onClick={loadWeather}>Refresh</button>
            </header>

            <section className="weather-card weather-current-card">
                <div className="weather-current-icon" aria-hidden="true">{currentDescription[1]}</div>
                <div>
                    <p className="weather-current-temperature">{Math.round(weather.current.temperature_2m)}°C</p>
                    <h2>{currentDescription[0]}</h2>
                    <p>Feels like {Math.round(weather.current.apparent_temperature)}°C</p>
                </div>
                <div className="weather-metrics">
                    <span><strong>{weather.current.relative_humidity_2m}%</strong> Humidity</span>
                    <span><strong>{weather.current.precipitation} mm</strong> Rain now</span>
                    <span><strong>{Math.round(weather.current.wind_speed_10m)} km/h {getDirection(weather.current.wind_direction_10m)}</strong> Wind</span>
                </div>
            </section>

            <section className="weather-guidance" aria-label="Farm weather guidance">
                <span aria-hidden="true">🌱</span>
                <div><strong>Farm planning note</strong><p>{getFarmGuidance(weather)}</p></div>
            </section>

            <section className="weather-card">
                <div className="weather-section-heading">
                    <div><p className="weather-eyebrow">NEXT 7 DAYS</p><h2>Forecast</h2></div>
                    <span>Rain probability and temperature</span>
                </div>
                <div className="weather-forecast-grid">
                    {weather.daily.time.map((date, index) => {
                        const description = weatherDescription(weather.daily.weather_code[index])
                        return (
                            <article className="weather-forecast-day" key={date}>
                                <strong>{index === 0 ? 'Today' : formatDay(date)}</strong>
                                <span className="weather-day-icon" aria-hidden="true">{description[1]}</span>
                                <span>{description[0]}</span>
                                <b>{Math.round(weather.daily.temperature_2m_max[index])}° / {Math.round(weather.daily.temperature_2m_min[index])}°</b>
                                <span className="weather-rain-chance">💧 {weather.daily.precipitation_probability_max[index]}%</span>
                                <small>{weather.daily.precipitation_sum[index]} mm expected</small>
                            </article>
                        )
                    })}
                </div>
            </section>

            <section className="weather-card weather-details-card">
                <div><span>Sunrise</span><strong>{formatTime(weather.daily.sunrise[0])}</strong></div>
                <div><span>Sunset</span><strong>{formatTime(weather.daily.sunset[0])}</strong></div>
                <div><span>Max wind today</span><strong>{Math.round(weather.daily.wind_speed_10m_max[0])} km/h</strong></div>
            </section>

            <p className="weather-attribution">Weather data provided by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a>. Forecasts are guidance; follow official local weather advisories for severe weather.</p>
        </main>
    )
}

export default WeatherDashboard
