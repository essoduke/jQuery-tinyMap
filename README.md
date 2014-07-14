jQuery-tinyMap
==============

This plugin will helping you to create the simple or complex Google Maps on the page.

Supported layers: Marker, Polyline, Polygon, Circle, Direction and KML.

For complete parameters, methods and Demo:  
http://app.essoduke.org/tinyMap/ (Traditional Chinese)

Download builder
http://app.essoduke.org/tinyMap/customize/

How to use?
-----------

First, include the Google Maps API v3 in `HEAD` and tinyMap before `</body>`.
```html
<script src="http://maps.google.com/maps/api/js?sensor=false"></script>
<script src="jquery.tinyMap.js"></script>
```

Second, Create the container in HTML like this:

```html
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


