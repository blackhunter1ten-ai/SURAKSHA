const query = `[out:json][timeout:15];
(
  node["amenity"="police"](around:6000,30.268892,77.993318);
  way["amenity"="police"](around:6000,30.268892,77.993318);
);
out center;`;

fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'data=' + encodeURIComponent(query),
})
.then(r => r.json())
.then(data => {
  console.log(data.elements.length + ' police stations found.');
  data.elements.forEach(e => {
    console.log(e.tags.name, e.tags.amenity);
  });
})
.catch(console.error);
