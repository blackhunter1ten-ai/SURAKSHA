fetch('http://localhost:3000/api/amenities?lat=30.268892&lng=77.993318&radius=6000').then(r=>r.text()).then(console.log);
