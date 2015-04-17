# jQuery-tinyMap BETA VERSION

This plugin will help you to create simple or complex Google Maps on the page.

For complete options, methods and examples (Traditional Chinese):  
http://app.essoduke.org/tinyMap/ 

## BETA release notes
 
 * Google Maps API and markerclusterer has not need to include by manual anymore.
 * Native Directions API supports.
 * Places API supports.
 * Minor error fixed.
 
## Install

Just include the jQuery tinyMap plugin.
```HTML
<script src="jquery.tinyMap.js"></script>
```

Create the HTML container.
```html
<div id="map"></div>
```

Setting up the container's width and height in CSS:

```css
#map{width: WIDTH; height: HEIGHT}
```


## Usage

Complete options: http://app.essoduke.org/tinyMap/#parameters

```javascript
//Setting up the map
$('#map').tinyMap({
    'center': {'lat': 'Lat', 'lng': 'Lng'},
    // or 'center': 'lat, lng'
    // or 'center': [lat, lng]
    // or 'center': 'ADDRESS'
    'zoom': 14,
    // Map events binding
    'event': {
        'idle': function () {}
        // OR
        'idle': {
            'func': function () {},
            'once': true / false //Run once
        }
        ...
        ...
    }
    ...
    ...
});
```

### Create the Markers

```javascript
$(selector).tinyMap({
    'marker': [
        {
            // Marker place location
            'addr': ['Lat', 'Lng'],
            // Or address string e.g. `1600 Pennsylvania Ave NW, Washington, DC 20500`
            // Or {lat: 'lat', lng: 'lng'}
            'title': 'Display on Mouseover', // (Optional)
            'text': 'Display in infoWindow', // (optional)
            'icon': 'http://domain/icon.png' // (optional)
            // Binding Click event
            'event': function (event) {
                console.log(this.text); // Marker text property.
                console.log(event.latLng.lat()); // Mousr event
            }
            /* OR more events
            'event': {
                'click': function (event) {...},
                'mouseover': function (event) {...}
            }
               OR runeonce
            'event': {
                'click': {
                    'func': function () {...}
                    'once': true / false
                },
                'mouseover': {
                    ...
                }
            }
            */
        }
        ...
        ...
    ]
});
```

## Methods

```javascript
// Methods
// e.g. Move the map center to specified location
$(selector).tinyMap('panto', 'Address string');
$(selector).tinyMap('panto', ['Lat', 'Lng']);
$(selector).tinyMap('panto', {lat: 'Lat', lng: 'Lng'});

// Dynamic setting up
$(selector).tinyMap('modify', {OPTIONS});
// e.g. Disable draggable
$(selector).tinyMap('modify', {
    'draggable': false
    //Resetting  zoom level
    'zoom': 16
});

// Clear overlayers
// Options: marker, polyline, polygon, circle, direction, kml
$(selector).tinyMap('clear', 'marker,polyline,polygon...etc');
// or use array
$(selector).tinyMap('clear', ['marker', 'polyline', 'polygon'...]);
// or clear all layers
$(selector).tinyMap('clear'); 

// Overlays KML output
// Get the kml string.
var kml = $(selector).tinyMap('getKML'); 
// Or using options:
$(selector).tinyMap('getKML', {
    'download': true|false,  // Direct download KML not return the string.
    'marker': true|false,    // Include marker overlay
    'polyline': true|false,  // Include polyline overlay
    'direction': true|false  // Include direction overlay
});
```

## Using tinyMap instance

```javascript
// Create the map first.
var map = $(selector);
map.tinyMap(...);

// Get the instance from map.
var instance = map.data('tinyMap'); 
var markers = instance._markers; // All markers on the Map.
var polylines = instance._polylines; // All polyline layers
var polygons = instance._polygons; // All polygon layers
var circles = instance._circles; // All circle layers
// You could display all available objects by `console.dir(instance)`
```

## License

This plugin is released under the [MIT License](http://opensource.org/licenses/MIT).

