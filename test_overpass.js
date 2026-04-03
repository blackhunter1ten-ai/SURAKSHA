fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'data=' + encodeURIComponent(`[out:json][timeout:15];
    (
      node["amenity"="police"](around:6000,30.268892,77.993318);
      node["amenity"="hospital"](around:6000,30.268892,77.993318);
      node["amenity"="clinic"](around:6000,30.268892,77.993318);
      node["tourism"="hotel"](around:6000,30.268892,77.993318);
      node["tourism"="guest_house"](around:6000,30.268892,77.993318);
      node["tourism"="motel"](around:6000,30.268892,77.993318);
      way["amenity"="police"](around:6000,30.268892,77.993318);
      way["amenity"="hospital"](around:6000,30.268892,77.993318);
      way["amenity"="clinic"](around:6000,30.268892,77.993318);
      way["tourism"="hotel"](around:6000,30.268892,77.993318);
      way["tourism"="guest_house"](around:6000,30.268892,77.993318);
      way["tourism"="motel"](around:6000,30.268892,77.993318);
    );
    out center;`),
}).then(r => r.text()).then(console.log).catch(console.error);
