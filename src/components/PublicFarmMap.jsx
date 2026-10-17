import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { API_ORIGIN } from '../services/farmerApi.js'

const DEFAULT_CENTER = [18.356, 121.64]

const farmPinIcon = L.divIcon({
    className: 'farm-map-pin-wrapper',
    html: '<span class="farm-map-pin" aria-hidden="true"></span>',
    iconSize: [28, 38],
    iconAnchor: [14, 38],
})

function PublicFarmMap() {
    const mapElementRef = useRef(null)
    const mapRef = useRef(null)
    const [farmLocations, setFarmLocations] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let active = true
        fetch(`${API_ORIGIN}/api/farm-locations`)
            .then(async (response) => {
                if (!response.ok) throw new Error('Unable to load farm locations.')
                return response.json()
            })
            .then((locations) => {
                if (active) setFarmLocations(locations)
            })
            .catch((requestError) => {
                if (active) setError(requestError.message || 'Unable to load the farm map.')
            })
            .finally(() => {
                if (active) setIsLoading(false)
            })
        return () => { active = false }
    }, [])

    useEffect(() => {
        if (isLoading || !mapElementRef.current || mapRef.current) return undefined

        const map = L.map(mapElementRef.current).setView(DEFAULT_CENTER, 11)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        }).addTo(map)

        const bounds = []
        farmLocations.forEach((farm) => {
            const position = [Number(farm.latitude), Number(farm.longitude)]
            if (!position.every(Number.isFinite)) return
            bounds.push(position)

            const marker = L.marker(position, { icon: farmPinIcon }).addTo(map)
            const label = document.createElement('span')
            label.textContent = farm.farmName
            marker.bindTooltip(label, {
                permanent: true,
                direction: 'right',
                className: 'public-farm-marker-label',
                offset: [12, -18],
            })

            const popup = document.createElement('div')
            const name = document.createElement('strong')
            name.textContent = farm.farmName
            const address = document.createElement('div')
            address.textContent = farm.locationAddress
            popup.append(name, address)
            marker.bindPopup(popup)
        })

        if (bounds.length === 1) {
            map.setView(bounds[0], 15)
        } else if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [60, 60] })
        }
        mapRef.current = map
        window.setTimeout(() => map.invalidateSize(), 0)

        return () => {
            map.remove()
            mapRef.current = null
        }
    }, [farmLocations, isLoading])

    return (
        <section className="farm-map-section" aria-labelledby="farm-map-title">
            <div className="farm-map-copy">
                <p className="farm-map-eyebrow">Local farm network</p>
                <h2 id="farm-map-title">Farms across our community</h2>
                <p>Explore approved farms that have shared their exact location.</p>
            </div>
            {error ? (
                <p className="farm-map-message" role="alert">{error}</p>
            ) : (
                <>
                    <div ref={mapElementRef} className={`public-farm-map${isLoading ? ' is-hidden' : ''}`} aria-label="Map of registered farms" />
                    {isLoading && <p className="farm-map-message">Loading farm map...</p>}
                    {!isLoading && farmLocations.length === 0 && <p className="farm-map-message">No farms have added a map location yet.</p>}
                </>
            )}
        </section>
    )
}

export default PublicFarmMap
