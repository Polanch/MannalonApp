import { useEffect, useState } from 'react'
import WeatherDashboard from './WeatherDashboard.jsx'

const FARM_ADMIN_API = 'http://localhost:8080/api/farm-admin'

function FarmAdminWeather() {
    const [farmId, setFarmId] = useState(null)
    const [isResolving, setIsResolving] = useState(true)

    useEffect(() => {
        let isActive = true

        async function loadFarmId() {
            try {
                const response = await fetch(`${FARM_ADMIN_API}/farms`, { credentials: 'include' })
                if (!response.ok) throw new Error('Unable to load farms.')
                const data = await response.json()
                const located = (Array.isArray(data) ? data : []).find((farm) => farm.farmId && farm.hasGeolocation)
                if (isActive) setFarmId(located ? located.farmId : null)
            } catch {
                if (isActive) setFarmId(null)
            } finally {
                if (isActive) setIsResolving(false)
            }
        }

        loadFarmId()
        return () => { isActive = false }
    }, [])

    if (isResolving) {
        return <main className="weather-page"><p className="weather-message">Loading your farm weather...</p></main>
    }

    return <WeatherDashboard farmId={farmId} />
}

export default FarmAdminWeather
