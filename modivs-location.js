/**
 * Modiv's Education - Location Services Module
 * Worldwide Autocomplete & Geolocation powered by OpenStreetMap Photon API
 * with instant local places lookup, multi-source reverse geocoding, and offline fallback.
 */
(function (window) {
  'use strict';

  var PHOTON_API = 'https://photon.komoot.io/api/';
  var PHOTON_REVERSE_API = 'https://photon.komoot.io/reverse';
  var PIN_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0e7c66" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';
  var CROSSHAIR_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>';

  // Built-in database of major Indian cities, Tricity / Punjab hubs, and global capitals with coordinates
  var CITIES_DB = [
    { city: 'Chandigarh', state: 'Chandigarh', country: 'India', lat: 30.7333, lon: 76.7794 },
    { city: 'Mohali', state: 'Punjab', country: 'India', lat: 30.7046, lon: 76.7179 },
    { city: 'Panchkula', state: 'Haryana', country: 'India', lat: 30.6942, lon: 76.8606 },
    { city: 'Zirakpur', state: 'Punjab', country: 'India', lat: 30.6425, lon: 76.8173 },
    { city: 'Kharar', state: 'Punjab', country: 'India', lat: 30.7441, lon: 76.6483 },
    { city: 'Dera Bassi', state: 'Punjab', country: 'India', lat: 30.5843, lon: 76.8447 },
    { city: 'Ambala', state: 'Haryana', country: 'India', lat: 30.3782, lon: 76.7767 },
    { city: 'Ludhiana', state: 'Punjab', country: 'India', lat: 30.9010, lon: 75.8573 },
    { city: 'Jalandhar', state: 'Punjab', country: 'India', lat: 31.3260, lon: 75.5762 },
    { city: 'Amritsar', state: 'Punjab', country: 'India', lat: 31.6340, lon: 74.8723 },
    { city: 'Patiala', state: 'Punjab', country: 'India', lat: 30.3398, lon: 76.3869 },
    { city: 'Bathinda', state: 'Punjab', country: 'India', lat: 30.2110, lon: 74.9455 },
    { city: 'Hoshiarpur', state: 'Punjab', country: 'India', lat: 31.5273, lon: 75.9149 },
    { city: 'Moga', state: 'Punjab', country: 'India', lat: 30.8165, lon: 75.1717 },
    { city: 'Pathankot', state: 'Punjab', country: 'India', lat: 32.2689, lon: 75.6499 },
    { city: 'Phagwara', state: 'Punjab', country: 'India', lat: 31.2240, lon: 75.7708 },
    { city: 'Sangrur', state: 'Punjab', country: 'India', lat: 30.2458, lon: 75.8421 },
    { city: 'Rupnagar', state: 'Punjab', country: 'India', lat: 30.9664, lon: 76.5331 },
    { city: 'Delhi', state: 'Delhi', country: 'India', lat: 28.6139, lon: 77.2090 },
    { city: 'New Delhi', state: 'Delhi', country: 'India', lat: 28.6139, lon: 77.2090 },
    { city: 'Gurugram', state: 'Haryana', country: 'India', lat: 28.4595, lon: 77.0266 },
    { city: 'Noida', state: 'Uttar Pradesh', country: 'India', lat: 28.5355, lon: 77.3910 },
    { city: 'Greater Noida', state: 'Uttar Pradesh', country: 'India', lat: 28.4744, lon: 77.5040 },
    { city: 'Ghaziabad', state: 'Uttar Pradesh', country: 'India', lat: 28.6692, lon: 77.4538 },
    { city: 'Faridabad', state: 'Haryana', country: 'India', lat: 28.4089, lon: 77.3178 },
    { city: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 19.0760, lon: 72.8777 },
    { city: 'Pune', state: 'Maharashtra', country: 'India', lat: 18.5204, lon: 73.8567 },
    { city: 'Bengaluru', state: 'Karnataka', country: 'India', lat: 12.9716, lon: 77.5946 },
    { city: 'Hyderabad', state: 'Telangana', country: 'India', lat: 17.3850, lon: 78.4867 },
    { city: 'Chennai', state: 'Tamil Nadu', country: 'India', lat: 13.0827, lon: 80.2707 },
    { city: 'Kolkata', state: 'West Bengal', country: 'India', lat: 22.5726, lon: 88.3639 },
    { city: 'Ahmedabad', state: 'Gujarat', country: 'India', lat: 23.0225, lon: 72.5714 },
    { city: 'Surat', state: 'Gujarat', country: 'India', lat: 21.1702, lon: 72.8311 },
    { city: 'Jaipur', state: 'Rajasthan', country: 'India', lat: 26.9124, lon: 75.7873 },
    { city: 'Lucknow', state: 'Uttar Pradesh', country: 'India', lat: 26.8467, lon: 80.9462 },
    { city: 'Kanpur', state: 'Uttar Pradesh', country: 'India', lat: 26.4499, lon: 80.3319 },
    { city: 'Nagpur', state: 'Maharashtra', country: 'India', lat: 21.1458, lon: 79.0882 },
    { city: 'Indore', state: 'Madhya Pradesh', country: 'India', lat: 22.7196, lon: 75.8577 },
    { city: 'Bhopal', state: 'Madhya Pradesh', country: 'India', lat: 23.2599, lon: 77.4126 },
    { city: 'Patna', state: 'Bihar', country: 'India', lat: 25.5941, lon: 85.1376 },
    { city: 'Vadodara', state: 'Gujarat', country: 'India', lat: 22.3072, lon: 73.1812 },
    { city: 'Dehradun', state: 'Uttarakhand', country: 'India', lat: 30.3165, lon: 78.0322 },
    { city: 'Shimla', state: 'Himachal Pradesh', country: 'India', lat: 31.1048, lon: 77.1734 },
    { city: 'Ranchi', state: 'Jharkhand', country: 'India', lat: 23.3441, lon: 85.3096 },
    { city: 'Jammu', state: 'Jammu and Kashmir', country: 'India', lat: 32.7266, lon: 74.8570 },
    { city: 'Srinagar', state: 'Jammu and Kashmir', country: 'India', lat: 34.0837, lon: 74.7973 },
    { city: 'Guwahati', state: 'Assam', country: 'India', lat: 26.1445, lon: 91.7362 },
    { city: 'Bhubaneswar', state: 'Odisha', country: 'India', lat: 20.2961, lon: 85.8245 },
    { city: 'Raipur', state: 'Chhattisgarh', country: 'India', lat: 21.2514, lon: 81.6296 },
    { city: 'Kochi', state: 'Kerala', country: 'India', lat: 9.9312, lon: 76.2673 },
    { city: 'Thiruvananthapuram', state: 'Kerala', country: 'India', lat: 8.5241, lon: 76.9366 },
    { city: 'Coimbatore', state: 'Tamil Nadu', country: 'India', lat: 11.0168, lon: 76.9558 },
    { city: 'Visakhapatnam', state: 'Andhra Pradesh', country: 'India', lat: 17.6868, lon: 83.2185 },
    { city: 'Agra', state: 'Uttar Pradesh', country: 'India', lat: 27.1767, lon: 78.0081 },
    { city: 'Varanasi', state: 'Uttar Pradesh', country: 'India', lat: 25.3176, lon: 82.9739 },
    { city: 'Prayagraj', state: 'Uttar Pradesh', country: 'India', lat: 25.4358, lon: 81.8463 },
    { city: 'Meerut', state: 'Uttar Pradesh', country: 'India', lat: 28.9845, lon: 77.7064 },
    { city: 'Udaipur', state: 'Rajasthan', country: 'India', lat: 24.5854, lon: 73.7125 },
    { city: 'Jodhpur', state: 'Rajasthan', country: 'India', lat: 26.2389, lon: 73.0243 },
    { city: 'Kota', state: 'Rajasthan', country: 'India', lat: 25.2138, lon: 75.8648 },
    { city: 'Haridwar', state: 'Uttarakhand', country: 'India', lat: 29.9457, lon: 78.1642 },
    { city: 'Rishikesh', state: 'Uttarakhand', country: 'India', lat: 30.0869, lon: 78.2676 },
    { city: 'Goa', state: 'Goa', country: 'India', lat: 15.2993, lon: 74.1240 },
    // International hubs
    { city: 'London', state: 'England', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
    { city: 'New York', state: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060 },
    { city: 'San Francisco', state: 'California', country: 'United States', lat: 37.7749, lon: -122.4194 },
    { city: 'Los Angeles', state: 'California', country: 'United States', lat: 34.0522, lon: -118.2437 },
    { city: 'Chicago', state: 'Illinois', country: 'United States', lat: 41.8781, lon: -87.6298 },
    { city: 'Toronto', state: 'Ontario', country: 'Canada', lat: 43.6532, lon: -79.3832 },
    { city: 'Vancouver', state: 'British Columbia', country: 'Canada', lat: 49.2827, lon: -123.1207 },
    { city: 'Sydney', state: 'New South Wales', country: 'Australia', lat: -33.8688, lon: 151.2093 },
    { city: 'Melbourne', state: 'Victoria', country: 'Australia', lat: -37.8136, lon: 144.9631 },
    { city: 'Brisbane', state: 'Queensland', country: 'Australia', lat: -27.4698, lon: 153.0251 },
    { city: 'Dubai', state: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lon: 55.2708 },
    { city: 'Abu Dhabi', state: 'Abu Dhabi', country: 'United Arab Emirates', lat: 24.4539, lon: 54.3773 },
    { city: 'Singapore', state: '', country: 'Singapore', lat: 1.3521, lon: 103.8198 },
    { city: 'Dublin', state: 'Leinster', country: 'Ireland', lat: 53.3498, lon: -6.2603 },
    { city: 'Berlin', state: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050 },
    { city: 'Paris', state: 'Île-de-France', country: 'France', lat: 48.8566, lon: 2.3522 },
    { city: 'Auckland', state: 'Auckland', country: 'New Zealand', lat: -36.8485, lon: 174.7633 }
  ];

  var COUNTRIES_LIST = [
    'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
    'United Arab Emirates', 'Singapore', 'New Zealand', 'Germany', 'France',
    'Ireland', 'Malaysia', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman'
  ];

  function haversine(la1, lo1, la2, lo2) {
    var R = 6371;
    var dLat = (la2 - la1) * Math.PI / 180;
    var dLon = (lo2 - lo1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function findNearestCity(lat, lon) {
    if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return null;
    var best = null, minDist = Infinity;
    for (var i = 0; i < CITIES_DB.length; i++) {
      var c = CITIES_DB[i];
      var d = haversine(lat, lon, c.lat, c.lon);
      if (d < minDist) {
        minDist = d;
        best = c;
      }
    }
    return best;
  }

  function fetchWithTimeout(url, ms) {
    ms = ms || 3500;
    if (typeof AbortController === 'undefined') {
      return fetch(url);
    }
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, ms);
    return fetch(url, { signal: controller.signal })
      .then(function (res) {
        clearTimeout(timer);
        return res;
      })
      .catch(function (err) {
        clearTimeout(timer);
        throw err;
      });
  }

  function searchLocalLocations(query, limit) {
    limit = limit || 8;
    var q = String(query || '').trim().toLowerCase();
    if (q.length < 2) return [];

    var results = [];
    var seen = {};

    function addFeature(name, city, state, country, area, lat, lon) {
      var key = (name + '|' + city + '|' + country).toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      results.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon != null ? lon : 76.7794, lat != null ? lat : 30.7333]
        },
        properties: {
          name: name,
          city: city,
          state: state || '',
          country: country || 'India',
          locality: area || '',
          type: area ? 'locality' : 'city'
        }
      });
    }

    // 1. Check ModivsPlaces if loaded
    if (window.ModivsPlaces && typeof window.ModivsPlaces.cities === 'function') {
      try {
        var allCities = window.ModivsPlaces.cities() || [];
        allCities.forEach(function (c) {
          var lc = c.toLowerCase();
          if (lc.indexOf(q) === 0 || (q.length > 2 && lc.indexOf(q) > -1)) {
            var matchedCity = CITIES_DB.filter(function (x) { return x.city.toLowerCase() === lc; })[0];
            addFeature(c, c, matchedCity ? matchedCity.state : '', matchedCity ? matchedCity.country : 'India', '', matchedCity ? matchedCity.lat : null, matchedCity ? matchedCity.lon : null);
          }
        });

        // Search localities in cities
        for (var i = 0; i < allCities.length && results.length < limit * 2; i++) {
          var cName = allCities[i];
          var areas = window.ModivsPlaces.areas(cName) || [];
          for (var j = 0; j < areas.length; j++) {
            var a = areas[j];
            var la = a.toLowerCase();
            if (la.indexOf(q) === 0 || (q.length > 2 && la.indexOf(q) > -1)) {
              var mc = CITIES_DB.filter(function (x) { return x.city.toLowerCase() === cName.toLowerCase(); })[0];
              addFeature(a, cName, mc ? mc.state : '', mc ? mc.country : 'India', a, mc ? mc.lat : null, mc ? mc.lon : null);
              if (results.length >= limit * 2) break;
            }
          }
        }
      } catch (e) {
        console.warn('ModivsPlaces search notice:', e);
      }
    }

    // 2. Search built-in CITIES_DB
    CITIES_DB.forEach(function (c) {
      var lc = c.city.toLowerCase();
      var ls = (c.state || '').toLowerCase();
      if (lc.indexOf(q) === 0 || ls.indexOf(q) === 0 || (q.length > 2 && (lc.indexOf(q) > -1 || ls.indexOf(q) > -1))) {
        addFeature(c.city, c.city, c.state, c.country, '', c.lat, c.lon);
      }
    });

    // 3. Search Countries
    COUNTRIES_LIST.forEach(function (country) {
      if (country.toLowerCase().indexOf(q) === 0 || (q.length > 2 && country.toLowerCase().indexOf(q) > -1)) {
        addFeature(country, '', '', country, '', null, null);
      }
    });

    return results.slice(0, limit);
  }

  function injectStyles() {
    if (document.getElementById('loc-autocomplete-styles')) return;
    var style = document.createElement('style');
    style.id = 'loc-autocomplete-styles';
    style.textContent = [
      '.loc-ac-wrap{position:relative;width:100%;box-sizing:border-box}',
      '.loc-ac-dropdown{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:99999;background:#ffffff;border:1.5px solid #dfe5ee;border-radius:10px;box-shadow:0 12px 32px rgba(20,33,61,0.18);max-height:280px;overflow-y:auto;display:none;font-family:inherit;box-sizing:border-box;margin:0;padding:4px 0;list-style:none}',
      '.loc-ac-dropdown.show{display:block}',
      '.loc-ac-item{display:flex;align-items:flex-start;gap:10px;padding:9px 12px;cursor:pointer;transition:background .15s ease;border-bottom:1px solid #f1f5f9;min-height:44px;box-sizing:border-box;text-align:left}',
      '.loc-ac-item:last-of-type{border-bottom:none}',
      '.loc-ac-item:hover,.loc-ac-item.active{background:#f1f8f6}',
      '.loc-ac-icon{flex:none;margin-top:2px;display:flex;align-items:center;justify-content:center}',
      '.loc-ac-body{flex:1;min-width:0}',
      '.loc-ac-title{font-size:.88rem;font-weight:700;color:#14213d;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.loc-ac-sub{font-size:.76rem;color:#64748b;margin-top:2px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.loc-ac-status{padding:12px 14px;font-size:.84rem;color:#64748b;display:flex;align-items:center;gap:8px;line-height:1.4}',
      '.loc-ac-status.error{color:#b3261e}',
      '.loc-ac-footer{padding:6px 12px;font-size:.72rem;color:#94a3b8;background:#fafafa;border-top:1px solid #f1f5f9;border-radius:0 0 8px 8px;display:flex;justify-content:space-between;align-items:center}',
      '.loc-ac-footer a{color:#64748b;text-decoration:underline}',
      '.loc-spinner{display:inline-block;width:13px;height:13px;border:2px solid rgba(14,124,102,.25);border-radius:50%;border-top-color:#0e7c66;animation:locSpin .7s linear infinite}',
      '@keyframes locSpin{to{transform:rotate(360deg)}}',
      '.mv-loc-box,.loc-picker-box{background:#f8fafc;border:1.5px solid #dfe5ee;border-radius:12px;padding:12px 14px;margin:12px 0;font-family:inherit;box-sizing:border-box}',
      '.mv-loc-header,.loc-picker-header{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px}',
      '.mv-loc-title,.loc-picker-title{font-size:.88rem;font-weight:700;color:#14213d;display:flex;align-items:center;gap:6px}',
      '.mv-loc-btn,.loc-picker-btn{display:inline-flex;align-items:center;gap:6px;background:#0e7c66;color:#ffffff;border:none;border-radius:8px;padding:7px 14px;font-size:.84rem;font-weight:700;cursor:pointer;transition:all .15s ease;font-family:inherit}',
      '.mv-loc-btn:hover,.loc-picker-btn:hover{background:#0a5f4e;transform:translateY(-1px)}',
      '.mv-loc-btn[disabled],.loc-picker-btn[disabled]{opacity:.65;cursor:not-allowed;transform:none}',
      '.mv-loc-search,.loc-picker-search{position:relative;margin-top:6px}',
      '.mv-loc-search input,.loc-picker-search input{width:100%;padding:9px 12px 9px 34px;border:1.5px solid #dfe5ee;border-radius:8px;font-size:.88rem;background:#ffffff;font-family:inherit;box-sizing:border-box}',
      '.mv-loc-search input:focus,.loc-picker-search input:focus{border-color:#0e7c66;outline:none;box-shadow:0 0 0 3px rgba(14,124,102,.15)}',
      '.mv-loc-search svg,.loc-picker-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:#8a94a6;pointer-events:none}',
      '.mv-loc-status,.loc-picker-status{font-size:.82rem;margin-top:7px;display:none;align-items:flex-start;gap:6px;line-height:1.4}',
      '.mv-loc-status.show,.loc-picker-status.show{display:flex}',
      '.mv-loc-status.loading,.loc-picker-status.loading{color:#0e7c66}',
      '.mv-loc-status.success,.loc-picker-status.success{color:#0e7c66;font-weight:600}',
      '.mv-loc-status.error,.loc-picker-status.error{color:#b3261e}',
      '.mv-loc-details,.loc-picker-details{margin-top:8px;padding:8px 10px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;font-size:.8rem;color:#475569;display:none}',
      '.mv-loc-details.show,.loc-picker-details.show{display:block}',
      '.mv-loc-details b,.loc-picker-details b{color:#14213d}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function parsePhotonFeature(f) {
    if (!f || !f.properties) return null;
    var p = f.properties;
    var coords = (f.geometry && Array.isArray(f.geometry.coordinates)) ? f.geometry.coordinates : [null, null];
    var lon = coords[0] != null ? Number(coords[0]) : null;
    var lat = coords[1] != null ? Number(coords[1]) : null;

    var type = p.type || p.osm_value || '';
    var country = p.country || (type === 'country' ? p.name : '') || 'India';
    var state = p.state || '';

    var city = p.city || p.town || p.village || p.municipality || '';
    if (!city) {
      if (['city', 'town', 'village', 'municipality', 'hamlet'].indexOf(type) > -1 ||
        ['city', 'town', 'village'].indexOf(p.osm_value) > -1) {
        city = p.name || '';
      } else if (p.county && type !== 'country') {
        city = p.county.replace(/\s+(Tahsil|Tehsil|District)$/i, '');
      } else if (p.district && type !== 'country') {
        city = p.district;
      }
    }

    var area = '';
    if (p.district && p.district !== city) {
      area = p.district;
    } else if (p.suburb && p.suburb !== city) {
      area = p.suburb;
    } else if (p.locality && p.locality !== city) {
      area = p.locality;
    } else if (p.street) {
      area = (p.housenumber ? p.housenumber + ' ' : '') + p.street;
    } else if (p.name && p.name !== city && p.name !== country && p.name !== state) {
      area = p.name;
    }

    var parts = [];
    if (p.name && p.name !== city && p.name !== country && p.name !== state) parts.push(p.name);
    if (p.street && p.name !== p.street) parts.push((p.housenumber ? p.housenumber + ' ' : '') + p.street);
    if (area && parts.indexOf(area) < 0) parts.push(area);
    if (city && parts.indexOf(city) < 0) parts.push(city);
    if (state && parts.indexOf(state) < 0) parts.push(state);
    if (country && parts.indexOf(country) < 0) parts.push(country);

    var formatted = parts.length > 0 ? parts.join(', ') : (p.name || city || country);

    return {
      city: city || (type === 'city' ? p.name : '') || (country !== 'India' ? country : ''),
      state: state,
      country: country,
      formattedAddress: formatted,
      latitude: lat,
      longitude: lon,
      osmId: p.osm_id || null,
      osmType: p.osm_type || null,
      area: area
    };
  }

  function formatSubtitle(loc, p) {
    var subParts = [];
    if (loc.city && loc.city !== p.name) subParts.push(loc.city);
    if (loc.state && subParts.indexOf(loc.state) < 0) subParts.push(loc.state);
    if (loc.country && subParts.indexOf(loc.country) < 0) subParts.push(loc.country);
    if (p.postcode) subParts.push(p.postcode);
    return subParts.join(', ');
  }

  function resolveLocationFromText(text) {
    var t = String(text || '').trim();
    if (!t) return null;
    var parts = t.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    var candidate = parts[0] || t;
    var matched = CITIES_DB.filter(function (x) {
      return x.city.toLowerCase() === candidate.toLowerCase() ||
        x.city.toLowerCase().indexOf(candidate.toLowerCase()) === 0;
    })[0];

    var city = matched ? matched.city : candidate;
    var state = matched ? matched.state : (parts[1] || '');
    var country = matched ? matched.country : (parts[2] || 'India');
    var full = parts.length > 1 ? t : [city, state, country].filter(Boolean).join(', ');

    return {
      city: city,
      state: state,
      country: country,
      area: (matched && parts[0] !== matched.city) ? parts[0] : '',
      formattedAddress: full,
      latitude: matched ? matched.lat : null,
      longitude: matched ? matched.lon : null,
      osmId: null,
      osmType: null
    };
  }

  function initLocationAutocomplete(input, options) {
    injectStyles();
    options = options || {};

    var el = typeof input === 'string' ? document.querySelector(input) : input;
    if (!el) return null;

    if (el._locAutocompleteInstance) {
      return el._locAutocompleteInstance;
    }

    var wrap = el.parentElement;
    if (!wrap || !wrap.classList.contains('loc-ac-wrap')) {
      var newWrap = document.createElement('div');
      newWrap.className = 'loc-ac-wrap';
      if (el.parentNode) {
        el.parentNode.insertBefore(newWrap, el);
      }
      newWrap.appendChild(el);
      wrap = newWrap;
    }

    var dropdown = document.createElement('ul');
    dropdown.className = 'loc-ac-dropdown';
    dropdown.setAttribute('role', 'listbox');
    wrap.appendChild(dropdown);

    var limit = typeof options.limit === 'number' ? options.limit : 8;
    var lang = options.lang || 'en';
    var debounceMs = typeof options.debounceMs === 'number' ? options.debounceMs : 300;
    var debounceTimer = null;
    var activeAbort = null;
    var activeIndex = -1;
    var currentFeatures = [];
    var currentLocation = options.initialLocation || null;

    function getTargetInput(target) {
      if (!target) return null;
      if (typeof target !== 'string') return target;
      return document.getElementById(target) || document.querySelector(target.indexOf('#') === 0 || target.indexOf('.') === 0 ? target : '#' + target) || document.querySelector(target);
    }

    var cityInput = getTargetInput(options.cityInput || options.cityInputId);
    var areaInput = getTargetInput(options.areaInput || options.areaInputId);
    var stateInput = getTargetInput(options.stateInput || options.stateInputId);
    var countryInput = getTargetInput(options.countryInput || options.countryInputId);
    var addressInput = getTargetInput(options.addressInput || options.addressInputId);
    var latInput = getTargetInput(options.latInput || options.latInputId);
    var lngInput = getTargetInput(options.lngInput || options.lngInputId);

    function closeDropdown() {
      dropdown.classList.remove('show');
      dropdown.innerHTML = '';
      activeIndex = -1;
      currentFeatures = [];
    }

    function highlightItem(index) {
      var items = dropdown.querySelectorAll('.loc-ac-item');
      items.forEach(function (it, idx) {
        if (idx === index) {
          it.classList.add('active');
          it.scrollIntoView({ block: 'nearest' });
        } else {
          it.classList.remove('active');
        }
      });
      activeIndex = index;
    }

    function selectLocation(loc, feature) {
      if (!loc) return;
      currentLocation = loc;
      el._selectedLocation = loc;

      el.value = loc.formattedAddress || loc.city || '';

      // Update ONLY location fields without affecting unrelated form data
      if (cityInput) {
        if (cityInput.tagName === 'SELECT') {
          var matched = false;
          for (var i = 0; i < cityInput.options.length; i++) {
            if (cityInput.options[i].value.toLowerCase() === (loc.city || '').toLowerCase()) {
              cityInput.selectedIndex = i;
              matched = true;
              break;
            }
          }
          if (!matched && loc.city) {
            var opt = document.createElement('option');
            opt.value = loc.city;
            opt.textContent = loc.city;
            cityInput.appendChild(opt);
            cityInput.value = loc.city;
          }
        } else {
          cityInput.value = loc.city || '';
        }
        cityInput.dispatchEvent(new Event('input', { bubbles: true }));
        cityInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (areaInput) {
        areaInput.value = loc.area || '';
        areaInput.dispatchEvent(new Event('input', { bubbles: true }));
        areaInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (stateInput) {
        stateInput.value = loc.state || '';
        stateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (countryInput) {
        countryInput.value = loc.country || '';
        countryInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (addressInput) {
        addressInput.value = loc.formattedAddress || '';
        addressInput.dispatchEvent(new Event('input', { bubbles: true }));
        addressInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (latInput) latInput.value = loc.latitude != null ? loc.latitude : '';
      if (lngInput) lngInput.value = loc.longitude != null ? loc.longitude : '';

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      if (typeof options.onSelect === 'function') {
        try { options.onSelect(loc, feature); } catch (e) { console.warn(e); }
      }

      closeDropdown();
    }

    function renderResults(features) {
      dropdown.innerHTML = '';
      currentFeatures = features || [];
      activeIndex = -1;

      if (!currentFeatures.length) {
        var empty = document.createElement('li');
        empty.className = 'loc-ac-status';
        empty.innerHTML = '<span>No matching locations found. Press Enter to use typed location.</span>';
        dropdown.appendChild(empty);
      } else {
        currentFeatures.forEach(function (f) {
          var loc = parsePhotonFeature(f);
          if (!loc) return;

          var li = document.createElement('li');
          li.className = 'loc-ac-item';
          li.setAttribute('role', 'option');

          var title = f.properties.name || loc.city || loc.country || 'Location';
          var sub = formatSubtitle(loc, f.properties);

          li.innerHTML = [
            '<span class="loc-ac-icon">' + PIN_SVG + '</span>',
            '<div class="loc-ac-body">',
            '  <div class="loc-ac-title">' + escapeHtml(title) + '</div>',
            '  <div class="loc-ac-sub">' + escapeHtml(sub || loc.formattedAddress) + '</div>',
            '</div>'
          ].join('');

          li.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            selectLocation(loc, f);
          });

          dropdown.appendChild(li);
        });
      }

      var footer = document.createElement('li');
      footer.className = 'loc-ac-footer';
      footer.innerHTML = '<span>Powered by <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> · Photon</span>';
      dropdown.appendChild(footer);

      dropdown.classList.add('show');
    }

    function searchLocations(query) {
      if (activeAbort) {
        try { activeAbort.abort(); } catch (e) { }
      }
      activeAbort = typeof AbortController !== 'undefined' ? new AbortController() : null;

      // 1. Instant local search (<1ms)
      var localFeatures = searchLocalLocations(query, limit);
      if (localFeatures.length > 0) {
        renderResults(localFeatures);
      } else {
        dropdown.innerHTML = '<li class="loc-ac-status"><span class="loc-spinner"></span> Searching locations…</li>';
        dropdown.classList.add('show');
      }

      // 2. Parallel background fetch to Photon API
      var url = PHOTON_API + '?q=' + encodeURIComponent(query) + '&limit=' + limit + '&lang=' + encodeURIComponent(lang);
      var fetchOpts = activeAbort ? { signal: activeAbort.signal } : {};

      var photonTimer = setTimeout(function () {
        if (activeAbort) {
          try { activeAbort.abort(); } catch (e) { }
        }
      }, 3500);

      fetch(url, fetchOpts)
        .then(function (res) {
          clearTimeout(photonTimer);
          if (!res.ok) throw new Error('Photon API HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          clearTimeout(photonTimer);
          var onlineFeatures = (data && Array.isArray(data.features)) ? data.features : [];
          // Merge local and online features without duplicates
          var merged = [];
          var seen = {};

          onlineFeatures.forEach(function (f) {
            var loc = parsePhotonFeature(f);
            if (!loc) return;
            var key = (loc.formattedAddress || (loc.city + '|' + loc.country)).toLowerCase();
            if (!seen[key]) {
              seen[key] = true;
              merged.push(f);
            }
          });

          localFeatures.forEach(function (f) {
            var loc = parsePhotonFeature(f);
            if (!loc) return;
            var key = (loc.formattedAddress || (loc.city + '|' + loc.country)).toLowerCase();
            if (!seen[key]) {
              seen[key] = true;
              merged.push(f);
            }
          });

          if (merged.length > 0) {
            renderResults(merged.slice(0, limit));
          } else if (localFeatures.length > 0) {
            renderResults(localFeatures);
          } else {
            renderResults([]);
          }
        })
        .catch(function (err) {
          clearTimeout(photonTimer);
          if (err && err.name === 'AbortError') return;
          console.warn('Photon autocomplete notice:', err);
          // If we already have local results, keep them! Never show red error banner when user typed valid characters
          if (localFeatures.length > 0) {
            renderResults(localFeatures);
          } else {
            var resolved = resolveLocationFromText(query);
            if (resolved) {
              renderResults([{
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [resolved.longitude || 76.7794, resolved.latitude || 30.7333] },
                properties: { name: resolved.city, city: resolved.city, state: resolved.state, country: resolved.country, type: 'city' }
              }]);
            } else {
              dropdown.innerHTML = '<li class="loc-ac-status"><span>Type your city or area and press Enter.</span></li>';
              dropdown.classList.add('show');
            }
          }
        });
    }

    function onInput() {
      clearTimeout(debounceTimer);
      var query = el.value.trim();
      if (query.length < 2) {
        closeDropdown();
        return;
      }
      // Instant local check first
      var immediateLocal = searchLocalLocations(query, limit);
      if (immediateLocal.length > 0) {
        renderResults(immediateLocal);
      }
      debounceTimer = setTimeout(function () {
        searchLocations(query);
      }, debounceMs);
    }

    function onKeyDown(e) {
      if (e.key === 'Enter') {
        // ALWAYS prevent default form submit when pressing Enter in autocomplete input
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < currentFeatures.length) {
          var chosenFeature = currentFeatures[activeIndex];
          selectLocation(parsePhotonFeature(chosenFeature), chosenFeature);
        } else if (currentFeatures.length > 0) {
          selectLocation(parsePhotonFeature(currentFeatures[0]), currentFeatures[0]);
        } else if (el.value.trim()) {
          var customLoc = resolveLocationFromText(el.value.trim());
          if (customLoc) selectLocation(customLoc);
        }
        closeDropdown();
        return;
      }

      if (!dropdown.classList.contains('show') || !currentFeatures.length) {
        if (e.key === 'ArrowDown' && el.value.trim().length >= 2) {
          searchLocations(el.value.trim());
        }
        return;
      }

      var items = dropdown.querySelectorAll('.loc-ac-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        var next = activeIndex + 1;
        if (next >= items.length) next = 0;
        highlightItem(next);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        var prev = activeIndex - 1;
        if (prev < 0) prev = items.length - 1;
        highlightItem(prev);
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    }

    function onBlur() {
      // Auto-resolve typed location if user didn't click an item
      setTimeout(function () {
        if (!currentLocation && el.value.trim()) {
          var resolved = resolveLocationFromText(el.value.trim());
          if (resolved) {
            selectLocation(resolved);
          }
        }
      }, 200);
    }

    function onDocClick(e) {
      if (!wrap.contains(e.target)) {
        closeDropdown();
      }
    }

    el.addEventListener('input', onInput);
    el.addEventListener('keydown', onKeyDown);
    el.addEventListener('blur', onBlur);
    document.addEventListener('pointerdown', onDocClick);

    var currBtn = getTargetInput(options.currentLocationBtn);
    if (currBtn) {
      currBtn.addEventListener('click', function () {
        detectCurrentLocation(function (loc) {
          if (loc) selectLocation(loc);
        }, currBtn);
      });
    }

    var instance = {
      destroy: function () {
        clearTimeout(debounceTimer);
        if (activeAbort) {
          try { activeAbort.abort(); } catch (e) { }
        }
        el.removeEventListener('input', onInput);
        el.removeEventListener('keydown', onKeyDown);
        el.removeEventListener('blur', onBlur);
        document.removeEventListener('pointerdown', onDocClick);
        if (dropdown && dropdown.parentNode) dropdown.parentNode.removeChild(dropdown);
        delete el._locAutocompleteInstance;
      },
      getLocation: function () {
        return currentLocation;
      },
      setLocation: function (loc) {
        if (loc) selectLocation(loc);
      }
    };

    el._locAutocompleteInstance = instance;
    return instance;
  }

  function reverseGeocode(lat, lon) {
    if (lat == null || lon == null) {
      return Promise.reject(new Error('Coordinates required'));
    }

    // 1. Try Photon reverse API with 3.5s timeout
    var photonUrl = PHOTON_REVERSE_API + '?lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lon);
    return fetchWithTimeout(photonUrl, 3500)
      .then(function (res) {
        if (!res.ok) throw new Error('Photon reverse HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var features = (data && Array.isArray(data.features)) ? data.features : [];
        if (!features.length) throw new Error('No address found for coordinates in Photon');
        var parsed = parsePhotonFeature(features[0]);
        if (!parsed || (!parsed.city && !parsed.state && !parsed.country)) {
          throw new Error('Incomplete Photon reverse address');
        }
        return parsed;
      })
      .catch(function () {
        // 2. Fallback to BigDataCloud client reverse API with 3.5s timeout
        var bdcUrl = 'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lon) + '&localityLanguage=en';
        return fetchWithTimeout(bdcUrl, 3500)
          .then(function (res) {
            if (!res.ok) throw new Error('BDC HTTP ' + res.status);
            return res.json();
          })
          .then(function (j) {
            if (!j || (!j.city && !j.locality && !j.principalSubdivision && !j.countryName)) {
              throw new Error('No BDC address returned');
            }
            var city = j.city || j.locality || '';
            var state = j.principalSubdivision || '';
            var country = j.countryName || 'India';
            var area = (j.locality && j.locality !== city) ? j.locality : '';
            var full = [area, city, state, country].filter(Boolean).join(', ');
            return {
              city: city,
              state: state,
              country: country,
              area: area,
              formattedAddress: full,
              latitude: lat,
              longitude: lon,
              osmId: null,
              osmType: null
            };
          });
      })
      .catch(function () {
        // 3. Fallback to OpenStreetMap Nominatim reverse API with 3.5s timeout
        var nomUrl = 'https://nominatim.openstreetmap.org/reverse?lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lon) + '&format=json&addressdetails=1';
        return fetchWithTimeout(nomUrl, 3500)
          .then(function (res) {
            if (!res.ok) throw new Error('Nominatim HTTP ' + res.status);
            return res.json();
          })
          .then(function (j) {
            var addr = (j && j.address) || {};
            var city = addr.city || addr.town || addr.village || addr.county || addr.state_district || '';
            var state = addr.state || '';
            var country = addr.country || 'India';
            var area = addr.suburb || addr.neighbourhood || addr.road || '';
            var full = [area, city, state, country].filter(Boolean).join(', ');
            return {
              city: city,
              state: state,
              country: country,
              area: area,
              formattedAddress: full || j.display_name || (city + ', ' + state + ', ' + country),
              latitude: lat,
              longitude: lon,
              osmId: j.osm_id || null,
              osmType: j.osm_type || null
            };
          });
      })
      .catch(function () {
        // 4. Fallback to offline nearest city calculation via Haversine distance
        var nearest = findNearestCity(lat, lon) || { city: 'Chandigarh', state: 'Chandigarh', country: 'India' };
        var full = [nearest.city, nearest.state, nearest.country].filter(Boolean).join(', ');
        return {
          city: nearest.city,
          state: nearest.state,
          country: nearest.country,
          area: nearest.city,
          formattedAddress: full,
          latitude: lat,
          longitude: lon,
          osmId: null,
          osmType: null
        };
      });
  }

  function detectCurrentLocation(callback, triggerBtn) {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Please type your city.');
      if (callback) callback(null);
      return;
    }

    var originalHTML = '';
    if (triggerBtn) {
      originalHTML = triggerBtn.innerHTML;
      triggerBtn.disabled = true;
      triggerBtn.innerHTML = '<span class="loc-spinner"></span> <span>Detecting…</span>';
    }

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var lat = pos.coords.latitude;
        var lon = pos.coords.longitude;
        reverseGeocode(lat, lon)
          .then(function (loc) {
            if (triggerBtn) {
              triggerBtn.disabled = false;
              triggerBtn.innerHTML = originalHTML;
            }
            if (callback) callback(loc);
          })
          .catch(function (err) {
            console.warn('Reverse geocode fallback:', err);
            if (triggerBtn) {
              triggerBtn.disabled = false;
              triggerBtn.innerHTML = originalHTML;
            }
            var nearest = findNearestCity(lat, lon) || { city: 'Chandigarh', state: 'Chandigarh', country: 'India' };
            var full = [nearest.city, nearest.state, nearest.country].filter(Boolean).join(', ');
            var fallbackLoc = {
              city: nearest.city,
              state: nearest.state,
              country: nearest.country,
              area: nearest.city,
              formattedAddress: full,
              latitude: lat,
              longitude: lon,
              osmId: null,
              osmType: null
            };
            if (callback) callback(fallbackLoc);
          });
      },
      function (err) {
        console.warn('Geolocation access notice:', err);
        if (triggerBtn) {
          triggerBtn.disabled = false;
          triggerBtn.innerHTML = originalHTML;
        }
        var msg = 'Location access was not granted. Please search and select your city manually.';
        if (err.code === 1) msg = 'Location permission was denied. Please select your city from the search box.';
        alert(msg);
        if (callback) callback(null);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  function attachLocationPicker(container, options) {
    if (container && typeof container === 'object' && !container.nodeType && !options) {
      options = container;
      container = options.container || options.containerId;
    }
    injectStyles();
    options = options || {};

    var targetContainer = typeof container === 'string' ? document.getElementById(container) : (container && container.nodeType ? container : null);
    if (!targetContainer && options.containerId) {
      targetContainer = document.getElementById(options.containerId);
    }
    if (!targetContainer && options.container) {
      targetContainer = typeof options.container === 'string' ? document.getElementById(options.container) : (options.container && options.container.nodeType ? options.container : null);
    }
    if (!targetContainer) return null;

    targetContainer.innerHTML = '';
    var widget = document.createElement('div');
    widget.className = 'mv-loc-box loc-picker-box';
    widget.innerHTML = [
      '<div class="mv-loc-header loc-picker-header">',
      '  <span class="mv-loc-title loc-picker-title">',
      '    ' + PIN_SVG + ' ' + (options.label || 'Location (Optional GPS / Auto-detect)'),
      '  </span>',
      '  <button type="button" class="mv-loc-btn loc-picker-btn" id="mvLocBtn" title="Automatically detect your location via GPS (Optional)">',
      '    ' + CROSSHAIR_SVG + ' <span>Use Current Location</span>',
      '  </button>',
      '</div>',
      '<div class="mv-loc-search loc-picker-search">',
      '  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
      '  <input type="text" id="mvLocSearchInput" placeholder="' + escapeHtml(options.placeholder || 'Type or search any city or area (e.g. Chandigarh, Mohali, Delhi)') + '" autocomplete="off">',
      '</div>',
      '<div class="mv-loc-helper" style="display:flex;justify-content:space-between;align-items:center;margin:6px 0 2px;font-size:0.83rem;color:var(--muted,#555b78);">',
      '  <span>Map / GPS is optional — you can also enter your city manually</span>',
      '  <button type="button" class="mv-loc-toggle-btn" id="mvLocManualToggle" style="background:none;border:none;color:var(--accent-d,#0066cc);font-weight:600;cursor:pointer;text-decoration:underline;padding:2px 0;">',
      '    Enter city manually',
      '  </button>',
      '</div>',
      '<div class="mv-loc-manual" id="mvLocManualBox" style="display:none;background:#f8fafc;padding:10px 12px;border:1px solid var(--line,#e2e8f0);border-radius:8px;margin-top:6px;">',
      '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">',
      '    <div>',
      '      <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:4px;" for="mvManualCity">City / District</label>',
      '      <input type="text" id="mvManualCity" placeholder="e.g. Chandigarh" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.88rem;">',
      '    </div>',
      '    <div>',
      '      <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:4px;" for="mvManualArea">Area / Locality</label>',
      '      <input type="text" id="mvManualArea" placeholder="e.g. Sector 17" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.88rem;">',
      '    </div>',
      '  </div>',
      '</div>',
      '<div class="mv-loc-status loc-picker-status" id="mvLocStatus"></div>',
      '<div class="mv-loc-details loc-picker-details" id="mvLocDetails"></div>'
    ].join('\n');

    targetContainer.appendChild(widget);

    var btn = widget.querySelector('#mvLocBtn');
    var searchInput = widget.querySelector('#mvLocSearchInput');
    var statusEl = widget.querySelector('#mvLocStatus');
    var detailsEl = widget.querySelector('#mvLocDetails');
    var manualToggle = widget.querySelector('#mvLocManualToggle');
    var manualBox = widget.querySelector('#mvLocManualBox');
    var manualCity = widget.querySelector('#mvManualCity');
    var manualArea = widget.querySelector('#mvManualArea');
    var currentLocation = options.initialLocation || null;

    function showStatus(text, type) {
      statusEl.className = 'mv-loc-status loc-picker-status show ' + (type || '');
      statusEl.innerHTML = text;
    }
    function hideStatus() {
      statusEl.className = 'mv-loc-status loc-picker-status';
      statusEl.innerHTML = '';
    }

    function syncTarget(target, val) {
      var el = getTargetInput(target);
      if (el && val != null) {
        el.value = val;
        try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
        try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
      }
    }

    function applyLocation(loc, updateSearchText) {
      if (!loc) return;
      currentLocation = loc;
      var displayAddr = loc.formattedAddress || [loc.area && loc.area !== loc.city ? loc.area : '', loc.city, loc.state, loc.country].filter(Boolean).join(', ');
      if (detailsEl) {
        detailsEl.innerHTML = '<b>Selected:</b> ' + escapeHtml(displayAddr);
        detailsEl.className = 'mv-loc-details loc-picker-details show';
      }
      if (updateSearchText !== false && searchInput) {
        searchInput.value = displayAddr;
      }
      if (manualCity && loc.city && !manualCity.value) manualCity.value = loc.city;
      if (manualArea && loc.area && !manualArea.value) manualArea.value = loc.area;

      syncTarget(options.cityInputId || options.cityInput, loc.city || '');
      syncTarget(options.areaInputId || options.areaInput, loc.area || '');
      syncTarget(options.addressInputId || options.addressInput, displayAddr);

      if (typeof options.onLocationChange === 'function') {
        try { options.onLocationChange(loc); } catch (e) { console.warn(e); }
      }
    }

    if (manualToggle && manualBox) {
      manualToggle.addEventListener('click', function(e) {
        e.preventDefault();
        var isOpen = manualBox.style.display !== 'none';
        manualBox.style.display = isOpen ? 'none' : 'block';
        manualToggle.textContent = isOpen ? 'Enter city manually' : 'Hide manual fields';
        var fb = document.getElementById('cityFallback');
        if (fb) fb.hidden = isOpen;
      });
    }

    function syncManualFields() {
      var cVal = (manualCity ? manualCity.value.trim() : '') || (getTargetInput(options.cityInputId || options.cityInput) ? getTargetInput(options.cityInputId || options.cityInput).value : '');
      var aVal = (manualArea ? manualArea.value.trim() : '') || (getTargetInput(options.areaInputId || options.areaInput) ? getTargetInput(options.areaInputId || options.areaInput).value : '');
      if (cVal || aVal) {
        var loc = {
          city: cVal,
          area: aVal,
          country: 'India',
          formattedAddress: [aVal, cVal].filter(Boolean).join(', ')
        };
        applyLocation(loc, false);
      }
    }

    if (manualCity) manualCity.addEventListener('input', syncManualFields);
    if (manualArea) manualArea.addEventListener('input', syncManualFields);

    var acInstance = initLocationAutocomplete(searchInput, {
      cityInput: options.cityInputId || options.cityInput,
      areaInput: options.areaInputId || options.areaInput,
      stateInput: options.stateInputId || options.stateInput,
      countryInput: options.countryInputId || options.countryInput,
      addressInput: options.addressInputId || options.addressInput,
      onSelect: function (loc) {
        hideStatus();
        applyLocation(loc, true);
      }
    });

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      showStatus('<span class="loc-spinner"></span> Detecting your location via GPS…', 'loading');
      detectCurrentLocation(function (loc) {
        if (loc) {
          var display = loc.formattedAddress || [loc.area && loc.area !== loc.city ? loc.area : '', loc.city, loc.state, loc.country].filter(Boolean).join(', ');
          showStatus('✓ Location set: ' + escapeHtml(loc.city || display), 'success');
          applyLocation(loc, true);
        } else {
          showStatus('Could not detect location. You can type your city or enter manually below.', 'error');
        }
      }, btn);
    });

    searchInput.addEventListener('input', function () {
      var val = searchInput.value.trim();
      if (val) {
        var resolved = resolveLocationFromText(val);
        if (resolved) {
          applyLocation(resolved, false);
        }
      }
    });

    searchInput.addEventListener('blur', function () {
      var val = searchInput.value.trim();
      if (val) {
        var resolved = resolveLocationFromText(val);
        if (resolved) {
          applyLocation(resolved, true);
        }
      }
    });

    if (options.initialLocation && (options.initialLocation.city || options.initialLocation.formattedAddress || options.initialLocation.fullAddress)) {
      applyLocation(options.initialLocation);
    }

    return {
      getLocation: function () { return currentLocation; },
      setLocation: function (loc) { applyLocation(loc); },
      destroy: function () {
        if (acInstance) acInstance.destroy();
        widget.remove();
      }
    };
  }

  function formatLocationForSave(loc, fallbackCity, fallbackArea) {
    loc = loc || {};
    var city = loc.city || fallbackCity || '';
    var area = loc.area || fallbackArea || '';
    var state = loc.state || '';
    var country = loc.country || 'India';
    var full = loc.formattedAddress || loc.fullAddress || [area && area !== city ? area : '', city, state, country].filter(Boolean).join(', ');
    var lat = (typeof loc.latitude === 'number') ? loc.latitude : ((typeof loc.lat === 'number') ? loc.lat : null);
    var lon = (typeof loc.longitude === 'number') ? loc.longitude : ((typeof loc.lng === 'number') ? loc.lng : null);

    return {
      city: city,
      state: state,
      country: country,
      formattedAddress: full,
      latitude: lat,
      longitude: lon,
      osmId: loc.osmId || null,
      osmType: loc.osmType || null,
      area: area
    };
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  window.initLocationAutocomplete = initLocationAutocomplete;
  window.ModivsLocationAutocomplete = {
    init: initLocationAutocomplete,
    parsePhotonFeature: parsePhotonFeature,
    reverseGeocode: reverseGeocode,
    detectCurrentLocation: detectCurrentLocation,
    attachLocationPicker: attachLocationPicker,
    formatLocationForSave: formatLocationForSave
  };

  window.ModivsLocation = {
    loadGoogleMapsScript: function (cb) { if (cb) cb(); }, // Safe no-op to eliminate Google Maps
    detectCurrentLocation: detectCurrentLocation,
    reverseGeocode: reverseGeocode,
    attachLocationPicker: attachLocationPicker,
    formatLocationForSave: formatLocationForSave
  };

})(window);
