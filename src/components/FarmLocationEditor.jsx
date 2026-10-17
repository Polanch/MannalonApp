import { useCallback, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { API_ORIGIN, getApiErrorMessage } from '../services/farmerApi.js'

const DEFAULT_CENTER = [18.356, 121.64]
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'

const farmPinIcon = L.divIcon({
    className: 'farm-map-pin-wrapper',
    html: '<span class="farm-map-pin" aria-hidden="true"></span>',
    iconSize: [28, 38],
    iconAnchor: [14, 38],
})

function normalizeLocation(location) {
    if (!location) return null
    return {
        ...location,
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
    }
}

function toLocation(result, fallbackCoordinates) {
    const latitude = Number(result.lat ?? fallbackCoordinates?.latitude)
    const longitude = Number(result.lon ?? fallbackCoordinates?.longitude)
    const providerPlaceId = result.osm_type && result.osm_id
        ? `${result.osm_type}:${result.osm_id}`
        : result.place_id != null ? String(result.place_id) : ''

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !result.display_name || !providerPlaceId) {
        throw new Error('OpenStreetMap returned an incomplete location.')
    }

    return {
        latitude,
        longitude,
        locationAddress: result.display_name,
        locationProvider: 'OPENSTREETMAP',
        providerPlaceId,
    }
}

