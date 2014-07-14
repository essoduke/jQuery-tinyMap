jQuery-tinyMap
==============

This plugin will helping you to create the simple or complex Google Maps on the page.

Supported layers: Marker, Polyline, Polygon, Circle, Direction and KML.

For complete parameters, methods and Demo:  
http://app.essoduke.org/tinyMap/ (Traditional Chinese)

Download builder:  
http://app.essoduke.org/tinyMap/customize/

Features
-----------
 * Easy to configure and use.
 * Supports Marker, Text label, Polyline, Polygon, Circle, KML, Direction layers. 
 * Custom events of map or layers.
 * Dynamic change the map. 
 * MarkerClusterer support.


How to use?
-----------

First, include the Google Maps API v3 in `HEAD` and tinyMap before `</body>`.
```HTML
<script src="http://maps.google.com/maps/api/js?sensor=false"></script>
<script src="jquery.tinyMap.js"></script>
```

Second, Create the container in HTML like this:

```HTML
<div id="map"></div>
```

Third, Setting up the style of container in CSS:

```css
#map{width:(WIDTH); height:(HEIGHT)}
```

Finally, Call it!

```javascript
$(function () {
    $('#map').tinyMap();
});
```

License
-------
This plugin is released under the [MIT License](http://opensource.org/licenses/MIT).


