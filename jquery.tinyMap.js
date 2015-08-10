/*jshint unused:false */
/**
 * jQuery tinyMap plugin
 * http://app.essoduke.org/tinyMap/
 * Copyright 2015 essoduke.org, Licensed MIT.
 *
 * Changelog
 * -------------------------------
 * 修正若啟用 markerCluster 時，標記的 Label 並不會納入叢集計算的問題。
 *
 * @author essoduke.org
 * @version 3.2.16
 * @license MIT License
 * Last modified: 2015-08-10 11:46:54+08:00
 */
/**
 * Call while google maps api loaded
 * @callback
 */
window.gMapsCallback = function () {
    $(window).trigger('gMapsCallback');
};
/**
 * Plugin statements
 */
;(function ($, window, document, undefined) {

    // API Configure
    var apiLoaded = false,
        apiClusterLoaded = false,
        apiMarkerWithLabelLoaded = false,
        tinyMapConfigure = {
            'sensor'   : false,
            'language' : 'zh-TW',
            'callback' : 'gMapsCallback',
            'api'      : '//maps.googleapis.com/maps/api/js',
            'clusterer': '//google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclustererplus/src/markerclusterer_packed.js',
            'withLabel': '//google-maps-utility-library-v3.googlecode.com/svn/trunk/markerwithlabel/src/markerwithlabel_packed.js'
        },
    // Default plugin settings
        defaults = {
            'autoLocation': false,
            'center': [24, 121],
            'infoWindowAutoClose': true,
            'interval': 200,
            'loading': '讀取中&hellip;',
            'notFound': '找不到查詢的地點',
            'zoom': 8
        },
        styles = {};
    //#!#START STYLES
        styles = {
            // Grey Scale
            'greyscale': [{
                'featureType': 'all',
                'stylers': [
                    {'saturation': -100},
                    {'gamma': 0.5}
                ]
            }]
        };
    //#!#END
    /**
     * Parsing the location
     * @param {(string|string[]|number[]|Object)} loc Location
     * @param {boolean} formatting Format to Google Maps LatLng object
     * @private
     */
    function parseLatLng (loc, formatting) {

        var result = {
                'lat': '',
                'lng': ''
            },
            array = [],
            re = /^[+-]?\d+(\.\d+)?$/;

        if ('string' === typeof loc || Array.isArray(loc)) {
            array = Array.isArray(loc) ? loc : loc.toString().replace(/\s+/, '').split(',');
            if (2 === array.length) {
                if (re.test(array[0]) && re.test(array[1])) {
                    result.lat = array[0];
                    result.lng = array[1];
                }
            } else {
                return loc;
            }
        } else if ('object' === typeof loc) {
            // Google LatLng Class
            if ('function' === typeof loc.lat) {
                return loc;
            } else if (loc.hasOwnProperty('x') && loc.hasOwnProperty('y')) {
                result.lat = loc.x;
                result.lng = loc.y;
            } else if (loc.hasOwnProperty('lat') && loc.hasOwnProperty('lng')) {
                result.lat = loc.lat;
                result.lng = loc.lng;
            }
        }
        if (true === formatting) {
            return new google.maps.LatLng(result.lat, result.lng);
        }
        return result;
    }
    //#!#START LABEL
    /**
     * Label in Maps
     * @param {Object} options Label options
     * @protected
     * @constructor
     */
    function Label (options) {
        var self = this,
            css = options.hasOwnProperty('css') ? options.css.toString() : '';
        self.setValues(options);
        self.span = $('<span/>').css({
            'position': 'relative',
            'left': '-50%',
            'top': '0',
            'white-space': 'nowrap'
        }).addClass(css);
        self.div = $('<div/>').css({
            'position': 'absolute',
            'display': 'none'
        });
        self.span.appendTo(self.div);
    }
    //#!#END
    /**
     * tinyMap Constructor
     * @param {Object} container HTML element
     * @param {(Object|string)} options User settings
     * @constructs jQuery.tinyMap
     */
    function TinyMap (container, options) {

        var self = this,
            opt = $.extend({}, defaults, options);
        /**
         * Map instance
         * @type {Object}
         */
        self.map = null;
        /**
         * Map markers
         * @type {Object}
         */
        self._markers = [];
        /**
         * Markers
         * @type {Object[]}
         */
        self._markersCluster = [];
        /**
         * Marker clusters
         * @type {Object[]}
         */
        self._clusters = {};
        /**
         * Bounds object
         * @type {Object[]}
         */
        self._bounds = {};
        /**
         * Labels
         * @type {Object[]}
         */
        self._labels = [];
        /**
         * Polyline layers
         * @type {Object[]}
         */
        self._polylines = [];
        /**
         * Polygon layers
         * @type {Object[]}
         */
        self._polygons = [];
        /**
         * Circles layer
         * @type {Object[]}
         */
        self._circles = [];
        /**
         * KML layers
         * @type {Object[]}
         */
        self._kmls = [];
        /**
         * Direction Display layers
         * @type {Objects[]}
         */
        self._directions = [];
        /**
         * Direction icons
         * @type {Object[]}
         */
        self._directionsMarkers = [];
        /**
         * Places objects
         * @type {Object[]}
         */
        self._places = [];
        /**
         * DOM of selector
         * @type {Object}
         */
        self.container = container;
        /**
         * User setting
         * @type {Object}
         */
        self.options = opt;
        /**
         * Google Map options
         * @type {Object}
         */
        self.googleMapOptions = {};
        /**
         * Interval for geocoder's query interval
         * @type {number}
         */
        self.interval = parseInt(self.options.interval, 10) || 200;
        /**
         * Binding callback event for API async
         */
        $(window).on('gMapsCallback', function () {
            self.init();
        });
        // Append loading string
        $(this.container).html(opt.loading);
        // Call initialize
        self.init();
    }
    /**
     * TinyMap prototype
     */
    TinyMap.prototype = {

        /**
         * Current version
         * @type {string}
         * @constant
         */
        'VERSION': '3.2.16',

        /**
         * Format to google.maps.Size
         * @param {number[]} size Size array [x, y]
         * @return {(Object|Array)}
         */
        formatSize: function (size) {
            if (Array.isArray(size) && 2 === size.length) {
                return new google.maps.Size(size[0], size[1]);
            }
            return size;
        },
        /**
         * Format to google.maps.Point
         * @param {number[]} point Point array [x, y]
         * @return {(Object|Array)}
         */
        formatPoint: function (point) {
            if (Array.isArray(point) && 2 === point.length) {
                return new google.maps.Point(point[0], point[1]);
            }
            return point;
        },

        /**
         * Overlay processes
         * @private
         */
        overlay: function () {

            var map = this.map,
                opt = this.options;

            try {
                //#!#START ADSENSE
                // Adsense overlay
                this.adsense(map, opt);
                //#!#END
                //#!#START KML
                // kml overlay
                this.kml(map, opt);
                //#!#END
                //#!#START DIRECTION
                // direction overlay
                this.direction(map, opt);
                //#!#END
                //#!#START MARKER
                // markers overlay
                this.markers(map, opt);
                //#!#END
                //#!#START POLYLINE
                // polyline overlay
                this.drawPolyline(map, opt);
                //#!#END
                //#!#START POLYGON
                // polygon overlay
                this.drawPolygon(map, opt);
                //#!#END
                //#!#START CIRCLE
                // circle overlay
                this.drawCircle(map, opt);
                //#!#END
                //#!#START STREETVIEW
                // StreetView service
                this.streetView(map, opt);
                //#!#END
                //#!#START PLACES
                // PlaceService
                this.places(map, opt);
                //#!#END
                // GeoLocation
                this.geoLocation(map, opt);
            } catch (ignore) {
                console.warn(ignore);
            }
        },
        /**
         * Events binding
         * @param {Object} marker Marker objects
         * @param {(function|Object)} event Events
         */
        bindEvents: function (target, event) {

            var self = this,
                e    = {};

            switch (typeof event) {
            case 'function':
                google.maps.event.addListener(target, 'click', event);
                break;
            case 'object':
                for (e in event) {
                    if ('function' === typeof event[e]) {
                        google.maps.event.addListener(target, e, event[e]);
                    } else {
                        if (event[e].hasOwnProperty('func') && 'function' === typeof event[e].func) {
                            if (event[e].hasOwnProperty('once') && true === event[e].once) {
                                google.maps.event.addListenerOnce(target, e, event[e].func);
                            } else {
                                google.maps.event.addListener(target, e, event[e].func);
                            }
                        } else if ('function' === typeof event[e]) {
                            google.maps.event.addListener(target, e, event[e]);
                        }
                    }
                }
                break;
            }
            if (target.hasOwnProperty('infoWindow')) {
                google.maps.event.addListener(target, 'click', function () {
                    var i = 0,
                        m = {};
                    // Close all infoWindows if `infoWindowAutoClose` was true.
                    if (self.options.hasOwnProperty('infoWindowAutoClose') &&
                        true === self.options.infoWindowAutoClose
                    ) {
                        for (i = 0; i < self._markers.length; i += 1) {
                            m = self._markers[i];
                            if (m.hasOwnProperty('infoWindow') && 'function' === typeof m.infoWindow.close) {
                                m.infoWindow.close();
                            }
                        }
                    }
                    target.infoWindow.open(self.map, target);
                });
            }
        },
        //#!#START ADSENSE
        /**
         * Adsense overlay
         * @param {Object} map Map instance
         * @param {Object} opt options
         */
        adsense: function (map, opt) {

            var defOpt = {}, adUnit = {};

            if (opt.hasOwnProperty('adsense')) {
                defOpt = $.extend({}, {
                    'map': map,
                    'format': 'BANNER',
                    'position': 'TOP',
                    'publisherId': '',
                    'channelNumber': ''
                }, opt.adsense);

                defOpt.format = 'undefined' !== google.maps.adsense.AdFormat[defOpt.format] ?
                                google.maps.adsense.AdFormat[defOpt.format] :
                                google.maps.adsense.AdFormat['BANNER'];
                defOpt.position = 'undefined' !== google.maps.ControlPosition[defOpt.position] ?
                                  google.maps.ControlPosition[defOpt.position] :
                                  google.maps.ControlPosition['TOP_CENTER'];

                adUnit = new google.maps.adsense.AdUnit(
                    document.createElement('div'),
                    defOpt
                );
            }
            
        },
        //#!#END
        //#!#START KML
        /**
         * KML overlay
         * @param {Object} map Map instance
         * @param {Object} opt KML options
         */
        kml: function (map, opt) {

            var self = this,
                kmlOpt = {
                    'url': '',
                    'map': map,
                    'preserveViewport': false,
                    'suppressInfoWindows': false
                },
                kml = {},
                i = 0;

            if (opt.hasOwnProperty('kml')) {
                if ('string' === typeof opt.kml) {
                    kmlOpt.url = opt.kml;
                    kml = new google.maps.KmlLayer(kmlOpt);
                    this._kmls.push(kml);
                } else if (Array.isArray(opt.kml)) {
                    for (i = 0; i < opt.kml.length; i += 1) {
                        if ('string' === typeof opt.kml[i]) {
                            kmlOpt.url = opt.kml[i];
                            kml = new google.maps.KmlLayer(kmlOpt);
                        } else if ('object' === typeof opt.kml[i]) {
                            kmlOpt = $.extend({}, kmlOpt, opt.kml[i]);
                            kml = new google.maps.KmlLayer(kmlOpt);
                            if (kmlOpt.hasOwnProperty('event')) {
                                self.bindEvents(kml, kmlOpt.event);
                            }
                        }
                        this._kmls.push(kml);
                    }
                }
            }
        },
        //#!#END
        //#!#START POLYLINE
        //begin add Multiple POLYLINE by Karry
        /**
         * Polyline overlay
         * @param {Object} map Map instance
         * @param {Object} opt Polyline options
         */
        drawPolyline: function (map, opt) {

            var self = this,
                polylineX = {},
                waypoints = [],
                polyline = {},
                distance = {},
                service = {},
                defOpt = {},
                coords = [],
                path = [],
                c1 = 0,
                c = {},
                p = {},
                i = 0,
                // Route callback
                routeCallback = function (result, status) {
                    if (status === google.maps.DirectionsStatus.OK) {
                        for (i = 0; i < result.routes[0].overview_path.length; i += 1) {
                            path.push(result.routes[0].overview_path[i]);
                        }
                        polyline.setPath(path);
                        if ('function' === typeof polylineX.getDistance) {
                            distance = result.routes[0].legs[0].distance;
                            polylineX.getDistance.call(this, distance);
                        }
                    }
                };

            if (opt.hasOwnProperty('polyline') && Array.isArray(opt.polyline)) {
                for (c1 = 0; c1 < opt.polyline.length; c1 += 1) {
                    polylineX = opt.polyline[c1];
                    if (polylineX.hasOwnProperty('coords') &&
                        Array.isArray(polylineX.coords)
                    ) {
                        coords = new google.maps.MVCArray();
                        for (i = 0; i < polylineX.coords.length; i += 1) {
                            p = polylineX.coords[i];
                            c = parseLatLng(p, true);
                            if ('function' === typeof c.lat) {
                                coords.push(c);
                            }
                        }
                        // Options merge
                        defOpt = $.extend({}, {
                            'strokeColor'  : polylineX.color || '#FF0000',
                            'strokeOpacity': polylineX.opacity || 1.0,
                            'strokeWeight' : polylineX.width || 2
                        }, polylineX);

                        polyline = new google.maps.Polyline(defOpt);
                        self._polylines.push(polyline);

                        if (2 < coords.getLength()) {
                            for (i = 0; i < coords.length; i += 1) {
                                if (0 < i && (coords.length - 1 > i)) {
                                    waypoints.push({
                                        'location': coords.getAt(i),
                                        'stopover': false
                                    });
                                }
                            }
                        }

                        // Created event for circle is created.
                        if (polyline && defOpt.hasOwnProperty('event') &&
                            defOpt.event.hasOwnProperty('created') &&
                            'function' === typeof defOpt.event.created
                        ) {
                            defOpt.event.created.call(polyline, self);
                        }

                        // Events binding
                        if (polylineX.hasOwnProperty('event')) {
                            self.bindEvents(polyline, polylineX.event);
                        }

                        if (polylineX.hasOwnProperty('snap') &&
                            true === polylineX.snap
                        ) {
                            service = new google.maps.DirectionsService();
                            service.route({
                                'origin': coords.getAt(0),
                                'waypoints': waypoints,
                                'destination': coords.getAt(coords.length - 1),
                                'travelMode': google.maps.DirectionsTravelMode.DRIVING
                            }, routeCallback);
                        } else {
                            polyline.setPath(coords);
                            if (google.maps.hasOwnProperty('geometry') &&
                                google.maps.geometry.hasOwnProperty('spherical')
                            ) {
                                if ('function' === typeof google.maps.geometry.spherical.computeDistanceBetween) {
                                    distance = google.maps
                                                     .geometry
                                                     .spherical
                                                     .computeDistanceBetween(
                                                         coords.getAt(0),
                                                         coords.getAt(coords.length - 1)
                                                     );
                                    if ('function' === typeof polylineX.getDistance) {
                                        polylineX.getDistance.call(self, distance);
                                    }
                                }
                            }
                        }
                        polyline.setMap(map);
                    }
                }
            }
        },
        //add Multiple POLYLINE by karry
        //#!#END
        //#!#START POLYGON
        /**
         * Polygon overlay
         * @param {Object} map Map instance
         * @param {Object} opt Polygon options
         */
        drawPolygon: function (map, opt) {

            var self = this,
                polygon = {},
                defOpt = {},
                coords = [],
                len = 0,
                i = 0,
                j = 0,
                p = {},
                c = {};

            if (opt.hasOwnProperty('polygon') && Array.isArray(opt.polygon)) {
                for (i = 0; i < opt.polygon.length; i += 1) {
                    coords = [];
                    if (opt.polygon[i].hasOwnProperty('coords')) {
                        for (j = 0; j < opt.polygon[i].coords.length; j += 1) {
                            p = opt.polygon[i].coords[j];
                            c = parseLatLng(p, true);
                            if ('function' === typeof c.lat) {
                                coords.push(c);
                            }
                        }
                        defOpt = $.extend({}, {
                            'path': coords,
                            'strokeColor': opt.polygon[i].color || '#FF0000',
                            'strokeOpacity': 1.0,
                            'strokeWeight': opt.polygon[i].width || 2,
                            'fillColor': opt.polygon[i].fillcolor || '#CC0000',
                            'fillOpacity': 0.35
                        }, opt.polygon[i]);

                        polygon = new google.maps.Polygon(defOpt);
                        self._polygons.push(polygon);
                        polygon.setMap(map);

                        // Created event for circle is created.
                        if (polygon && defOpt.hasOwnProperty('event') &&
                            defOpt.event.hasOwnProperty('created') &&
                            'function' === typeof defOpt.event.created
                        ) {
                            defOpt.event.created.call(polygon, self);
                        }
                        if (defOpt.hasOwnProperty('event')) {
                            self.bindEvents(polygon, defOpt.event);
                        }
                    }
                }
            }
        },
        //#!#END
        //#!#START CIRCLE
        /**
         * Circle overlay
         * @param {Object} map Map instance
         * @param {Object} opt Circle options
         */
        drawCircle: function (map, opt) {

            var self = this,
                circles = {},
                circle = {},
                defOpt = {},
                loc = {},
                c = 0;

            if (opt.hasOwnProperty('circle') && Array.isArray(opt.circle)) {
                for (c = 0; c < opt.circle.length; c += 1) {
                    circle = opt.circle[c];
                    defOpt = $.extend({}, {
                        'map': map,
                        'strokeColor': circle.color || '#FF0000',
                        'strokeOpacity': circle.opacity || 0.8,
                        'strokeWeight': circle.width || 2,
                        'fillColor': circle.fillcolor || '#FF0000',
                        'fillOpacity': circle.fillopacity || 0.35,
                        'radius': circle.radius || 10,
                        'zIndex': 100,
                        'id' : circle.hasOwnProperty('id') ? circle.id : ''
                    }, circle);
                    if (circle.hasOwnProperty('center')) {
                        loc = parseLatLng(circle.center, true);
                        defOpt.center = loc;
                    }
                    if ('function' === typeof loc.lat) {

                        circles = new google.maps.Circle(defOpt);
                        self._circles.push(circles);

                        // Created event for circle is created.
                        if (circles && defOpt.hasOwnProperty('event') &&
                            defOpt.event.hasOwnProperty('created') &&
                            'function' === typeof defOpt.event.created
                        ) {
                            defOpt.event.created.call(circles, self);
                        }
                        if (circle.hasOwnProperty('event')) {
                            self.bindEvents(circles, circle.event);
                        }
                    }
                }
            }
        },
        //#!#END
        //#!#START MARKER
        /**
         * Markers overlay
         * @param {Object} map Map instance
         * @param {Object} opt Markers options
         */
        markers: function (map, opt, source) {

            if (!opt.hasOwnProperty('marker') || !Array.isArray(opt.marker)) {
                return false;
            }

            var self = this,
                m = {},
                i = 0,
                j = 0,
                loc = {},
                markers  = self._markers,
                labels   = self._labels,
                geocoder = new google.maps.Geocoder(),
                // Geocoder callback
                geocodeCallback = function (results, status) {
                    if (status === google.maps.GeocoderStatus.OK) {
                        markers[j].setPosition(results[0].geometry.location);
                    } else {
                        throw 'Geocoder Status: ' + status;
                    }
                },
                clusterOptions = {
                    'maxZoom': null,
                    'gridSize': 60
                },
                markerCluster = {};

            /**
             * Apply marker cluster.
             * Require markerclustererplus.js
             * @see {@link http://google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclustererplus/docs/reference.html}
             * @since 2015-04-30 10:18:33
             */
            if (opt.hasOwnProperty('markerCluster')) {
                if ('function' === typeof MarkerClusterer) {
                    clusterOptions = $.extend({}, clusterOptions, opt.markerCluster);
                    self._clusters = new MarkerClusterer(map, [], clusterOptions);
                    if (clusterOptions.hasOwnProperty('event')) {
                        self.bindEvents(self._clusters, clusterOptions.event);
                    }
                }
            }

            // For first initialize of instance.
            if ((!source || 0 === markers.length)) {
                for (i = 0; i < opt.marker.length; i += 1) {
                    m = opt.marker[i];
                    if (m.hasOwnProperty('addr')) {
                        m.parseAddr = parseLatLng(m.addr, true);
                        if ('string' === typeof m.parseAddr) {
                            self.markerGeocoder(map, m, opt);
                        } else {
                            self.markerDirect(map, m, opt);
                        }
                    }
                }
                source = undefined;
            }

            // Modify markers
            if ('modify' === source) {
                for (i = 0; i < opt.marker.length; i += 1) {
                    if (opt.marker[i].hasOwnProperty('id')) {
                        for (j = 0; j < markers.length; j += 1) {
                            if (opt.marker[i].id === markers[j].id &&
                                opt.marker[i].hasOwnProperty('addr')
                            ) {
                                // Fix the marker which has `id` and `addr`
                                // will disappear when call the modify.
                                // @since v3.1.6
                                loc = parseLatLng(opt.marker[i].addr, true);
                                if ('string' === typeof loc) {
                                    geocoder.geocode({'address': loc}, geocodeCallback);
                                } else {
                                    markers[j].setPosition(loc);
                                }
                                if (opt.marker[i].hasOwnProperty('text')) {
                                    if (markers[j].hasOwnProperty('infoWindow')) {
                                        if ('function' === typeof markers[j].infoWindow.setContent) {
                                            markers[j].infoWindow.setContent(opt.marker[i].text);
                                        }
                                    } else {
                                        markers[j].infoWindow = new google.maps.InfoWindow({
                                            'content': opt.marker[i].text
                                        });
                                        self.bindEvents(markers[j], opt.marker[i].event);
                                    }
                                }
                                if (opt.marker[i].hasOwnProperty('icon')) {
                                    markers[j].setIcon(opt.marker[i].icon);
                                }
                            // Insert if the forceInsert was true when
                            // id property was not matched.
                            // @since v3.1.2
                            } else {
                                if (opt.marker[i].hasOwnProperty('forceInsert') &&
                                    opt.marker[i].forceInsert === true &&
                                    opt.marker[i].hasOwnProperty('addr')) {
                                    opt.marker[i].parseAddr = parseLatLng(opt.marker[i].addr, true);
                                    if ('string' === typeof opt.marker[i].parseAddr) {
                                        self.markerGeocoder(map, opt.marker[i], opt);
                                    } else {
                                        self.markerDirect(map, opt.marker[i]);
                                    }
                                    break;
                                }
                            }
                        }
                    }  else {
                        if (opt.marker[i].hasOwnProperty('addr')) {
                            opt.marker[i].parseAddr = parseLatLng(opt.marker[i].addr, true);
                            if ('string' === typeof opt.marker[i].parseAddr) {
                                self.markerGeocoder(map, opt.marker[i]);
                            } else {
                                self.markerDirect(map, opt.marker[i]);
                            }
                        }
                    }
                    // Re-drawing the labels
                    for (j = 0; j < labels.length; j += 1) {
                        if (opt.marker[i].id === labels[j].id) {
                            if (opt.marker[i].hasOwnProperty('label')) {
                                labels[j].text = opt.marker[i].label;
                            }
                            if (opt.marker[i].hasOwnProperty('css')) {
                                $(labels[j].span).addClass(opt.marker[i].css);
                            }
                            labels[j].draw();
                        }
                    }
                }
            }
        },
        /**
         * Build the icon options of marker
         * @param {Object} opt Marker option
         */
        markerIcon: function (opt) {

            var icons = $.extend({}, opt.icon);

            if (opt.hasOwnProperty('icon')) {
                if ('string' === typeof opt.icon) {
                    return opt.icon;
                }
                if (opt.icon.hasOwnProperty('url')) {
                    icons.url = opt.icon.url;
                }
                if (opt.icon.hasOwnProperty('size')) {
                    if (Array.isArray(opt.icon.size) &&
                        2 === opt.icon.size.length
                    ) {
                        icons.size = this.formatSize(opt.icon);
                    }
                }
                if (opt.icon.hasOwnProperty('scaledSize')) {
                    if (Array.isArray(opt.icon.scaledSize) &&
                        2 === opt.icon.scaledSize.length
                    ) {
                        icons.scaledSize = this.formatSize(opt.icon.scaledSize);
                    }
                }
                if (opt.icon.hasOwnProperty('anchor')) {
                    if (Array.isArray(opt.icon.anchor) &&
                        2 === opt.icon.anchor.length
                    ) {
                        icons.anchor = this.formatPoint(opt.icon.anchor);
                    }
                }
            }
            return icons;
        },
        /**
         * Set a marker directly by latitude and longitude
         * @param {Object} opt Options
         */
        markerDirect: function (map, opt) {

            var self    = this,
                marker  = {},
                label   = {},
                id      = opt.hasOwnProperty('id') ? opt.id : '',
                title   = opt.hasOwnProperty('title') ?
                          opt.title.toString().replace(/<([^>]+)>/g, '') :
                          false,
                content = opt.hasOwnProperty('text') ? opt.text.toString() : false,
                icons   = self.markerIcon(opt),
                iwOpt   = {},
                clusterOptions = {
                    'maxZoom': null,
                    'gridSize': 60
                },
                markerOptions = $.extend({}, {
                    'map': map,
                    'position': opt.parseAddr,
                    'animation': null,
                    'id': id
                }, opt);

            if (title) {
                markerOptions.title = title;
            }
            /**
             * infoWindowOptions
             * @since v3.2.9
             */
            if (content) {
                iwOpt.content = content;
                if (opt.hasOwnProperty('infoWindowOptions')) {
                    iwOpt = $.extend({}, iwOpt, opt.infoWindowOptions);
                    if (iwOpt.hasOwnProperty('pixelOffset') && Array.isArray(iwOpt.pixelOffset)) {
                        iwOpt.pixelOffset = self.formatSize(iwOpt.pixelOffset);
                    }
                }
                markerOptions.text = content;
                markerOptions.infoWindow = new google.maps.InfoWindow(iwOpt);
            }
            
            if (!$.isEmptyObject(icons)) {
                markerOptions.icon = icons;
            }
            if (opt.hasOwnProperty('animation') && 'string' === typeof opt.animation) {
                markerOptions.animation = google.maps.Animation[opt.animation.toUpperCase()];
            }
            marker = 'function' === typeof MarkerWithLabel ?
                     new MarkerWithLabel(markerOptions) :
                     new google.maps.Marker(markerOptions);
            self._markers.push(marker);

            // Created event for marker is created.
            if (marker && opt.hasOwnProperty('event') &&
                opt.event.hasOwnProperty('created') &&
                'function' === typeof opt.event.created
            ) {
                opt.event.created.call(marker, self);
            }

            // Apply marker fitbounds
            if (marker.hasOwnProperty('position')) {
                if ('function' === typeof marker.getPosition) {
                    self._bounds.extend(marker.position);
                }
                if (self.options.hasOwnProperty('markerFitBounds') &&
                    true === self.options.markerFitBounds
                ) {
                    // Make sure fitBounds call after the last marker created.
                    if (self._markers.length === self.options.marker.length) {
                        map.fitBounds(self._bounds);
                    }
                }
            }
            /**
             * Apply marker cluster.
             * Require markerclusterer.js
             * @see {@link http://google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclusterer/src/}
             * @since 2015-04-30 10:18:33
             */
            if (!opt.hasOwnProperty('cluster') || (opt.hasOwnProperty('cluster') && true === opt.cluster)) {
                if ('function' === typeof self._clusters.addMarker) {
                    self._clusters.addMarker(marker);
                }
            }
            if (opt.hasOwnProperty('newLabel')) {
                label = new Label({
                    'text': opt.newLabel,
                    'map' : map,
                    'css' : opt.hasOwnProperty('newLabelCSS') ? opt.newLabelCSS.toString() : '',
                    'id'  : id
                });
                label.bindTo('position', marker, 'position');
                label.bindTo('visible', marker);
                self._labels.push(label);
            }
            // Hide labels when clustering.
            // @since 3.2.16 2015-08-10
            google.maps.event.addListener(marker, 'map_changed', function () {
                if ('function' === typeof label.setMap) {
                    label.setMap(this.getMap());
                }
            });
            // Binding events
            self.bindEvents(marker, opt.event);
        },
        /**
         * Set a marker by Geocoder service
         * @param {Object} map Map instance
         * @param {Object} opt Options
         * @param {Object} def Default options
         */
        markerGeocoder: function (map, opt, def) {

            var geocoder = new google.maps.Geocoder(),
                self = this;

            geocoder.geocode({'address': opt.parseAddr}, function (results, status) {
                // If exceeded, call it later by setTimeout;
                if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                    window.setTimeout(function () {
                        self.markerGeocoder(map, opt);
                    }, self.interval);
                } else if (status === google.maps.GeocoderStatus.OK) {
                    var marker = {},
                        label = {},
                        id    = opt.hasOwnProperty('id') ? opt.id : '',
                        title = opt.hasOwnProperty('title') ?
                                opt.title.toString().replace(/<([^>]+)>/g, '') :
                                false,
                        content = opt.hasOwnProperty('text') ? opt.text.toString() : false,
                        clusterOptions = {
                            'maxZoom': null,
                            'gridSize': 60
                        },
                        clusterNoDraw = false,
                        markerOptions = {
                            'map': map,
                            'position': results[0].geometry.location,
                            'animation': null,
                            'visible': true,
                            'id': id
                        },
                        icons = self.markerIcon(opt);

                    if (title) {
                        markerOptions.title = title;
                    }
                    if (content) {
                        markerOptions.text = content;
                        markerOptions.infoWindow = new google.maps.InfoWindow({
                            'content': content
                        });
                    }
                    if (!$.isEmptyObject(icons)) {
                        markerOptions.icon = icons;
                    }
                    if (opt.hasOwnProperty('animation') && 'string' === typeof opt.animation) {
                        markerOptions.animation = google.maps.Animation[opt.animation.toUpperCase()];
                    }
                    
                    markerOptions = $.extend({}, markerOptions, opt);
                    marker = 'function' === typeof MarkerWithLabel ?
                             new MarkerWithLabel(markerOptions) :
                             new google.maps.Marker(markerOptions);
                    self._markers.push(marker);

                    // Created event for marker is created.
                    if (marker && opt.hasOwnProperty('event') &&
                        opt.event.hasOwnProperty('created') &&
                        'function' === typeof opt.event.created
                    ) {
                        opt.event.created.call(marker, self);
                    }

                    // Apply marker fitbounds
                    if (marker.hasOwnProperty('position')) {
                        if ('function' === typeof marker.getPosition) {
                            self._bounds.extend(marker.position);
                        }
                        if (self.options.hasOwnProperty('markerFitBounds') &&
                            true === self.options.markerFitBounds
                        ) {
                            // Make sure fitBounds called after the last marker created.
                            // @since v3.1.7
                            if (self._markers.length === def.marker.length) {
                                map.fitBounds(self._bounds);
                            }
                        }
                    }
                    /**
                     * Apply marker cluster.
                     * Require markerclusterer.js
                     * @see {@link http://google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclusterer/src/}
                     * @since 2015-04-30 10:18:33
                     */
                    if (!opt.hasOwnProperty('cluster') || (opt.hasOwnProperty('cluster') && true === opt.cluster)) {
                        if ('function' === typeof self._clusters.addMarker) {
                            self._clusters.addMarker(marker);
                        }
                    }
                    
                    if (opt.hasOwnProperty('newLabel')) {
                        label = new Label({
                            'text': opt.newLabel,
                            'map' : self.map,
                            'css' : opt.hasOwnProperty('newLabelCSS') ? opt.newLabelCSS.toString() : '',
                            'id'  : id
                        });
                        label.bindTo('position', marker, 'position');
                        label.bindTo('text', marker, 'position');
                        label.bindTo('visible', marker);
                        self._labels.push(label);
                    }
                    // Hide labels when clustering.
                    // @since 3.2.16 2015-08-10
                    google.maps.event.addListener(marker, 'map_changed', function () {
                        if ('function' === typeof label.setMap) {
                            label.setMap(this.getMap());
                        }
                    });
                    // Binding events
                    self.bindEvents(marker, opt.event);
                }
            });
        },
        //#!#END
        //#!#START DIRECTION
        /**
         * Direction overlay
         * @param {Object} map Map instance
         * @param {Object} opt Direction options
         */
        direction: function (map, opt) {
            var d = 0;
            if (opt.hasOwnProperty('direction') && Array.isArray(opt.direction)) {
                for (d = 0; d < opt.direction.length; d += 1) {
                    if ('undefined' !== typeof opt.direction[d]) {
                        this.directionService(opt.direction[d]);
                    }
                }
            }

        },
        /**
         * Direction service
         * @param {Object} opt Options
         */
        directionService: function (opt) {

            // Make sure the `from` and `to` properties has setting.
            if (!(opt.hasOwnProperty('from') && opt.hasOwnProperty('to'))) {
                return false;
            }
            
            var self = this,
                directionsService = new google.maps.DirectionsService(),
                directionsDisplay = new google.maps.DirectionsRenderer(),
                waypointsOpts = {},
                waypointsText = [],
                waypointsIcon = [],
                infoWindow = new google.maps.InfoWindow(),
                waypoints  = [],
                renderOpts = {},
                startText = '',
                endText = '',
                request = {
                    'travelMode': google.maps.DirectionsTravelMode.DRIVING,
                    'optimizeWaypoints': opt.hasOwnProperty('optimize') ? opt.optimize : true
                };
                i = 0;

            request.origin = parseLatLng(opt.from, true);
            request.destination = parseLatLng(opt.to, true);
            renderOpts = $.extend({}, {
                'infoWindow': infoWindow,
                'map': self.map
            }, opt);

            if (opt.hasOwnProperty('travel') &&
                google.maps.TravelMode[opt.travel.toString().toUpperCase()]
            ) {
                request.travelMode = google.maps.TravelMode[opt.travel.toString().toUpperCase()];
            }
            if (opt.hasOwnProperty('panel') && $(opt.panel).length) {
                renderOpts.panel = $(opt.panel).get(0);
            }
            if (opt.hasOwnProperty('waypoint') && Array.isArray(opt.waypoint)) {
                for (i = 0; i < opt.waypoint.length; i += 1) {
                    waypointsOpts = {};
                    if ('string' === typeof opt.waypoint[i] || Array.isArray(opt.waypoint[i])) {
                        waypointsOpts = {
                            'location': parseLatLng(opt.waypoint[i], true),
                            'stopover': true
                        };
                    } else {
                        if (opt.waypoint[i].hasOwnProperty('location')) {
                            waypointsOpts.location = parseLatLng(opt.waypoint[i].location, true);
                        }
                        waypointsOpts.stopover = opt.waypoint[i].hasOwnProperty('stopover') ?
                                                 opt.waypoint[i].stopover :
                                                 true;
                    }
                    waypointsText.push(opt.waypoint[i].text || opt.waypoint[i].toString());
                    if (opt.waypoint[i].hasOwnProperty('icon')) {
                        waypointsIcon.push(opt.waypoint[i].icon.toString());
                    }
                    waypoints.push(waypointsOpts);
                }
                request.waypoints = waypoints;
            }
            // Direction service callback
            directionsService.route(request, function (response, status) {
                var legs = [],
                    wp = {},
                    i = 0;
                if (status === google.maps.DirectionsStatus.OK) {
                    legs = response.routes[0].legs;
                    try {
                        if (opt.hasOwnProperty('fromText')) {
                            legs[0].start_address = opt.fromText;
                            startText = opt.fromText;
                        }
                        if (opt.hasOwnProperty('toText')) {
                            if (1 === legs.length) {
                                legs[0].end_address = opt.toText;
                            } else {
                                legs[legs.length - 1].end_address = opt.toText;
                            }
                            endText = opt.toText;
                        }
                        if (opt.hasOwnProperty('icon')) {
                            renderOpts.suppressMarkers = true;
                            if (opt.icon.hasOwnProperty('from') && 'string' === typeof opt.icon.from) {
                                self.directionServiceMarker(legs[0].start_location, {
                                    'icon': opt.icon.from,
                                    'text': startText
                                }, infoWindow, opt);
                            }
                            if (opt.icon.hasOwnProperty('to') && 'string' === typeof opt.icon.to) {
                                self.directionServiceMarker(legs[legs.length - 1].end_location, {
                                    'icon': opt.icon.to,
                                    'text': endText
                                }, infoWindow, opt);
                            }
                        }
                        for (i = 0; i < legs.length; i += 1) {
                            if (opt.hasOwnProperty('icon')) {
                                if (opt.icon.hasOwnProperty('waypoint') && 'string' === typeof opt.icon.waypoint) {
                                    wp.icon = opt.icon.waypoint;
                                } else if ('string' === typeof waypointsIcon[i - 1]) {
                                    wp.icon = waypointsIcon[i - 1];
                                }
                                wp.text = waypointsText[i - 1];
                                self.directionServiceMarker(legs[i].start_location, wp, infoWindow, opt);
                            }
                        }
                    } catch (ignore) {
                    }
                    self.bindEvents(directionsDisplay, opt.event);
                    directionsDisplay.setOptions(renderOpts);
                    directionsDisplay.setDirections(response);
                }
            });
            self._directions.push(directionsDisplay);
        },
        /**
         * Create the marker for directions
         * @param {Object} loc LatLng Location
         * @param {Object} opt MarkerOptions
         * @param {Object} info Global infoWindow object
         * @param {Object} d Direction marker options
         */
        directionServiceMarker: function (loc, opt, info, d) {

            var self = this,
                evt = {},
                setting = $.extend({}, {
                    'position': loc,
                    'map': self.map,
                    'id' : d.hasOwnProperty('id') ? d.id : ''
                }, opt),
                marker  = new google.maps.Marker(setting);

            if (setting.hasOwnProperty('text')) {
                evt = function () {
                    info.setPosition(loc);
                    info.setContent(setting.text);
                    info.open(self.map, marker);
                };
            }
            self._directionsMarkers.push(marker);
            self.bindEvents(marker, evt);
        },
        /**
         * Get directions info
         * @return {Array} All directions info includes distance and duration.
         */
        getDirectionsInfo: function () {

            var self   = this,
                result = [],
                legs   = null,
                dr     = self._directions,
                ci     = 0,
                cj     = 0,
                i      = 0,
                j      = 0;
                
            if (dr) {
                for (i = 0, ci = dr.length; i < ci; i += 1) {
                    if (
                        dr[i].hasOwnProperty('directions') &&
                        dr[i].directions.hasOwnProperty('routes') &&
                        'undefined' !== typeof dr[i].directions.routes[0].legs
                    ) {
                        legs = dr[i].directions.routes[0].legs;
                        result[i] = [];
                        for (j = 0, cj = legs.length; j < cj; j += 1) {
                            result[i].push({
                                'from': legs[j].start_address,
                                'to'  : legs[j].end_address,
                                'distance': legs[j].distance,
                                'duration': legs[j].duration
                            });
                        }

                    }
                }
            }
            return result;
        },
        //#!#END
        //#!#START STREETVIEW
        /**
         * Switch StreetView
         * @param {Object} map Map instance
         * @param {Object} opt Options
         */
        streetView: function (map, opt) {

            var self = this,
                opts = opt.hasOwnProperty('streetViewObj') ? opt.streetViewObj : {},
                pano = {},
                loc  = {};

            if ('function' === typeof map.getStreetView) {
                // Default position of streetView
                if (opts.hasOwnProperty('position')) {
                    loc = parseLatLng(opts.position, true);
                    opts.position = 'object' === typeof loc ? map.getCenter() : loc;
                } else {
                    opts.position = map.getCenter();
                }
                // Pov configure
                if (opts.hasOwnProperty('pov')) {
                    opts.pov = $.extend({}, {
                        'heading': 0,
                        'pitch'  : 0,
                        'zoom'   : 1
                    }, opts.pov);
                }
                pano = map.getStreetView();
                // Apply options
                pano.setOptions(opts);
                
                // Events Binding
                if (opts.hasOwnProperty('event')) {
                    self.bindEvents(pano, opts.event);
                }
                if (opts.hasOwnProperty('visible')) {
                    pano.setVisible(opts.visible);
                }
            }
        },
        //#!#END
        //#!#START PLACES
        /**
         * Places API
         * @param {Object} map Map instance
         * @param {Object} opt Options
         */
        places: function (map, opt) {

            var self = this,
                placesService = {},
                reqOpt = opt.hasOwnProperty('places') ? opt.places : {},
                request = $.extend({}, {
                    'location': map.getCenter(),
                    'radius'  : 100
                }, reqOpt),
                i = 0;

            request.location = parseLatLng(request.location, true);

            if ('undefined' !== typeof google.maps.places) {
                placesService = new google.maps.places.PlacesService(map);
                placesService.nearbySearch(request, function (results, status) {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        self._places.push(results);
                        if (request.hasOwnProperty('createMarker') && true === request.createMarker) {
                            for (i = 0; i < results.length; i += 1) {
                                if (results[i].hasOwnProperty('geometry')) {
                                    self._markers.push(new google.maps.Marker({
                                        'map': map,
                                        'position': results[i].geometry.location
                                    }));
                                }
                            }
                        }
                        if (request.hasOwnProperty('callback') && 'function' === typeof request.callback) {
                            request.callback.call(results);
                        }
                    }
                });
            }
        },
        //#!#END
        /**
         * Use HTML5 Geolocation API to detect the client's location.
         * @param {Object} map Map intance
         * @param {Object} opt Plugin options
         */
        geoLocation: function (map, opt) {

            try {

                var self = this,
                    geolocation = navigator.geolocation,
                    geoOpt = {};

                if (!geolocation) {
                    return;
                }
                if (opt.hasOwnProperty('geolocation')) {
                    geoOpt = $.extend({}, {
                        'maximumAge'        : 600000,
                        'timeout'           : 3000,
                        'enableHighAccuracy': false
                    }, opt.geolocation);
                }
                
                if (true === opt.autoLocation || 'function' === typeof opt.autoLocation) {
                    geolocation.getCurrentPosition(
                        function (loc) {
                            if (('undefined' !== typeof loc) &&
                                ('coords' in loc) &&
                                ('latitude' in loc.coords) &&
                                ('longitude' in loc.coords)
                            ) {
                                map.panTo(new google.maps.LatLng(
                                    loc.coords.latitude,
                                    loc.coords.longitude
                                ));
                                if ('function' === typeof opt.autoLocation) {
                                    opt.autoLocation.call(self, loc);
                                }
                            }
                        },
                        function (error) {
                            console.error(error);
                        },
                        geoOpt
                    );
                }
            } catch (ignore) {
            }
        },
        //#!#START PANTO
        /**
         * Method: Google Maps PanTo
         * @param {(string|string[]|number[]|Object)} addr Location
         */
        panTo: function (addr) {

            var m = this.map,
                loc = {},
                geocoder = {};

            if (null !== m && 'undefined' !== typeof m) {
                loc = parseLatLng(addr, true);
                if ('string' === typeof loc) {
                    geocoder = new google.maps.Geocoder();
                    geocoder.geocode({'address': loc}, function (results, status) {
                        if (status === google.maps.GeocoderStatus.OK &&
                            'function' === typeof m.panTo &&
                            Array.isArray(results) &&
                            results.length
                        ) {
                            if (results[0].hasOwnProperty('geometry')) {
                                m.panTo(results[0].geometry.location);
                            }
                        } else {
                            console.error(status);
                        }
                    });
                } else {
                    if ('function' === typeof m.panTo) {
                        m.panTo(loc);
                    }
                }
            }
            return $(this.container);
        },
        //#!#END
        //#!#START CLOSE
        /**
         * Method: Close all infoWindow on map
         * @param {string} type Layer type
         */
        close: function (layer, callback) {
            var self   = this,
                layers = self.get(layer),
                item   = {},
                loop   = {},
                obj    = '',
                i      = 0;

            if (layers.hasOwnProperty('map')) {
                delete layers.map;
            }

            if (Array.isArray(layers)) {
                loop[layer] = layers;
            } else {
                loop = layers;
            }

            try {
                for (obj in loop) {
                    if (Array.isArray(loop[obj])) {
                        for (i = 0; i < loop[obj].length; i += 1) {
                            item = loop[obj][i];
                            if (item.hasOwnProperty('infoWindow') &&
                                'function' === typeof item.infoWindow.close
                            ) {
                                item.infoWindow.close();
                            }
                        }
                    }
                }
                
                if ('function' === typeof callback) {
                    callback.call(this);
                }
            } catch (ignore) {
                console.warn(ignore);
            } finally {
                return $(self.container);
            }
        },
        //#!#END
        //#!#START CLEAR
        /**
         * Method: Google Maps clear the specificed layer
         * @param {string} type Layer type
         */
        clear: function (layer, callback) {

            var self     = this,
                dMarkers = self._directionsMarkers,
                labels   = self._labels,
                layers   = self.get(layer),
                loop     = {},
                item     = {},
                obj      = '',
                i        = 0;

            if (layers.hasOwnProperty('map')) {
                delete layers.map;
            }

            if (Array.isArray(layers)) {
                loop[layer] = layers;
            } else {
                loop = layers;
            }
            
            try {
                for (obj in loop) {
                    key = '_' + obj.toString().toLowerCase() + 's';
                    if (Array.isArray(loop[obj])) {
                        for (i = 0; i < loop[obj].length; i += 1) {
                            item = loop[obj][i];
                            if ('marker' === obj) {
                                if ('undefined' !== typeof labels[i] && labels.hasOwnProperty('div')) {
                                    self._labels[i].div.remove();
                                }
                            }
                            // Remove the direction icons.
                            if ('direction' === obj) {
                                for (j = 0; j < dMarkers.length; j += 1) {
                                    if ('function' === typeof dMarkers[j].setMap) {
                                        self._directionsMarkers[j].setMap(null);
                                    }
                                }
                                self._directionsMarkers.filter(function (n) {
                                    return undefined !== n;
                                });
                            }
                            // Remove from Map
                            if ('function' === typeof item.set) {
                                item.set('visible', false);
                            }
                            if ('function' === typeof item.setMap) {
                                item.setMap(null);
                            }
                            // Remove from Array
                            self[key][i] = undefined;
                        }
                        // Filter undefined elements
                        self[key] = self[key].filter(function (n) {
                            return undefined !== n;
                        });
                    }
                }
                if ('function' === typeof callback) {
                    callback.call(this);
                }
            } catch (ignore) {
                console.warn(ignore);
            } finally {
                return $(self.container);
            }
        },
        //#!#END
        //#!#START GET
        /**
         * Method: Google Maps get the specificed layer
         * @param {string} type Layer type
         */
        get: function (layer, callback) {

            var self     = this,
                dMarkers = self._directionsMarkers,
                labels   = self._labels,
                layers   = [],
                result   = [],
                target   = {},
                item     = {},
                obj      = {},
                key      = '',
                lb       = '',
                i        = 0,
                j        = 0;

            if ('undefined' === typeof layer) {
                layer = {
                    'marker'   : [],
                    'label'    : [],
                    'polygon'  : [],
                    'polyline' : [],
                    'circle'   : [],
                    'direction': [],
                    'kml'      : [],
                    'cluster'  : [], // @since 3.2.10
                    'bound'    : []  // @since 3.2.10
                };
            }

            try {
                if ('string' === typeof layer) {
                    if (~layer.indexOf(',')) {
                        layers = layer.replace(/\s/gi, '').split(',');
                        for (i = 0; i < layers.length; i += 1) {
                            lb = layers[i].toString().toLowerCase();
                            if ('map' === lb) {
                                target[lb] = self.map;
                            } else {
                                key = '_' + lb + 's';
                                target[lb] = self[key];
                            }
                        }
                    } else {
                        if ('map' === layer.toString().toLowerCase()) {
                            target = self.map;
                        } else {
                            key = '_' + layer.toString().toLowerCase() + 's';
                            target = self[key];
                        }
                    }
                } else {
                    for (obj in layer) {
                        if (Array.isArray(layer[obj])) {
                            key = '_' + obj.toString().toLowerCase() + 's';
                            if (Array.isArray(self[key])) {
                                target[obj] = [];
                                for (i = 0; i < self[key].length; i += 1) {
                                    item = self[key][i];
                                    if (0 === layer[obj].length || -1 !== layer[obj].indexOf(i) || (item.hasOwnProperty('id') && 0 < item.id.length && (~layer[obj].indexOf(item.id)))) {
                                        target[obj].push(item);
                                    }
                                }
                            }
                        }
                    }
                    target['map'] = self.map;
                }
                if ('function' === typeof callback) {
                    callback.call(this, target);
                }
            } catch (ignore) {
                console.warn(ignore);
            } finally {
                return target;
            }
        },
        //#!#END
        //#!#START MODIFY
        /**
         * Method:  Google Maps dynamic add layers
         * @param {Object} options Refernce by tinyMap options
         */
        modify: function (options) {

            var self  = this,
                func  = [],
                label = [
                    ['kml', 'kml'],
                    ['marker', 'markers'],
                    ['direction', 'direction'],
                    ['polyline', 'drawPolyline'],
                    ['polygon', 'drawPolygon'],
                    ['circle', 'drawCircle'],
                    ['streetView', 'streetView'],
                    ['markerFitBounds', 'markerFitBounds'],
                    ['places', 'places']
                ],
                i = 0,
                m = self.map;

            if ('undefined' !== typeof options) {
                for (i = 0; i < label.length; i += 1) {
                    if (options.hasOwnProperty(label[i][0])) {
                        func.push(label[i][1]);
                    }
                }
                if (null !== m) {
                    if (func.length) {
                        for (i = 0; i < func.length; i += 1) {
                            if ('function' === typeof self[func[i]]) {
                                if ('streetView' === func[i]) {
                                    options.streetViewObj = options.streetView;
                                    delete options.streetView;
                                }
                                self[func[i]](m, options, 'modify');
                            }
                        }
                    } else {
                        m.setOptions(options);
                    }
                    if (options.hasOwnProperty('event')) {
                        self.bindEvents(m, options.event);
                    }
                    google.maps.event.trigger(m, 'resize');
                }
            }
            return $(this.container);
        },
        //#!#END
        //#!#START DESTROY
        destroy: function () {
            var obj = $(this.container);
            if (obj.length) {
                $.removeData(this.container, 'tinyMap');
            }
            return obj.empty();
        },
        //#!#END
        //#!#START GETKML
        getKML: function (opt) {
            var m = $(this.container),
                md = m.data('tinyMap'),
                // Options
                opts = $.extend({}, {
                    'marker'   : true,
                    'polyline' : true,
                    'direction': true,
                    'download' : false
                }, opt),
                // MIME TYPE of KML
                mime = 'data:application/vnd.google-earth.kml+xml;charset=utf-8;base64,',
                // KML template
                templates = {
                    'xml': [
                        '<?xml version="1.0" encoding="UTF-8"?>',
                        '<kml xmlns="http://earth.google.com/kml/2.2">',
                        '<Document>',
                        '<name><![CDATA[]]></name>',
                        '<description><![CDATA[]]></description>',
                        '<Style id="style1">',
                        '<IconStyle>',
                        '<Icon>',
                        '<href>//maps.google.com/mapfiles/kml/paddle/grn-circle_maps.png</href>',
                        '</Icon>',
                        '</IconStyle>',
                        '</Style>',
                        '#PLACEMARKS#',
                        '</Document>',
                        '</kml>'
                    ],
                    'placemark': [
                        '<Placemark>',
                        '<name><![CDATA[]]></name>',
                        '<Snippet></Snippet>',
                        '<description><![CDATA[]]></description>',
                        '<styleUrl>#style1</styleUrl>',
                        '<ExtendedData>',
                        '</ExtendedData>',
                        '#DATA#',
                        '</Placemark>'
                    ],
                    'linestring': '<LineString><tessellate>1</tessellate><coordinates>#LATLNG#</coordinates></LineString>',
                    'point': '<Point><coordinates>#LATLNG#,0.000000</coordinates></Point>'
                },
                markers      = [],
                polylines    = [],
                polygons     = [], // keep
                circles      = [], // keep
                directions   = [],
                strMarker    = '',
                strPolyline  = '',
                strDirection = '',
                output = '',
                latlng = '',
                legs   = [],
                path   = [],
                obj    = {},
                i = 0,
                j = -1,
                k = -1,
                v = -1;

            if (md) {
                // Build markers
                if (true === opts.marker) {
                    markers = md._markers;
                    for (i = 0; i < length; i += 1) {
                        latlng = markers[i].position.lng() + ',' + markers[i].position.lat();
                        strMarker += templates.placemark.join('')
                                              .replace(
                                                  /#DATA#/gi,
                                                  templates.point.replace(/#LATLNG#/gi, latlng)
                                              );
                    }
                }
                // Build Polygons, Polylines and circles
                if (true === opts.polyline) {
                    polylines = md._polylines;
                    for (i = 0; i < polylines.length; i += 1) {
                        obj = polylines[i].getPath().getArray();
                        latlng = '';
                        for (j = 0; j < obj.length; j += 1) {
                            latlng += obj[j].lng() + ',' + obj[j].lat() + ',0.000000\n';
                        }
                        strPolyline += templates.placemark.join('')
                                                .replace(
                                                    /#DATA#/gi,
                                                    templates.linestring.replace(/#LATLNG#/gi, latlng)
                                                );

                    }
                }
                // Build Directions
                if (true === opts.direction) {
                    directions = md._directions;
                    for (i = 0; i < directions.length; i += 1) {
                        if (directions[i].hasOwnProperty('directions') &&
                            directions[i].directions.hasOwnProperty('routes') &&
                            Array.isArray(directions[i].directions.routes) &&
                            0 < directions[i].directions.routes.length &&
                            directions[i].directions.routes[0].hasOwnProperty('legs') &&
                            Array.isArray(directions[i].directions.routes[0].legs)
                        ) {
                            legs = directions[i].directions.routes[0].legs;
                            for (j = 0; j < legs.length; j += 1) {
                                if (Array.isArray(legs[j].steps)) {
                                    for (k = 0; j < legs[j].steps.length; k += 1) {
                                        latlng = '';
                                        if (Array.isArray(legs[j].steps[k].path)) {
                                            for (v = 0; v < legs[j].steps[k].path.length; v += 1) {
                                                path = legs[j].steps[k].path[v];
                                                if ('undefined' !== typeof path && 'function' === typeof path.lat) {
                                                    latlng += path.lng() + ',' + path.lat() + ',0.000000\n';
                                                }
                                            }
                                        }
                                        strDirection += templates.placemark.join('')
                                                                 .replace(
                                                                     /#DATA#/gi,
                                                                     templates.linestring.replace(/#LATLNG#/gi, latlng)
                                                                 );
                                    }
                                }
                            }
                        }
                    }
                }
                // Output KML
                output = templates.xml.join('')
                                  .replace(
                                      /#PLACEMARKS#/gi,
                                      strMarker + strPolyline + strDirection
                                  );
                if (true === opts.download) {
                    window.open(mime + window.btoa(window.decodeURIComponent(window.encodeURIComponent(output))));
                } else {
                    return output;
                }
            }
        },
        //#!#END
        /**
         * tinyMap initialize
         */
        init: function Initialize () {

            var self     = this,
                script   = {},
                geocoder = {},
                param    = $.extend({}, tinyMapConfigure),
                api      = param.api.split('?')[0],
                msg      = '',
                o        = {};

            try {
                delete param.api;
                delete param.clusterer;
                delete param.withLabel;
                param = $.param(param);
            } catch (ignore) {
            }

            // Asynchronous load the Google Maps API
            if (!apiLoaded && 'undefined' === typeof window.google) {
                script = document.createElement('script');
                script.setAttribute('src', [api, param].join('?'));
                (document.getElementsByTagName('head')[0] || document.documentElement).appendChild(script);
                apiLoaded = true;
                script = null;
            }

            // Make sure Google maps API is loaded.
            if ('object' === typeof window.google) {

                // Load MarkerClusterer library
                if (!apiClusterLoaded &&
                    self.options.hasOwnProperty('markerCluster') &&
                    false !== self.options.markerCluster &&
                    'undefined' === typeof MarkerClusterer
                ) {
                    script = document.createElement('script');
                    script.setAttribute('src', tinyMapConfigure.clusterer);
                    (document.getElementsByTagName('head')[0] || document.documentElement).appendChild(script);
                    apiClusterLoaded = true;
                    script = null;
                }
                // Load MarkerWithLabel library
                if (!apiMarkerWithLabelLoaded &&
                    self.options.hasOwnProperty('markerWithLabel') &&
                    true === self.options.markerWithLabel &&
                    'undefined' === typeof MarkerWithLabel
                ) {
                    script = document.createElement('script');
                    script.setAttribute('src', tinyMapConfigure.withLabel);
                    (document.getElementsByTagName('head')[0] || document.documentElement).appendChild(script);
                    apiMarkerWithLabelLoaded = true;
                    script = null;
                }

                self._bounds = new google.maps.LatLngBounds();
                //#!#START LABEL
                Label.prototype = new google.maps.OverlayView();
                Label.prototype.onAdd = function () {
                    var self = this;
                    self.div.appendTo($(self.getPanes().overlayLayer));
                    self.listeners = [
                        google.maps.event.addListener(self, 'visible_changed', self.onRemove)
                    ];
                };
                Label.prototype.draw = function () {
                    var self = this,
                        projection = self.getProjection(),
                        position   = {};
                    try {
                        position = projection.fromLatLngToDivPixel(self.get('position'));
                        self.div.css({
                            'left'    : position.x + 'px',
                            'top'     : position.y + 'px',
                            'display' : 'block'
                        });
                        if (self.text) {
                            self.span.html(this.text.toString());
                        }
                    } catch (ignore) {
                        console.error(ignore);
                    }
                };
                Label.prototype.onRemove = function () {
                    $(this.div).remove();
                };
                //#!#END
                // Parsing ControlOptions
                for (o in self.options) {
                    if (self.options.hasOwnProperty(o)) {
                        vo = self.options[o];
                        if (/ControlOptions/g.test(o) &&
                            vo.hasOwnProperty('position') &&
                            'string' === typeof vo.position
                        ) {
                            self.options[o].position = google.maps.ControlPosition[vo.position.toUpperCase()];
                        }
                    }
                }

                // Merge options
                self.googleMapOptions = self.options;

                // Process streetView conflict
                if (self.options.hasOwnProperty('streetView')) {
                    self.googleMapOptions.streetViewObj = self.options.streetView;
                    delete self.googleMapOptions.streetView;
                }

                // Center location parse
                self.googleMapOptions.center = parseLatLng(self.options.center, true);

                //#!#START STYLES
                // Map styles apply
                if (self.options.hasOwnProperty('styles')) {
                    if ('string' === typeof self.options.styles &&
                        styles.hasOwnProperty(self.options.styles)
                    ) {
                        self.googleMapOptions.styles = styles[self.options.styles];
                    } else if (Array.isArray(self.options.styles)) {
                        self.googleMapOptions.styles = self.options.styles;
                    }
                }
                //#!#END
                if ('string' === typeof self.options.center) {
                    geocoder = new google.maps.Geocoder();
                    geocoder.geocode({'address': self.options.center}, function (results, status) {
                        try {
                            if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                                window.setTimeout(function () {
                                    self.init();
                                }, self.interval);
                            } else if (status === google.maps.GeocoderStatus.OK && Array.isArray(results)) {
                                if (0 < results.length && results[0].hasOwnProperty('geometry')) {
                                    self.googleMapOptions.center = results[0].geometry.location;
                                    self.map = new google.maps.Map(self.container, self.googleMapOptions);
                                    google.maps.event.addListenerOnce(self.map, 'idle', function () {
                                        self.overlay();
                                        google.maps.event.trigger(self.map, 'resize');
                                    });
                                    self.bindEvents(self.map, self.options.event);
                                }
                            } else {
                                msg = (self.options.notFound || status).toString();
                                self.container.innerHTML($('<div/>').text(msg).html());
                                console.error('Geocoder Error Code: ' + status);
                            }
                        } catch (ignore) {
                            console.error(ignore);
                        }
                    });
                } else {
                    self.map = new google.maps.Map(self.container, self.googleMapOptions);
                    google.maps.event.addListenerOnce(self.map, 'idle', function () {
                        self.overlay();
                        google.maps.event.trigger(self.map, 'resize');
                    });
                    self.bindEvents(self.map, self.options.event);
                }
            }
        }
    };
    /**
     * jQuery tinyMap API configure
     * @param {Object} options Plugin configure
     * @global
     */
    $.fn.tinyMapConfigure = function (options) {
        tinyMapConfigure = $.extend(tinyMapConfigure, options);
    };
    /**
     * Calculate distances
     * @param {Object} options Query params
     * @param {Function} callback Function for callback
     * @global
     */
    $.fn.tinyMapDistance = function (options, callback) {

        var def = {
                'key': tinyMapConfigure.hasOwnProperty('key') ? tinyMapConfigure.key : '',
                'origins': [],
                'destinations': [],
                'language': 'zh-TW'
            },
            opt = $.extend({}, def, options);

        if (Array.isArray(opt.origins)) {
            opt.origins = opt.origins.join('|');
        }
        if (Array.isArray(opt.destinations)) {
            opt.destinations = opt.destinations.join('|');
        }
        $.getJSON(
            '//maps.googleapis.com/maps/api/distancematrix/json',
            opt,
            function (data) {
                if (data.status === 'OK') {
                    callback.cal(this, data);
                }
            });
    };
    /**
     * Quick query latlng/address
     * @param {Object} options Query params
     * @param {Function} callback Function for callback
     * @global
     */
    $.fn.tinyMapQuery = function (options, callback) {

        var def = {
                'key': tinyMapConfigure.hasOwnProperty('key') ? tinyMapConfigure.key : '',
                'language': 'zh-TW'
            },
            opt = $.extend({}, def, options),
            result = null;

        $.getJSON(
            '//maps.googleapis.com/maps/api/geocode/json',
            opt,
            function (data) {
                if (data.status === 'OK') {
                    if (data.results && 'undefined' !== typeof data.results[0]) {
                        if (opt.hasOwnProperty('latlng')) {
                            result = data.results[0].formatted_address;
                        } else if (opt.hasOwnProperty('address')) {
                            result = [
                                data.results[0].geometry.location.lat,
                                data.results[0].geometry.location.lng
                            ].join(',');
                        }
                        callback.call(this, result);
                    }
                }
            });
    };
    /**
     * jQuery tinyMap instance
     * @param {Object} options Plugin settings
     * @public
     */
    $.fn.tinyMap = function (options) {
        var instance = {},
            result = [],
            args = arguments,
            id  = 'tinyMap';
        if ('string' === typeof options) {
            this.each(function () {
                instance = $.data(this, id);
                if (instance instanceof TinyMap && 'function' === typeof instance[options]) {
                    result = instance[options].apply(instance, Array.prototype.slice.call(args, 1));
                }
            });
            return 'undefined' !== typeof result ? result : this;
        } else {
            return this.each(function () {
                if (!$.data(this, id)) {
                    $.data(this, id, new TinyMap(this, options));
                }
            });
        }
    };
})(window.jQuery || {}, window, document);
//#EOF