function FarmLocationEditor({ farmId, onSaved }) {
    const locationUrl = `${API_ORIGIN}/api/farm-admin/farms/${farmId}/location`
    const mapElementRef = useRef(null)
    const mapRef = useRef(null)
    const markerRef = useRef(null)
    const locationRef = useRef(null)
    const nextNominatimRequestRef = useRef(0)
    const [location, setLocation] = useState(null)
    const [addressSearch, setAddressSearch] = useState('')
    const [loadError, setLoadError] = useState('')
    const [formError, setFormError] = useState('')
    const [notice, setNotice] = useState('')
    const [isLoading, setIsLoading] = useState(Boolean(farmId))
    const [isResolving, setIsResolving] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (!farmId) return undefined
        let active = true

        fetch(locationUrl, { credentials: 'include' })
            .then(async (response) => {
                if (!response.ok) {
                    const body = await response.json().catch(() => null)
                    throw new Error(body?.message || 'Unable to load the farm location.')
                }
                return response.status === 204 ? null : response.json()
            })
            .then((data) => {
                if (!active) return
                locationRef.current = normalizeLocation(data)
                setLocation(locationRef.current)
                setAddressSearch(data?.locationAddress || '')
            })
            .catch((error) => {
                if (active) setLoadError(error.message || 'Unable to load the farm location.')
            })
            .finally(() => {
                if (active) setIsLoading(false)
            })

        return () => { active = false }
    }, [farmId, locationUrl])

    const applyLocation = useCallback((nextLocation) => {
        locationRef.current = nextLocation
        setLocation(nextLocation)
        setAddressSearch(nextLocation.locationAddress)
        markerRef.current?.setLatLng([nextLocation.latitude, nextLocation.longitude])
        mapRef.current?.setView([nextLocation.latitude, nextLocation.longitude], 17)
        setNotice('')
        setFormError('')
    }, [])

    const paceNominatimRequest = useCallback(async () => {
        const now = Date.now()
        const scheduledAt = Math.max(now, nextNominatimRequestRef.current)
        nextNominatimRequestRef.current = scheduledAt + 1100
        if (scheduledAt > now) {
            await new Promise((resolve) => window.setTimeout(resolve, scheduledAt - now))
        }
    }, [])

    const reverseCoordinates = useCallback(async (latitude, longitude) => {
        try {
            setIsResolving(true)
            setFormError('')
            await paceNominatimRequest()
            const params = new URLSearchParams({
                format: 'jsonv2',
                lat: String(latitude),
                lon: String(longitude),
                zoom: '18',
                addressdetails: '1',
            })
            const response = await fetch(`${NOMINATIM_URL}/reverse?${params}`, {
                headers: { 'Accept-Language': 'en' },
            })
            if (!response.ok) throw new Error('OpenStreetMap could not resolve that point.')
            applyLocation(toLocation(await response.json(), { latitude, longitude }))
        } catch (error) {
            setFormError(error.message || 'Unable to resolve that location.')
        } finally {
            setIsResolving(false)
        }
    }, [applyLocation, paceNominatimRequest])

    useEffect(() => {
        if (isLoading || !mapElementRef.current || mapRef.current) return undefined

        const initial = locationRef.current
        const center = initial ? [initial.latitude, initial.longitude] : DEFAULT_CENTER
        const map = L.map(mapElementRef.current).setView(center, initial ? 17 : 12)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        }).addTo(map)

        const marker = L.marker(center, {
            draggable: true,
            icon: farmPinIcon,
            opacity: initial ? 1 : 0,
        }).addTo(map)

        mapRef.current = map
        markerRef.current = marker
        map.on('click', ({ latlng }) => {
            marker.setOpacity(1)
            reverseCoordinates(latlng.lat, latlng.lng)
        })
        marker.on('dragend', () => {
            const coordinates = marker.getLatLng()
            reverseCoordinates(coordinates.lat, coordinates.lng)
        })
        window.setTimeout(() => map.invalidateSize(), 0)

        return () => {
            map.remove()
            mapRef.current = null
            markerRef.current = null
        }
    }, [isLoading, reverseCoordinates])

    async function searchAddress(event) {
        event.preventDefault()
        const address = addressSearch.trim()
        if (!address) {
            setFormError('Enter an address to search.')
            return
        }

        try {
            setIsResolving(true)
            setFormError('')
            await paceNominatimRequest()
            const params = new URLSearchParams({
                format: 'jsonv2',
                q: address,
                limit: '1',
                addressdetails: '1',
            })
            const response = await fetch(`${NOMINATIM_URL}/search?${params}`, {
                headers: { 'Accept-Language': 'en' },
            })
            if (!response.ok) throw new Error('OpenStreetMap address search failed.')
            const results = await response.json()
            if (!results.length) throw new Error('OpenStreetMap did not find a matching location.')
            markerRef.current?.setOpacity(1)
            applyLocation(toLocation(results[0]))
        } catch (error) {
            setFormError(error.message || 'Unable to search for that address.')
        } finally {
            setIsResolving(false)
        }
    }

    function useCurrentLocation() {
        if (!navigator.geolocation) {
            setFormError('Location services are not supported by this browser.')
            return
        }
        setIsResolving(true)
        setFormError('')
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                markerRef.current?.setOpacity(1)
                reverseCoordinates(coords.latitude, coords.longitude)
            },
            () => {
                setIsResolving(false)
                setFormError('Your current location could not be read. Allow location access or select the farm on the map.')
            },
            { enableHighAccuracy: true, timeout: 10000 },
        )
    }

    async function saveLocation() {
        if (!location?.providerPlaceId || !location?.locationAddress) {
            setFormError('Select the farm location on the map before saving.')
            return
        }

        try {
            setIsSaving(true)
            setFormError('')
            setNotice('')
            const response = await fetch(locationUrl, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(location),
            })
            if (!response.ok) {
                const error = new Error('Unable to save the farm location.')
                error.response = { data: await response.json().catch(() => null) }
                throw error
            }
            const saved = normalizeLocation(await response.json())
            locationRef.current = saved
            setLocation(saved)
            setNotice('Farm location saved and added to the general farm map.')
            onSaved?.(saved)
        } catch (error) {
            setFormError(getApiErrorMessage(error, error.message || 'Unable to save the farm location.'))
        } finally {
            setIsSaving(false)
        }
    }

    if (!farmId) return null

    return (
        <section className="fa-profile-card farm-location-editor" aria-labelledby="farm-location-title">
            <div className="farm-location-heading">
                <div>
                    <h2 id="farm-location-title">Farm location</h2>
                    <p>Search, click the map, or drag the pin to mark the exact farm location.</p>
                </div>
                <button type="button" className="farm-admin-secondary-button" onClick={useCurrentLocation} disabled={isLoading || isResolving}>
                    Use current location
                </button>
            </div>

            <form className="farm-location-search" onSubmit={searchAddress}>
                <label className="fa-profile-field">
                    <span>Location address</span>
                    <input
                        value={addressSearch}
                        onChange={(event) => setAddressSearch(event.target.value)}
                        placeholder="Search for the farm address"
                        disabled={isLoading || isResolving}
                    />
                </label>
                <button type="submit" className="farm-admin-secondary-button" disabled={isLoading || isResolving}>
                    {isResolving ? 'Locating...' : 'Search'}
                </button>
            </form>

            {isLoading && <p className="fa-profile-muted">Loading farm map...</p>}
            {loadError && <p className="admin-alert admin-alert-error" role="alert">{loadError}</p>}
            <div ref={mapElementRef} className={`farm-location-map${isLoading ? ' is-hidden' : ''}`} aria-label="Select the farm location on the map" />

            {location && (
                <dl className="farm-location-details">
                    <div><dt>Latitude</dt><dd>{location.latitude.toFixed(7)}</dd></div>
                    <div><dt>Longitude</dt><dd>{location.longitude.toFixed(7)}</dd></div>
                    <div><dt>OpenStreetMap ID</dt><dd>{location.providerPlaceId}</dd></div>
                </dl>
            )}
            {formError && <p className="admin-alert admin-alert-error" role="alert">{formError}</p>}
            {notice && <p className="admin-alert admin-alert-success" role="status">{notice}</p>}
            <p className="farm-map-attribution-note">
                Map data and address search © OpenStreetMap contributors.
            </p>
            <div className="farm-location-actions">
                <button type="button" className="farm-admin-primary-button" onClick={saveLocation} disabled={!location || isSaving || isResolving}>
                    {isSaving ? 'Saving...' : 'Save farm location'}
                </button>
            </div>
        </section>
    )
}

export default FarmLocationEditor
