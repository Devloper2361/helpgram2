import { useState, useEffect, useRef } from 'react';
import { useMap, useMapsLibrary, Map, Marker } from '@vis.gl/react-google-maps';
import { MapProvider } from '@/components/MapProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search } from 'lucide-react';

export interface LocationData {
  address: string;
  landmark: string;
  city: string;
  state: string;
  locationLat: number;
  locationLng: number;
}

interface LocationPickerProps {
  onLocationSelect: (loc: LocationData) => void;
  initialLocation?: LocationData | null;
}

function LocationPickerInner({ onLocationSelect, initialLocation }: LocationPickerProps) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  
  const [sessionToken, setSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [markerPos, setMarkerPos] = useState<google.maps.LatLngLiteral | null>(
    initialLocation ? { lat: initialLocation.locationLat, lng: initialLocation.locationLng } : null
  );

  const [locationData, setLocationData] = useState<LocationData | null>(initialLocation || null);

  useEffect(() => {
    if (!placesLib) return;
    try {
      if (!placesLib.AutocompleteSuggestion) {
        setAutocompleteService(new placesLib.AutocompleteService());
        try { setSessionToken(new placesLib.AutocompleteSessionToken()); } catch(e) {}
      }
    } catch (e) {
      console.warn('Legacy Places API not activated, falling back to new API', e);
    }
  }, [placesLib]);

  

  useEffect(() => {
    if ((!autocompleteService && !placesLib?.AutocompleteSuggestion) || !query) {
      setSuggestions([]);
      return;
    }
    const fetchPredictions = async () => {
      try {
        if (placesLib.AutocompleteSuggestion) {
          const request = { input: query, sessionToken: sessionToken || undefined };
          const response = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
          setSuggestions(response.suggestions.map(s => ({
            place_id: s.placePrediction.placeId,
            description: s.placePrediction.text.text,
            structured_formatting: {
              main_text: s.placePrediction.text.text,
              secondary_text: ''
            }
          })));
        } else if (autocompleteService) {
          const response = await autocompleteService.getPlacePredictions({
            input: query,
            sessionToken: sessionToken || undefined,
          });
          setSuggestions(response.predictions);
        }
      } catch (err) {
        setSuggestions([]);
      }
    };
    fetchPredictions();
  }, [query, autocompleteService, sessionToken, placesLib]);

  const extractAddressParts = (components: google.maps.GeocoderAddressComponent[]) => {
    let address = "";
    let landmark = "";
    let city = "";
    let state = "";
    
    let streetNum = "";
    let route = "";

    for (const comp of components) {
      const types = comp.types;
      if (types.includes('street_number')) streetNum = comp.long_name;
      if (types.includes('route')) route = comp.long_name;
      if (types.includes('point_of_interest') || types.includes('premise') || types.includes('subpremise')) {
         if (!landmark) landmark = comp.long_name;
      }
      if (types.includes('locality') || types.includes('postal_town')) city = comp.long_name;
      if (types.includes('administrative_area_level_1')) state = comp.long_name;
    }
    address = [streetNum, route].filter(Boolean).join(' ');
    
    return { address, landmark, city, state };
  };

  
  const fetchGeocode = async (params: { placeId?: string; location?: google.maps.LatLngLiteral }) => {
    try {
      let url = '/api/geocode?';
      if (params.placeId) url += `place_id=${params.placeId}`;
      else if (params.location) url += `latlng=${params.location.lat},${params.location.lng}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
         return data.results;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const handleSuggestionClick = async (placeId: string, description: string) => {
    setQuery(description);
    setSuggestions([]);
    if (!placesLib || !map) return;
    
    if (placesLib.Place) {
      try {
        const place = new placesLib.Place({ id: placeId });
        await place.fetchFields({ fields: ['formattedAddress', 'location', 'addressComponents'] });
        if (place.location) {
          const pos = {
            lat: typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat,
            lng: typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng
          };
          
          let address = place.formattedAddress || description;
          
          const newLoc = {
            address: address, landmark: '', city: '', state: '',
            locationLat: Number(pos.lat), locationLng: Number(pos.lng)
          };
          setMarkerPos(pos);
          map.panTo(pos);
          map.setZoom(15);
          setLocationData(newLoc);
          onLocationSelect(newLoc);
          return;
        }
      } catch (e) {
        console.warn('Place fetch failed', e);
      }
    }
    
    try { setSessionToken(new placesLib.AutocompleteSessionToken()); } catch(e) {}
    const results = await fetchGeocode({ placeId });
    if (results && results[0]) {
      const result = results[0];
      const pos = { lat: result.geometry.location.lat, lng: result.geometry.location.lng };
      setMarkerPos(pos);
      map.panTo(pos);
      map.setZoom(15);
      
      const parts = extractAddressParts(result.address_components);
      const newLoc = {
         address: parts.address || result.formatted_address.split(',')[0],
         landmark: parts.landmark,
         city: parts.city,
         state: parts.state,
         locationLat: pos.lat,
         locationLng: pos.lng
      };
      setLocationData(newLoc);
      onLocationSelect(newLoc);
    }
  };

  const handleMarkerDragEnd = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setMarkerPos(pos);
    
    const initialLoc = {
      address: query || '', landmark: '', city: '', state: '',
      locationLat: pos.lat, locationLng: pos.lng
    };
    setLocationData(initialLoc);
    onLocationSelect(initialLoc);
    
    const results = await fetchGeocode({ location: pos });
    if (results && results[0]) {
      const result = results[0];
      const parts = extractAddressParts(result.address_components);
      const newLoc = {
         address: parts.address || result.formatted_address.split(',')[0],
         landmark: parts.landmark,
         city: parts.city,
         state: parts.state,
         locationLat: pos.lat,
         locationLng: pos.lng
      };
      setLocationData(newLoc);
      setQuery(result.formatted_address);
      onLocationSelect(newLoc);
    }
  };

  
  const handleMapClick = async (e: any) => {
    const clicked = e?.detail?.latLng;
    if (!clicked) return;

    const pos = {
      lat: typeof clicked.lat === 'function' ? clicked.lat() : clicked.lat,
      lng: typeof clicked.lng === 'function' ? clicked.lng() : clicked.lng
    };
    
    setMarkerPos(pos);
    
    const newLoc = {
      address: '', landmark: '', city: '', state: '',
      locationLat: Number(pos.lat), locationLng: Number(pos.lng)
    };
    setLocationData(newLoc);
    onLocationSelect(newLoc);

    const results = await fetchGeocode({ location: pos });
    if (results && results[0]) {
      const parts = extractAddressParts(results[0].address_components);
      const enhancedLoc = {
         address: parts.address || results[0].formatted_address.split(',')[0] || '',
         landmark: parts.landmark, city: parts.city, state: parts.state,
         locationLat: Number(pos.lat), locationLng: Number(pos.lng)
      };
      setLocationData(enhancedLoc);
      setQuery(results[0].formatted_address);
      onLocationSelect(enhancedLoc);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation && map) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const latLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMarkerPos(latLng);
          map.panTo(latLng);
          map.setZoom(15);
          
          const results = await fetchGeocode({ location: latLng });
          if (results && results[0]) {
            const result = results[0];
            const parts = extractAddressParts(result.address_components);
            const newLoc = {
               address: parts.address || result.formatted_address.split(',')[0],
               landmark: parts.landmark,
               city: parts.city,
               state: parts.state,
               locationLat: latLng.lat,
               locationLng: latLng.lng
            };
            setLocationData(newLoc);
            setQuery(result.formatted_address);
            onLocationSelect(newLoc);
          }
        },
        () => alert('Could not get your location.')
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="flex gap-2">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
             <Input 
               placeholder="Search area, street, or landmark..." 
               value={query}
               onChange={(e) => setQuery(e.target.value)}
               className="pl-9"
             />
           </div>
           <Button type="button" variant="outline" onClick={handleGetCurrentLocation}>
              <MapPin className="h-4 w-4 mr-2" /> Current
           </Button>
        </div>
        {suggestions.length > 0 && (
          <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((s) => (
              <li 
                key={s.place_id} 
                className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b last:border-0"
                onClick={() => handleSuggestionClick(s.place_id, s.description)}
              >
                <div className="font-medium text-sm text-slate-800">{s.structured_formatting.main_text}</div>
                <div className="text-xs text-slate-500">{s.structured_formatting.secondary_text}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border rounded-md overflow-hidden relative">
        <Map
          defaultCenter={{ lat: 20.2961, lng: 85.8245 }} // Default Bhubaneswar
          defaultZoom={11}
          
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '300px' }}
          disableDefaultUI={true}
          zoomControl={true}
          onClick={handleMapClick}
        >
          {markerPos && (
             <Marker 
                position={markerPos} 
                draggable={true} 
                onDragEnd={handleMarkerDragEnd}
             >
             </Marker>
          )}
        </Map>
        <div className="absolute top-2 left-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded shadow text-xs text-center pointer-events-none">
           Drag the marker to pinpoint exact location
        </div>
      </div>
    </div>
  );
}

export function LocationPicker(props: LocationPickerProps) {
  return (
     <MapProvider>
       <LocationPickerInner {...props} />
     </MapProvider>
  );
}
