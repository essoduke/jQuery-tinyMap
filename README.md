jQuery-tinyMap
==============

This plugin will helping you to create the simple or complex Google Maps on the page.


For complete parameters, methods and examples:  
http://app.essoduke.org/tinyMap/ (Traditional Chinese)

Download builder:  
http://app.essoduke.org/tinyMap/customize/

Features
--------
 * Easy to configure and use.
 * Supports Marker, Text label, Polyline, Polygon, Circle, KML, Direction layers. 
 * Custom events of map or layers.
 * Dynamic change the map. 
 * MarkerClusterer support.


Install
-------------

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


Usage
-----

Full options: http://app.essoduke.org/tinyMap/#parameters

```javascript
//Setting up the map
$('#map').tinyMap({
    'center': {'x': 'Lat', 'y': 'Lng'},
    // or 'center': 'lat, lng'
    // or 'center': [lat, lng]
    // or 'center': {lat: 'Lat', 'lng': Lng}
    'zoom': 14,
    'event': {
        'idle': function () {}
        ...
        ...
    }
    ...
    ...
});
```

Create the Markers
------------------
```javascript
$(selector).tinyMap({
    'marker': [
        {
            'addr': ['Lat', 'Lng'], // Or address string e.g. `1600 Pennsylvania Ave NW, Washington, DC 20500`
            'title': 'Hello World!', // (Optional)
            'text': 'Cogito ergo sum!', // (optional)
            'icon': 'http://domain/icon.png' // (optional)
            'event': function () {}
            /* OR 
            'event': {
                'click': function () {}
                ...
                ...
            }
            */
        }
        ...
        ...
    ]
});
```

Methods
-------
```javascript
//Methods
//e.g. Move the map center to specified location
$(selector).tinyMap('panto', 'Address string');
$(selector).tinyMap('panto', ['Lat', 'Lng']);
$(selector).tinyMap('panto', {'lat': 'Lat', 'lng': 'Lng'});

//Dynamic setting up
$(selector).tinyMap('modify', {OPTIONS});

//e.g. Disable draggable
$(selector).tinyMap('modify', {
    'draggable': false
});

//e.g. Clear the layers
$(selector).tinyMap('clear', 'marker,polyline,polygon...etc');
// or clear all layers
$(selector).tinyMap('clear'); 
```

License
-------
This plugin is released under the [MIT License](http://opensource.org/licenses/MIT).


