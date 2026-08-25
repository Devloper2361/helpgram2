param(
    [string]$ProjectPath = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'

Write-Host "HelpGram location fix" -ForegroundColor Cyan
Write-Host "Project: $ProjectPath"

$locationFile = Join-Path $ProjectPath 'components\LocationPicker.tsx'
$createTaskFile = Join-Path $ProjectPath 'src\pages\CreateTask.tsx'

if (!(Test-Path $locationFile)) { throw "Could not find $locationFile. Run this from the HelpGram project root or pass -ProjectPath." }
if (!(Test-Path $createTaskFile)) { throw "Could not find $createTaskFile. Run this from the HelpGram project root or pass -ProjectPath." }

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDir = Join-Path $ProjectPath ".location-fix-backup-$stamp"
New-Item -ItemType Directory -Path $backupDir | Out-Null
Copy-Item $locationFile (Join-Path $backupDir 'LocationPicker.tsx')
Copy-Item $createTaskFile (Join-Path $backupDir 'CreateTask.tsx')

Write-Host "Backup created: $backupDir" -ForegroundColor Green

# -----------------------------
# LocationPicker.tsx
# -----------------------------
$s = Get-Content $locationFile -Raw

$anchor = @'
    return { address, landmark, city, state };
  };

  
  const fetchGeocode = async (params: { placeId?: string; location?: google.maps.LatLngLiteral }) => {
'@

$replacement = @'
    return { address, landmark, city, state };
  };

  const extractNewPlaceAddressParts = (components: any[] | undefined) => {
    let address = "";
    let landmark = "";
    let city = "";
    let state = "";
    let streetNum = "";
    let route = "";

    for (const comp of components || []) {
      const types = comp.types || [];
      const value = comp.longText || comp.shortText || "";
      if (types.includes('street_number')) { streetNum = value; }
      if (types.includes('route')) { route = value; }
      if (types.includes('point_of_interest') || types.includes('premise') || types.includes('subpremise')) {
        if (!landmark) { landmark = value; }
      }
      if (types.includes('locality') || types.includes('postal_town')) { city = value; }
      if (types.includes('administrative_area_level_1')) { state = value; }
    }

    address = [streetNum, route].filter(Boolean).join(' ');
    return { address, landmark, city, state };
  };

  const emitLocation = (loc: LocationData) => {
    setMarkerPos({ lat: loc.locationLat, lng: loc.locationLng });
    setLocationData(loc);
    onLocationSelect(loc);
  };

  const fetchGeocode = async (params: { placeId?: string; location?: google.maps.LatLngLiteral }) => {
'@

if (!$s.Contains($anchor)) { throw 'LocationPicker.tsx anchor not found. File may have changed; no changes were made to that file.' }
$s = $s.Replace($anchor, $replacement)

$start = $s.IndexOf('  const handleSuggestionClick = async')
$end = $s.IndexOf("`n  const handleMarkerDragEnd = async", $start)
if ($start -lt 0 -or $end -lt 0) { throw 'Could not locate handleSuggestionClick in LocationPicker.tsx.' }

$newHandler = @'
  const handleSuggestionClick = async (placeId: string, description: string) => {
    setQuery(description);
    setSuggestions([]);

    if (!placesLib || !map) return;

    try {
      // New Places API: resolve the selected prediction directly in the browser.
      // This avoids depending on the server-side Geocoding API just to obtain coordinates.
      if (placesLib.Place) {
        const place = new placesLib.Place({ id: placeId });
        await place.fetchFields({
          fields: ['formattedAddress', 'location', 'addressComponents']
        });

        if (place.location) {
          const pos = {
            lat: typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat,
            lng: typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng
          };
          const parts = extractNewPlaceAddressParts(place.addressComponents as any[] | undefined);
          const newLoc: LocationData = {
            address: parts.address || place.formattedAddress || description,
            landmark: parts.landmark,
            city: parts.city,
            state: parts.state,
            locationLat: Number(pos.lat),
            locationLng: Number(pos.lng)
          };

          emitLocation(newLoc);
          map.panTo(pos);
          map.setZoom(15);
          return;
        }
      }

      // Legacy Places API fallback.
      try { setSessionToken(new placesLib.AutocompleteSessionToken()); } catch(e) {}
      const results = await fetchGeocode({ placeId });
      if (results && results[0]) {
        const result = results[0];
        const pos = { lat: result.geometry.location.lat, lng: result.geometry.location.lng };
        const parts = extractAddressParts(result.address_components);
        const newLoc: LocationData = {
          address: parts.address || result.formatted_address?.split(',')[0] || description,
          landmark: parts.landmark,
          city: parts.city,
          state: parts.state,
          locationLat: pos.lat,
          locationLng: pos.lng
        };
        emitLocation(newLoc);
        map.panTo(pos);
        map.setZoom(15);
      } else {
        console.error('Could not resolve selected place:', placeId);
      }
    } catch (err) {
      console.error('Failed to select place:', err);
    }
  };
'@
$s = $s.Substring(0,$start) + $newHandler + $s.Substring($end)

$start = $s.IndexOf('  const handleMarkerDragEnd = async')
$end = $s.IndexOf("`n  const handleGetCurrentLocation =", $start)
if ($start -lt 0 -or $end -lt 0) { throw 'Could not locate handleMarkerDragEnd in LocationPicker.tsx.' }

$newDrag = @'
  const handleMarkerDragEnd = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };

    // Coordinates are the authoritative location. Emit them immediately so
    // task creation does not depend on reverse-geocoding succeeding.
    emitLocation({
      address: query || '',
      landmark: '',
      city: '',
      state: '',
      locationLat: pos.lat,
      locationLng: pos.lng
    });

    const results = await fetchGeocode({ location: pos });
    if (results && results[0]) {
      const result = results[0];
      const parts = extractAddressParts(result.address_components);
      const newLoc: LocationData = {
        address: parts.address || result.formatted_address?.split(',')[0] || query || '',
        landmark: parts.landmark,
        city: parts.city,
        state: parts.state,
        locationLat: pos.lat,
        locationLng: pos.lng
      };
      emitLocation(newLoc);
      setQuery(result.formatted_address || query);
    }
  };

  const handleMapClick = async (e: any) => {
    const clicked = e?.detail?.latLng;
    if (!clicked) return;

    const pos = {
      lat: typeof clicked.lat === 'function' ? clicked.lat() : clicked.lat,
      lng: typeof clicked.lng === 'function' ? clicked.lng() : clicked.lng
    };

    // A map click is a valid explicit location selection.
    emitLocation({
      address: '',
      landmark: '',
      city: '',
      state: '',
      locationLat: Number(pos.lat),
      locationLng: Number(pos.lng)
    });

    const results = await fetchGeocode({ location: pos });
    if (results && results[0]) {
      const result = results[0];
      const parts = extractAddressParts(result.address_components);
      const newLoc: LocationData = {
        address: parts.address || result.formatted_address?.split(',')[0] || '',
        landmark: parts.landmark,
        city: parts.city,
        state: parts.state,
        locationLat: Number(pos.lat),
        locationLng: Number(pos.lng)
      };
      emitLocation(newLoc);
      setQuery(result.formatted_address || '');
    }
  };
