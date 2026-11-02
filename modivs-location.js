/* Modiv's Google Location Integration
   - Google Maps Places Autocomplete & Geolocation
   - 'Use Current Location' with browser permission
   - Automatic detection and manual search
   - Saves: Country, State, City, Area / Locality, Full Address, Latitude, Longitude
   - Graceful fallback reverse geocoding if Google Geocoding API key lacks quota/activation
*/
(function(window){
  'use strict';

  var GOOGLE_MAPS_API_KEY = (window.EducationBFirebase && window.EducationBFirebase.config && window.EducationBFirebase.config.apiKey) || 'AIzaSyB2I8iFDkcUZJBDBwkALHNeoIR3a9k-fcY';
  var mapsScriptLoading = false;
  var mapsScriptLoaded = false;
  var mapsLoadCallbacks = [];

  function loadGoogleMapsScript(callback){
    if(window.google && window.google.maps && window.google.maps.places){
      mapsScriptLoaded = true;
      if(callback) callback();
      return;
    }
    if(callback) mapsLoadCallbacks.push(callback);
    if(mapsScriptLoading) return;
    mapsScriptLoading = true;

    var script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(GOOGLE_MAPS_API_KEY) + '&libraries=places&loading=async';
    script.async = true;
    script.defer = true;
    script.onload = function(){
      mapsScriptLoaded = true;
      mapsScriptLoading = false;
      while(mapsLoadCallbacks.length){
        var cb = mapsLoadCallbacks.shift();
        try{ cb(); }catch(e){ console.warn(e); }
      }
    };
    script.onerror = function(err){
      mapsScriptLoading = false;
      console.warn('Google Maps script could not be loaded; using native geolocation fallback.', err);
      while(mapsLoadCallbacks.length){
        var cb = mapsLoadCallbacks.shift();
        try{ cb(err); }catch(e){}
      }
    };
    document.head.appendChild(script);
  }

  // Inject styles for the location widget
  (function injectStyles(){
    if(document.getElementById('mv-loc-styles')) return;
    var style = document.createElement('style');
    style.id = 'mv-loc-styles';
    style.textContent = [
      '.mv-loc-box{background:#f8fafc;border:1.5px solid #dfe5ee;border-radius:12px;padding:12px 14px;margin:12px 0;font-family:inherit}',
      '.mv-loc-header{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px}',
      '.mv-loc-title{font-size:.88rem;font-weight:700;color:#14213d;display:flex;align-items:center;gap:6px}',
      '.mv-loc-btn{display:inline-flex;align-items:center;gap:6px;background:#0e7c66;color:#ffffff;border:none;border-radius:8px;padding:7px 14px;font-size:.84rem;font-weight:700;cursor:pointer;transition:all .15s ease;font-family:inherit}',
      '.mv-loc-btn:hover{background:#0a5f4e;transform:translateY(-1px)}',
      '.mv-loc-btn:active{transform:translateY(0)}',
      '.mv-loc-btn[disabled]{opacity:.65;cursor:not-allowed;transform:none}',
      '.mv-loc-btn svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
      '.mv-loc-search{position:relative;margin-top:6px}',
      '.mv-loc-search input{width:100%;padding:9px 12px 9px 34px;border:1.5px solid #dfe5ee;border-radius:8px;font-size:.88rem;background:#ffffff;font-family:inherit;box-sizing:border-box}',
      '.mv-loc-search input:focus{border-color:#0e7c66;outline:none;box-shadow:0 0 0 3px rgba(14,124,102,.15)}',
      '.mv-loc-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:#8a94a6;pointer-events:none}',
      '.mv-loc-status{font-size:.82rem;margin-top:7px;display:none;align-items:flex-start;gap:6px;line-height:1.4}',
      '.mv-loc-status.show{display:flex}',
      '.mv-loc-status.loading{color:#0e7c66}',
      '.mv-loc-status.success{color:#0e7c66;font-weight:600}',
      '.mv-loc-status.error{color:#b3261e}',
      '.mv-loc-details{margin-top:8px;padding:8px 10px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;font-size:.8rem;color:#475569;display:none}',
      '.mv-loc-details.show{display:block}',
      '.mv-loc-details b{color:#14213d}',
      '.mv-loc-spinner{display:inline-block;width:13px;height:13px;border:2px solid rgba(255,255,255,.3);border-radius:50%;border-top-color:#fff;animation:mvLocSpin .7s linear infinite}',
      '@keyframes mvLocSpin{to{transform:rotate(360deg)}}'
    ].join('\n');
    document.head.appendChild(style);
  })();

  function parseGooglePlace(place){
    var details = {
      country: '',
      state: '',
      city: '',
      area: '',
      fullAddress: place.formatted_address || place.name || '',
      lat: (place.geometry && place.geometry.location && typeof place.geometry.location.lat === 'function') ? place.geometry.location.lat() : null,
      lng: (place.geometry && place.geometry.location && typeof place.geometry.location.lng === 'function') ? place.geometry.location.lng() : null
    };

    var comps = place.address_components || [];
    comps.forEach(function(c){
      var types = c.types || [];
      if(types.indexOf('country') > -1) details.country = c.long_name || c.short_name;
      if(types.indexOf('administrative_area_level_1') > -1) details.state = c.long_name;
      if(types.indexOf('locality') > -1 && !details.city) details.city = c.long_name;
      if(types.indexOf('postal_town') > -1 && !details.city) details.city = c.long_name;
      if(types.indexOf('administrative_area_level_2') > -1 && !details.city) details.city = c.long_name;
      if(types.indexOf('sublocality_level_1') > -1 || types.indexOf('sublocality') > -1 || types.indexOf('neighborhood') > -1){
        if(!details.area) details.area = c.long_name;
      }
    });

    if(!details.city && details.area) details.city = details.area;
    if(window.ModivsPlaces && window.ModivsPlaces.canon){
      if(details.city) details.city = window.ModivsPlaces.canon('city', details.city);
      if(details.area) details.area = window.ModivsPlaces.canon('area', details.area, details.city);
    }
    return details;
  }

  // Reverse geocode via Google Geocoder
  function reverseGeocodeGoogle(lat, lng){
    return new Promise(function(resolve, reject){
      if(!window.google || !window.google.maps || !window.google.maps.Geocoder){
        return reject(new Error('Google Geocoder unavailable'));
      }
      var geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat: lat, lng: lng } }, function(results, status){
        if(status === 'OK' && results && results.length){
          var res = results[0];
          var parsed = parseGooglePlace(res);
          parsed.lat = lat;
          parsed.lng = lng;
          resolve(parsed);
        } else {
          reject(new Error('Google geocoding error: ' + status));
        }
      });
    });
  }

  // Fallback reverse geocoding via OpenStreetMap / BigDataCloud
  function reverseGeocodeFallback(lat, lng){
    var url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lng);
    return fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function(res){ return res.json(); })
      .then(function(data){
        var addr = data.address || {};
        var city = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state_district || '';
        var area = addr.suburb || addr.neighbourhood || addr.residential || addr.subdivision || addr.road || '';
        var state = addr.state || '';
        var country = addr.country || 'India';
        var full = data.display_name || [area, city, state, country].filter(Boolean).join(', ');

        if(window.ModivsPlaces && window.ModivsPlaces.canon){
          if(city) city = window.ModivsPlaces.canon('city', city);
          if(area) area = window.ModivsPlaces.canon('area', area, city);
        }

        return {
          country: country,
          state: state,
          city: city,
          area: area,
          fullAddress: full,
          lat: lat,
          lng: lng
        };
      });
  }

  // Reverse geocodes with Google Geocoder first, then fallback
  function reverseGeocode(lat, lng){
    return reverseGeocodeGoogle(lat, lng).catch(function(err){
      console.warn('Google reverse geocode fallback to Nominatim:', err);
      return reverseGeocodeFallback(lat, lng);
    });
  }

  // Request browser geolocation permission and detect position
  function detectCurrentLocation(){
    return new Promise(function(resolve, reject){
      if(!navigator.geolocation){
        return reject(new Error('Geolocation is not supported by your browser.'));
      }
      navigator.geolocation.getCurrentPosition(
        function(pos){
          var lat = pos.coords.latitude;
          var lng = pos.coords.longitude;
          reverseGeocode(lat, lng)
            .then(resolve)
            .catch(function(){
              // Return coords even if geocoding services are blocked
              resolve({
                country: 'India',
                state: '',
                city: '',
                area: '',
                fullAddress: 'Latitude: ' + lat.toFixed(5) + ', Longitude: ' + lng.toFixed(5),
                lat: lat,
                lng: lng
              });
            });
        },
        function(err){
          var msg = 'Location access was not granted.';
          if(err.code === 1) msg = 'Location permission was denied. Please allow location access in your browser settings.';
          else if(err.code === 2) msg = 'Current location is unavailable. Check your device GPS or connection.';
          else if(err.code === 3) msg = 'Location request timed out. Please try again.';
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
      );
    });
  }

  /*
    Attach Location Picker to a form/page:
    options: {
      containerId: string or element,
      cityInputId: 'city',
      areaInputId: 'area',
      addressInputId: 'addr' (optional),
      initialLocation: object (for edit profile),
      onLocationChange: function(locDetails)
    }
  */
  function attachLocationPicker(options){
    var container = typeof options.containerId === 'string' ? document.getElementById(options.containerId) : options.containerId;
    if(!container) return null;

    var cityInput = options.cityInputId ? document.getElementById(options.cityInputId) : null;
    var areaInput = options.areaInputId ? document.getElementById(options.areaInputId) : null;
    var addrInput = options.addressInputId ? document.getElementById(options.addressInputId) : null;

    var currentLocation = options.initialLocation || null;

    var widget = document.createElement('div');
    widget.className = 'mv-loc-box';
    widget.innerHTML = [
      '<div class="mv-loc-header">',
      '  <span class="mv-loc-title">',
      '    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0e7c66" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
      '    Google Location Services',
      '  </span>',
      '  <button type="button" class="mv-loc-btn" id="mvLocBtn" title="Automatically detect and fill your current location">',
      '    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>',
      '    <span>Use Current Location</span>',
      '  </button>',
      '</div>',
      '<div class="mv-loc-search">',
      '  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
      '  <input type="text" id="mvLocSearchInput" placeholder="Search and select any location (Powered by Google)" autocomplete="off">',
      '</div>',
      '<div class="mv-loc-status" id="mvLocStatus"></div>',
      '<div class="mv-loc-details" id="mvLocDetails"></div>'
    ].join('\n');

    container.appendChild(widget);

    var btn = widget.querySelector('#mvLocBtn');
    var searchInput = widget.querySelector('#mvLocSearchInput');
    var statusEl = widget.querySelector('#mvLocStatus');
    var detailsEl = widget.querySelector('#mvLocDetails');

    function showStatus(text, type){
      statusEl.className = 'mv-loc-status show ' + (type || '');
      statusEl.innerHTML = text;
    }
    function hideStatus(){
      statusEl.className = 'mv-loc-status';
      statusEl.innerHTML = '';
    }

    function applyLocation(loc, updateInputs){
      currentLocation = Object.assign({}, loc);
      if(updateInputs !== false){
        if(cityInput && loc.city){
          cityInput.value = loc.city;
          cityInput.dispatchEvent(new Event('input', { bubbles: true }));
          cityInput.dispatchEvent(new Event('change', { bubbles: true }));
          // If ModivsPlaces has a select dropdown for this field, sync it
          var citySel = document.querySelector('.pl-sel[data-for="' + cityInput.id + '"]');
          if(citySel){
            var hasOption = false;
            for(var i=0; i<citySel.options.length; i++){
              if(citySel.options[i].value.toLowerCase() === loc.city.toLowerCase()){
                citySel.selectedIndex = i;
                hasOption = true;
                break;
              }
            }
            if(!hasOption){
              citySel.value = '__other';
              cityInput.style.display = '';
            } else {
              cityInput.style.display = 'none';
            }
            citySel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        if(areaInput && loc.area){
          areaInput.value = loc.area;
          areaInput.dispatchEvent(new Event('input', { bubbles: true }));
          areaInput.dispatchEvent(new Event('change', { bubbles: true }));
          var areaSel = document.querySelector('.pl-sel[data-for="' + areaInput.id + '"]');
          if(areaSel){
            var hasAreaOption = false;
            for(var j=0; j<areaSel.options.length; j++){
              if(areaSel.options[j].value.toLowerCase() === loc.area.toLowerCase()){
                areaSel.selectedIndex = j;
                hasAreaOption = true;
                break;
              }
            }
            if(!hasAreaOption){
              areaSel.value = '__other';
              areaInput.style.display = '';
            } else {
              areaInput.style.display = 'none';
            }
            areaSel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        if(addrInput && loc.fullAddress && !addrInput.value){
          addrInput.value = loc.fullAddress;
          addrInput.dispatchEvent(new Event('input', { bubbles: true }));
          addrInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // Display details
      var parts = [];
      if(loc.area) parts.push(loc.area);
      if(loc.city) parts.push(loc.city);
      if(loc.state) parts.push(loc.state);
      if(loc.country) parts.push(loc.country);
      var summary = parts.join(', ');

      detailsEl.className = 'mv-loc-details show';
      detailsEl.innerHTML = '<b>Selected Location:</b> ' + (summary || loc.fullAddress || 'Coordinates saved') +
        (loc.lat && loc.lng ? ' <small style="display:block;color:#64748b;margin-top:2px;">(Lat: ' + loc.lat.toFixed(4) + ', Lng: ' + loc.lng.toFixed(4) + ')</small>' : '');

      if(options.onLocationChange) options.onLocationChange(loc);
    }

    // Button click: use current location
    btn.addEventListener('click', function(){
      btn.disabled = true;
      btn.innerHTML = '<span class="mv-loc-spinner"></span> <span>Detecting location…</span>';
      showStatus('Asking for browser location permission…', 'loading');

      detectCurrentLocation().then(function(loc){
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg> <span>Use Current Location</span>';
        showStatus('✓ Current location detected successfully!', 'success');
        applyLocation(loc, true);
        if(searchInput) searchInput.value = loc.fullAddress || (loc.area ? (loc.area + ', ' + loc.city) : loc.city);
      }).catch(function(err){
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg> <span>Use Current Location</span>';
        showStatus(err.message || 'Could not detect location. Please search manually.', 'error');
      });
    });

    // Initialize Google Places Autocomplete on the search input
    loadGoogleMapsScript(function(){
      if(window.google && window.google.maps && window.google.maps.places && searchInput){
        try{
          var autocomplete = new google.maps.places.Autocomplete(searchInput, {
            componentRestrictions: { country: 'in' },
            fields: ['address_components', 'formatted_address', 'geometry', 'name']
          });
          autocomplete.addListener('place_changed', function(){
            var place = autocomplete.getPlace();
            if(!place || !place.geometry) return;
            var parsed = parseGooglePlace(place);
            showStatus('✓ Location selected: ' + (parsed.area ? (parsed.area + ', ' + parsed.city) : parsed.city), 'success');
            applyLocation(parsed, true);
          });
        }catch(e){
          console.warn('Google Places Autocomplete init warning:', e);
        }
      }
    });

    // If initial location provided (e.g. editing a profile), display it
    if(options.initialLocation && (options.initialLocation.city || options.initialLocation.fullAddress)){
      applyLocation(options.initialLocation, false);
      if(searchInput) searchInput.value = options.initialLocation.fullAddress || options.initialLocation.area || options.initialLocation.city || '';
    }

    return {
      getLocation: function(){ return currentLocation; },
      setLocation: function(loc){ applyLocation(loc, true); }
    };
  }

  // Format a location object to be saved cleanly into Firestore & local storage
  function formatLocationForSave(loc, fallbackCity, fallbackArea){
    loc = loc || {};
    var city = loc.city || fallbackCity || '';
    var area = loc.area || fallbackArea || '';
    var state = loc.state || '';
    var country = loc.country || 'India';
    var full = loc.fullAddress || [area, city, state, country].filter(Boolean).join(', ');
    return {
      country: country,
      state: state,
      city: city,
      area: area,
      fullAddress: full,
      lat: (typeof loc.lat === 'number') ? loc.lat : null,
      lng: (typeof loc.lng === 'number') ? loc.lng : null
    };
  }

  window.ModivsLocation = {
    loadGoogleMapsScript: loadGoogleMapsScript,
    detectCurrentLocation: detectCurrentLocation,
    reverseGeocode: reverseGeocode,
    attachLocationPicker: attachLocationPicker,
    formatLocationForSave: formatLocationForSave
  };

})(window);
