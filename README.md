# jQuery-tinyMap

This plugin will help you to create simple or complex Google Maps on the page.


For complete options, methods and examples (Traditional Chinese):  
http://app.essoduke.org/tinyMap/ 

Download builder:  
http://app.essoduke.org/tinyMap/customize/

## Features

 * Easy to configure and use.
 * Supports Marker, Text label, Polyline, Polygon, Circle, KML, Direction layers. 
 * Custom events of map or layers.
 * Dynamically change the map. 
 * MarkerClusterer support.
 * KML file output.

## Install

Include the Google Maps API v3 before jQuery tinyMap.
```HTML
<script src="http://maps.google.com/maps/api/js?sensor=false"></script>
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

Full options: http://app.essoduke.org/tinyMap/#parameters

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
            'addr': ['Lat', 'Lng'],
            // Or address string e.g. `1600 Pennsylvania Ave NW, Washington, DC 20500`
            // Or {lat: 'lat', lng: 'lng'}
            'title': 'Hello World!', // (Optional)
            'text': 'Cogito ergo sum!', // (optional)
            'icon': 'http://domain/icon.png' // (optional)
            // Binding Click event
            'event': function (event) {
                console.log(this.text); // Marker text property.
                console.log(event.latLng.lat()); // Mousr event
            }
            /* OR 
            'event': {
                'click': function (event) {...},
                'mouseover': function (event) {...}
            }
               OR
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

// Clear specified layers
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
var map = $(selector);
var instance = map.data('tinyMap'); 
var markers = instance._markers; // All markers on the Map.
```

## License

This plugin is released under the [MIT License](http://opensource.org/licenses/MIT).