'@
$s = $s.Substring(0,$start) + $newDrag + $s.Substring($end)

$start = $s.IndexOf('  const handleGetCurrentLocation =')
$end = $s.IndexOf("`n  return (", $start)
if ($start -lt 0 -or $end -lt 0) { throw 'Could not locate handleGetCurrentLocation in LocationPicker.tsx.' }

$newCurrent = @'
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation && map) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const latLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          map.panTo(latLng);
          map.setZoom(15);

          // Coordinates are enough to create a valid task; reverse geocoding only enriches the address.
          emitLocation({
            address: '',
            landmark: '',
            city: '',
            state: '',
            locationLat: latLng.lat,
            locationLng: latLng.lng
          });

          const results = await fetchGeocode({ location: latLng });
          if (results && results[0]) {
            const result = results[0];
            const parts = extractAddressParts(result.address_components);
            const newLoc: LocationData = {
              address: parts.address || result.formatted_address?.split(',')[0] || '',
              landmark: parts.landmark,
              city: parts.city,
              state: parts.state,
              locationLat: latLng.lat,
              locationLng: latLng.lng
            };
            emitLocation(newLoc);
            setQuery(result.formatted_address || '');
          }
        },
        () => alert('Could not get your location.')
      );
    }
  };
'@
$s = $s.Substring(0,$start) + $newCurrent + $s.Substring($end)

$mapAnchor = @'
          zoomControl={true}
        >
'@
if (!$s.Contains($mapAnchor)) { throw 'Map prop anchor not found in LocationPicker.tsx.' }
$s = $s.Replace($mapAnchor, @'
          zoomControl={true}
          onClick={handleMapClick}
        >
'@)

Set-Content -Path $locationFile -Value $s -NoNewline

# -----------------------------
# CreateTask.tsx
# -----------------------------
$s = Get-Content $createTaskFile -Raw
$anchor = @'
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
'@
if (!$s.Contains($anchor)) { throw 'CreateTask.tsx state anchor not found.' }
$s = $s.Replace($anchor, @'
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationSelected, setLocationSelected] = useState(false);
'@)

$anchor = @'
    if (!form.locationLat || !form.locationLng) {
      setError("Please select a location from the map.");
      return;
    }
'@
if (!$s.Contains($anchor)) { throw 'CreateTask.tsx location validation anchor not found.' }
$s = $s.Replace($anchor, @'
    if (!locationSelected || !Number.isFinite(form.locationLat) || !Number.isFinite(form.locationLng)) {
      setError("Please select a location from the map.");
      return;
    }
'@)

$anchor = @'
                     setForm(prev => ({
                       ...prev,
                       ...loc
                     }));
'@
if (!$s.Contains($anchor)) { throw 'CreateTask.tsx location callback anchor not found.' }
$s = $s.Replace($anchor, @'
                     setForm(prev => ({
                       ...prev,
                       ...loc
                     }));
                     setLocationSelected(
                       Number.isFinite(loc.locationLat) && Number.isFinite(loc.locationLng)
                     );
'@)

$anchor = @'
                 {form.address && (
                  <div className="mt-4 p-4 bg-slate-50 border rounded-md">
                    <p className="font-medium">{form.address}</p>
                    {form.landmark && <p className="text-sm text-slate-600">{t("ui.landmark")}{form.landmark}</p>}
                    <p className="text-sm text-slate-500">{form.city}, {form.state}</p>
                  </div>
                )}
'@
if (!$s.Contains($anchor)) { throw 'CreateTask.tsx address display anchor not found.' }
$s = $s.Replace($anchor, $anchor + @'

                {locationSelected && !form.address && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
                    Location selected successfully. Coordinates: {form.locationLat.toFixed(6)}, {form.locationLng.toFixed(6)}
                  </div>
                )}
'@)

Set-Content -Path $createTaskFile -Value $s -NoNewline

Write-Host "Location fix applied." -ForegroundColor Green
Write-Host "Changed files:" -ForegroundColor Cyan
Write-Host "  components\LocationPicker.tsx"
Write-Host "  src\pages\CreateTask.tsx"
Write-Host ""
Write-Host "Next: restart the dev server, then test address suggestion, map click, marker drag, and Current location." -ForegroundColor Yellow
