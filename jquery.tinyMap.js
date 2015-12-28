/*globals $,google,MarkerClusterer,MarkerWithLabel */
/**
 * jQuery tinyMap plugin
 * https://app.essoduke.org/tinyMap/
 * Copyright 2015 essoduke.org, Licensed MIT.
 *
 * Changelog
 * -------------------------------
 * 移除已棄用的 adsense library 相關程式碼。
 * 修正 markerControl 無限讀取標記的錯誤。
 *
 * @author Essoduke Chang<essoduke@gmail.com>
 * @version 3.3.14 pre-test
 * @license MIT License
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

    'use strict';

    // API Configure
    var apiLoaded = false,
        apiClusterLoaded = false,
        apiMarkerWithLabelLoaded = false,
        tinyMapConfigure = {
            'language' : 'zh-TW',
            'callback' : 'gMapsCallback',
            'api'      : 'https://maps.googleapis.com/maps/api/js',
            'clusterer': 'https://google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclustererplus/src/markerclusterer_packed.js',
            'withLabel': 'https://google-maps-utility-library-v3.googlecode.com/svn/trunk/markerwithlabel/src/markerwithlabel_packed.js'
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
        styles = {},
        timeout;
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
     * jQuery tinyMap Constructor
     * @param {Object} container HTML element
     * @param {(Object|string)} options User settings
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
        'VERSION': '3.3.14',

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
                //#!#START KML
                // kml overlay
                this.kml(map, opt);
                //#!#END
                //#!#START DIRECTION
                // direction overlay
                this.directionService(map, opt);
                //#!#END
                //#!#START MARKER
                // markers overlay
                this.placeMarkers(map, opt);
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
                console.error(ignore);
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
                google.maps.event.clearListeners(target, 'click');
                google.maps.event.addListener(target, 'click', event);
                break;
            case 'object':
                for (e in event) {
                    if ('function' === typeof event[e]) {
                        if ('created' === e) {
                            event[e].call(target);
                        } else {
                            google.maps.event.clearListeners(target, e);
                            google.maps.event.addListener(target, e, event[e]);
                        }
                    } else {
                        if (event[e].hasOwnProperty('func') && 'function' === typeof event[e].func) {
                            if (event[e].hasOwnProperty('once') && true === event[e].once) {
                                google.maps.event.addListenerOnce(target, e, event[e].func);
                            } else {
                                google.maps.event.clearListeners(target, e);
                                google.maps.event.addListener(target, e, event[e].func);
                            }
                        } else if ('function' === typeof event[e]) {
                            google.maps.event.clearListeners(target, e);
                            google.maps.event.addListener(target, e, event[e]);
                        }
                    }
                }
                break;
            }
            // Click for infoWindow
            if (target.hasOwnProperty('infoWindow')) {
                google.maps.event.clearListeners(target, 'click');
                google.maps.event.addListener(target, 'click', function () {
                    var i = 0,
                        m = {};
                    // Close all infoWindows if `infoWindowAutoClose` was true.
                    if (self.options.hasOwnProperty('infoWindowAutoClose') &&
                        true === self.options.infoWindowAutoClose
                    ) {
                        for (i = 0; i < self._markers.length; i += 1) {
                            m = self._markers[i];
                            if (m.hasOwnProperty('infoWindow') &&
                                'function' === typeof m.infoWindow.close
                            ) {
                                m.infoWindow.close();
                            }
                        }
                    }
                    target.infoWindow.open(self.map, target);
                });
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
                    defOpt = $.extend({
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
         * Build the icon options of marker
         * @param {Object} opt Marker option
         */
        markerIcon: function (marker) {

            var icons = {};

            if (marker.hasOwnProperty('icon')) {

                icons = marker.icon;

                if ('string' === typeof marker.icon) {
                    return marker.icon;
                }
                
                if (marker.icon.hasOwnProperty('url')) {
                    icons.url = marker.icon.url;
                }
                if (marker.icon.hasOwnProperty('size')) {
                    if (Array.isArray(marker.icon.size) &&
                        2 === marker.icon.size.length
                    ) {
                        icons.size = this.formatSize(marker.icon.size);
                    }
                }
                if (marker.icon.hasOwnProperty('scaledSize')) {
                    if (Array.isArray(marker.icon.scaledSize) &&
                        2 === marker.icon.scaledSize.length
                    ) {
                        icons.scaledSize = this.formatSize(marker.icon.scaledSize);
                    }
                }
                if (marker.icon.hasOwnProperty('anchor')) {
                    if (Array.isArray(marker.icon.anchor) &&
                        2 === marker.icon.anchor.length
                    ) {
                        icons.anchor = this.formatPoint(marker.icon.anchor);
                    }
                }
            }
            return icons;
        },

        /**
         * Post process of Marker
         * @since v3.3.0
         * @param {Object} map Map instance
         * @param {Object} opt jQ tinyMap Options
         * @param {Object} marker Marker object
         * @param {Object} m Marker option
         */
        processMarker: function (map, opt, marker, source) {

            var self = this,
                exists = self.get('marker'),
                label = {},
                labelOpt = {};

            // Apply marker fitbounds
            if (marker.hasOwnProperty('position')) {
                if ('function' === typeof marker.getPosition) {
                    self._bounds.extend(marker.position);
                }
                if (opt.hasOwnProperty('markerFitBounds') &&
                    true === opt.markerFitBounds
                ) {
                    // Make sure fitBounds call after the last marker created.
                    if (exists.marker.length === opt.marker.length) {
                        map.fitBounds(self._bounds);
                    }
                }
            }
            // InfoWindow
            if (marker.hasOwnProperty('text') && marker.text.length) {
                if (
                    marker.hasOwnProperty('infoWindow') &&
                    'function' === typeof marker.infoWindow.setContent
                ) {
                    marker.infoWindow.setContent(marker.text);
                } else {
                    marker.infoWindow = new google.maps.InfoWindow(
                        marker.hasOwnProperty('infoWindowOptions') ?
                        marker.infoWindowOptions :
                        {
                            'content': marker.text
                        }
                    );
                    // infoWindow events binding.
                    if (marker.hasOwnProperty('infoWindowOptions') &&
                        'undefined' !== typeof marker.infoWindowOptions.event
                    ) {
                        self.bindEvents(marker.infoWindow, marker.infoWindowOptions.event);
                    }
                }
            }

            /**
             * Apply marker cluster.
             * Require markerclusterer.js
             * Only affect in INSERT mode.
             * @see {@link http://google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclusterer/src/}
             * @since 2015-10-01 18:20:00
             */
            if (!source) {
                // Markers cluster
                if (!marker.hasOwnProperty('cluster') ||
                    (marker.hasOwnProperty('cluster') && true === marker.cluster)
                ) {
                    if ('function' === typeof self._clusters.addMarker) {
                        self._clusters.addMarker(marker);
                    }
                }
            }

            // Create Label
            if (marker.hasOwnProperty('newLabel')) {
                labelOpt = {
                    'id'  : marker.id,
                    'text': marker.newLabel,
                    'map' : map,
                    'css' : marker.hasOwnProperty('newLabelCSS') ?
                            marker.newLabelCSS.toString() :
                            ''
                };
                self.get({
                    'label': [marker.id]
                }, function (ms) {
                    // Modify existed label if exists.
                    if (ms.label.length) {
                        ms.label.forEach(function (lb) {
                            lb.text = marker.newLabel;
                            $(lb.span).addClass(marker.newLabelCSS);
                            lb.bindTo('position', marker);
                            lb.draw();
                        });
                    // Or create the new one.
                    // @since v3.3.6
                    } else {
                        label = new Label(labelOpt);
                        label.bindTo('position', marker);
                        //label.bindTo('visible', marker);
                        self._labels.push(label);
                    }
                    // Hide or show labels when clustering end.
                    // @since v3.3.11
                    if ('object' === typeof label && true === opt.markerCluster) {
                        google.maps.event.addListener(marker, 'map_changed', function () {
                            if ('function' === typeof label.setMap) {
                                label.set('visible', null !== marker.getMap());
                            }
                        });
                    }
                });
            }
            // Binding events
            self.bindEvents(marker, marker.event);
        },
        /**
         * Markers HTML Control
         * @since v3.3.8
         */
        markerControl: function () {

            var self = this,
                opt = self.options,
                mOpt = {
                    'css': '',
                    'label': '請選擇&hellip;',
                    'infoWindow': true,
                    'panTo': true,
                    'onChange': ''
                },
                controls;
            
            if (opt.hasOwnProperty('markerControl')) {
                
                // Get container of control list.
                if ('string' === typeof opt.markerControl) {
                    controls = $(opt.markerControl.toString());
                } else {
                    if (opt.markerControl.hasOwnProperty('container')) {
                        controls = $(opt.markerControl.container);
                    } else {
                        controls = $(opt.markerControl);
                    }
                    mOpt = $.extend({}, mOpt, opt.markerControl);
                }
                if (controls.length) {
                    self.get('marker', function (ms) {
                        
                        // Select list template
                        var html = [
                            '<select class="marker-list-control">',
                            '<option>' + mOpt.label + '</option>'
                        ];
                        
                        // Build the html
                        ms.forEach(function (m) {
                            if ('undefined' !== typeof m.infoWindow) {
                                m.infoWindow.close();
                            }
                            html.push('<option value="' + m.id + '">' + (m.title ? m.title : m.id) + '</option>');
                        });
                        html.push('</select>');
                        // onChange binding
                        controls.on('change.tinyMap', 'select', function () {
                            var option = $(this);
                            self.close('marker');
                            if (this.value.length) {
                                // Get the marker that has selected.
                                self.get({'marker': [this.value]}, function (g) {
                                    var mk = {};
                                    if (g.marker.length && 'undefined' !== g.marker[0]) {
                                        mk = g.marker[0];
                                        if (true === mOpt.infoWindow) {
                                            if ('undefined' !== typeof mk.infoWindow &&
                                                'function' === typeof mk.infoWindow.open
                                            ) {
                                                mk.infoWindow.open(self.map, mk);
                                            }
                                        }
                                        if (true === mOpt.panTo) {
                                            self.map.panTo(mk.getPosition());
                                        }
                                        if ('function' === typeof mOpt.onChange) {
                                            mOpt.onChange.call(option, mk);
                                        }
                                    }
                                });
                            }
                        })
                        .html(html.join(''));
                        // Add Custom CSS Class
                        if ('string' === typeof mOpt.css) {
                            controls.find('select').addClass(mOpt.css);
                        }
                    });
                }
            }
        },
        /**
         * Place markers layer.
         * @param {Object} map Map instance
         * @param {Object} opt Markers options
         * @param {string} source Mode
         */
        placeMarkers: function (map, opt, source) {
            
            var self   = this,
                geocoder = {},
                clusterOptions = {
                    'maxZoom': null,
                    'gridSize': 60
                },
                markers = Array.isArray(opt.marker) ? opt.marker : [];

            /**
             * Apply marker cluster.
             * Require markerclustererplus.js
             * @see {@link http://google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclustererplus/docs/reference.html}
             * @since 2015-04-30 10:18:33
             */
            if (self.options.hasOwnProperty('markerCluster')) {
                if ('function' === typeof MarkerClusterer) {
                    clusterOptions = $.extend({}, clusterOptions, opt.markerCluster);
                    self._clusters = new MarkerClusterer(map, [], clusterOptions);
                    if (clusterOptions.hasOwnProperty('event')) {
                        self.bindEvents(self._clusters, clusterOptions.event);
                    }
                }
            }

            // Markers loop
            markers.forEach(function (m) {

                var addr = parseLatLng(m.addr, true),
                    icons = self.markerIcon(m),
                    insertFlag = true,
                    markerExisted = false,
                    marker = {},
                    mk = {},
                    id = 'undefined' !== typeof m.id ? m.id : (m.addr.toString().replace(/\s/g, '')),
                    markerOptions = {
                        'id': id,
                        'map': map,
                        'animation': null
                    };

                markerOptions = $.extend({}, markerOptions, m);

                // For Modify mode.
                if ('modify' === source && id) {
                    self.get({
                        'marker': [id]
                    }, function (ms) {
                        // Has found the marker
                        if (Array.isArray(ms.marker) && ms.marker.length) {
                            if (!(m.hasOwnProperty('forceInsert') && true === m.forceInsert)) {
                                m = $.extend(ms.marker[0], m);
                                if ('function' === typeof self._clusters.removeMarker) {
                                    self._clusters.removeMarker(ms.marker[0]);
                                }
                                insertFlag = false;
                                markerExisted = true;
                            }
                        }
                    });
                }

                if (m.hasOwnProperty('title')) {
                    markerOptions.title = m.title.toString().replace(/<([^>]+)>/g, '');
                }

                if (!$.isEmptyObject(icons)) {
                    markerOptions.icon = icons;
                }

                if (m.hasOwnProperty('animation') && 'string' === typeof m.animation) {
                    markerOptions.animation = google.maps.Animation[m.animation.toUpperCase()];
                }

                if ('string' === typeof addr) {
                    // For string address
                    geocoder = new google.maps.Geocoder();
                    geocoder.geocode({'address': addr}, function (results, status) {
                        // If exceeded, call it later by setTimeout;
                        if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                            setTimeout(function () {
                                self.placeMarkers(map, opt, source);
                            }, self.interval);
                        } else if (status === google.maps.GeocoderStatus.OK) {
                            if (!insertFlag && markerExisted) {
                                if ('function' === typeof m.setPosition) {
                                    m.setPosition(results[0].geometry.location);
                                    if (markerOptions.hasOwnProperty('title')) {
                                        m.setTitle(markerOptions.title);
                                    }
                                    if (markerOptions.hasOwnProperty('icon')) {
                                        m.setIcon(markerOptions.icon);
                                    }
                                }
                                mk = m;
                            } else {
                                markerOptions.position = results[0].geometry.location;
                                if (opt.hasOwnProperty('markerWithLabel') && true === opt.markerWithLabel) {
                                    marker = 'function' === typeof MarkerWithLabel ?
                                             new MarkerWithLabel(markerOptions) :
                                             new google.maps.Marker(markerOptions);
                                } else {
                                    marker = new google.maps.Marker(markerOptions);
                                }
                                self._markers.push(marker);
                                mk = marker;
                            }
                            // Post process of marker
                            // @since v3.3.0
                            self.processMarker(map, opt, mk, source);
                        }
                    });

                } else {
                    // For LatLng type
                    if (!insertFlag && markerExisted) {
                        if ('function' === typeof m.setPosition) {
                            m.setPosition(addr);
                            if (markerOptions.hasOwnProperty('title')) {
                                m.setTitle(markerOptions.title);
                            }
                            if (markerOptions.hasOwnProperty('icon')) {
                                m.setIcon(markerOptions.icon);
                            }
                        }
                        mk = m;
                    } else {
                        markerOptions.position = addr;
                        if (opt.hasOwnProperty('markerWithLabel') && true === opt.markerWithLabel) {
                            marker = 'function' === typeof MarkerWithLabel ?
                                     new MarkerWithLabel(markerOptions) :
                                     new google.maps.Marker(markerOptions);
                        } else {
                            marker = new google.maps.Marker(markerOptions);
                        }
                        self._markers.push(marker);
                        mk = marker;
                    }
                    // Post process of marker
                    // @since v3.3.0
                    self.processMarker(map, opt, mk, source);
                }
            });
            self.markerControl();
        },
        //#!#END
        //#!#START DIRECTION
        /**
         * Direction overlay
         * @param {Object} map Map instance
         * @param {Object} opt Direction options
         */
        directionService: function (map, opt) {
            
            var self = this,
                directionsService = new google.maps.DirectionsService();

            if (Array.isArray(opt.direction)) {
                opt.direction.forEach(function (opts) {

                    if ('undefined' === typeof opts.from || 'undefined' === typeof opts.to) {
                        return;
                    }

                    var request = {},
                        directionsDisplay = new google.maps.DirectionsRenderer(),
                        renderOpts = $.extend({}, {
                            'infoWindow': new google.maps.InfoWindow(),
                            'map': self.map
                        }, opts),
                        waypointsOpts = [],
                        waypointsText = [],
                        waypointsIcon = [];

                    request.origin = parseLatLng(opts.from, true);
                    request.destination = parseLatLng(opts.to, true);
                    // TravelMode
                    request.travelMode = opts.hasOwnProperty('travel') && google.maps.TravelMode[opts.travel.toString().toUpperCase()] ?
                                         google.maps.TravelMode[opts.travel.toString().toUpperCase()] :
                                         google.maps.TravelMode.DRIVING;
                    
                    // Info Panel
                    if (opts.hasOwnProperty('panel') && $(opts.panel).length) {
                        renderOpts.panel = $(opts.panel).get(0);
                    }
                    if (opts.hasOwnProperty('requestExtra') && opts.requestExtra) {
                        request = $.extend({}, request, opts.requestExtra);
                    }
                    // Waypoints
                    if (opts.hasOwnProperty('waypoint') && Array.isArray(opts.waypoint)) {
                        opts.waypoint.forEach(function (waypoint) {
                            var waypointOpt = {
                                'stopover': true
                            };
                            if ('string' === typeof waypoint || Array.isArray(waypoint)) {
                                waypointOpt.location = parseLatLng(waypoint, true);
                            } else if (waypoint.hasOwnProperty('location')) {
                                waypointOpt.location = parseLatLng(waypoint.location, true);
                                waypointOpt.stopover = waypoint.hasOwnProperty('stopover') ?
                                                       waypoint.stopover :
                                                       true;
                            }
                            waypointsText.push(waypoint.text || waypoint.toString());
                            if (waypoint.hasOwnProperty('icon')) {
                                waypointsIcon.push(waypoint.icon.toString());
                            }
                            waypointsOpts.push(waypointOpt);
                        });
                        request.waypoints = waypointsOpts;
                    }
                    
                    // DirectionService
                    directionsService.route(request, function (response, status) {
                        if (status === google.maps.DirectionsStatus.OK) {
                            response.routes.forEach(function (route, index) {
                                // @since 3.3.2 Multiple routes render.
                                if (opts.hasOwnProperty('renderAll') &&
                                    true === opts.renderAll &&
                                    true === request.provideRouteAlternatives
                                ){
                                    var dr = new google.maps.DirectionsRenderer({
                                        'map': map,
                                        'directions': response,
                                        'routeIndex': index
                                    });
                                }

                                var legs = route.legs,
                                    startText = '',
                                    endText = '',
                                    wp = {},
                                    i = 0;

                                if (opts.hasOwnProperty('fromText')) {
                                    legs[0].start_address = opts.fromText;
                                    startText = opts.fromText;
                                }
                                if (opts.hasOwnProperty('toText')) {
                                    if (1 === legs.length) {
                                        legs[0].end_address = opts.toText;
                                    } else {
                                        legs[legs.length - 1].end_address = opts.toText;
                                    }
                                    endText = opts.toText;
                                }
                                if (opts.hasOwnProperty('icon')) {
                                    renderOpts.suppressMarkers = true;
                                    if (opts.icon.hasOwnProperty('from') && 'string' === typeof opts.icon.from) {
                                        self.directionServiceMarker(legs[0].start_location, {
                                            'icon': opts.icon.from,
                                            'text': startText
                                        }, renderOpts.infoWindow, opts);
                                    }
                                    if (opts.icon.hasOwnProperty('to') && 'string' === typeof opts.icon.to) {
                                        self.directionServiceMarker(legs[legs.length - 1].end_location, {
                                            'icon': opts.icon.to,
                                            'text': endText
                                        }, renderOpts.infoWindow, opts);
                                    }
                                }
                                for (i = 1; i < legs.length; i += 1) {
                                    if (opts.hasOwnProperty('icon')) {
                                        if (opts.icon.hasOwnProperty('waypoint') && 'string' === typeof opts.icon.waypoint) {
                                            wp.icon = opts.icon.waypoint;
                                        } else if ('string' === typeof waypointsIcon[i - 1]) {
                                            wp.icon = waypointsIcon[i - 1];
                                        }
                                        wp.text = waypointsText[i - 1];
                                        self.directionServiceMarker(
                                            legs[i].start_location,
                                            wp,
                                            renderOpts.infoWindow,
                                            opts
                                        );
                                    }
                                }
                            });
                            self.bindEvents(directionsDisplay, opts.event);
                            directionsDisplay.setOptions(renderOpts);
                            directionsDisplay.setDirections(response);
                            self._directions.push(directionsDisplay);
                        }
                    });
                });
            }
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
            var result = [];
            this.get('direction', function (dr) {
                dr.forEach(function (dc, i) {
                    var d = dc.getDirections();
                    if (d.hasOwnProperty('routes') &&
                        'undefined' !== typeof d.routes[0] &&
                        'undefined' !== typeof d.routes[0].legs
                    ) {
                        result[i] = [];
                        d.routes[0].legs.forEach(function (leg, j) {
                            result[i].push({
                                'from'    : leg.start_address,
                                'to'      : leg.end_address,
                                'distance': leg.distance,
                                'duration': leg.duration
                            });
                        });
                    }
                });
            });
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
                request = $.extend({
                    'location': map.getCenter(),
                    'radius'  : 100
                }, reqOpt);

            request.location = parseLatLng(request.location, true);

            if ('undefined' !== typeof google.maps.places) {
                placesService = new google.maps.places.PlacesService(map);
                placesService.nearbySearch(request, function (results, status) {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        self._places.push(results);
                        if (request.hasOwnProperty('createMarker') && true === request.createMarker) {
                            results.forEach(function (r) {
                                if (r.hasOwnProperty('geometry')) {
                                    self._markers.push(new google.maps.Marker({
                                        'map': map,
                                        'position': r.geometry.location
                                    }));
                                }
                            });
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
                    geolocation.watchPosition(
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
                loop   = {},
                obj    = '';

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
                        loop[obj].forEach(function (item) {
                            if (item.hasOwnProperty('infoWindow') &&
                                'function' === typeof item.infoWindow.close
                            ) {
                                item.infoWindow.close();
                            }
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
        //#!#START CLEAR
        /**
         * Method: Google Maps clear the specificed layer
         * @param {string} type Layer type
         */
        clear: function (layer, callback) {

            var self     = this,
                dMarkers = self._directionsMarkers,
                layers   = self.get(layer),
                loop     = {},
                key      = '',
                obj      = '';

            if ('undefined' !== typeof layers &&
                'undefined' !== typeof layers.map
            ) {
                    delete layers.map;
            }

            if (Array.isArray(layers)) {
                loop[layer] = layers;
            } else {
                loop = layers;
            }

            function dMarkersLoopCallback (dm, j) {
                if ('function' === typeof dm.setMap) {
                    self._directionsMarkers[j].setMap(null);
                }
            }

            function loopObjLoopCallback (item) {
                // Remove the direction icons.
                if ('direction' === obj) {
                    dMarkers.forEach(dMarkersLoopCallback);
                    self._directionsMarkers.filter(function (n) {
                        return 'undefined' !== typeof n;
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
                if (-1 !== self[key].indexOf(item)) {
                    delete self[key][self[key].indexOf(item)];
                }
            }

            function keyFilter (n) {
                return 'undefined' !== typeof n;
            }

            try {
                for (obj in loop) {
                    if (Array.isArray(loop[obj])) {
                        key = '_' + obj.toString().toLowerCase() + 's';
                        loop[obj].forEach(loopObjLoopCallback);
                        // Filter undefined elements
                        self[key] = self[key].filter(keyFilter);
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
                layers   = [],
                target   = {},
                obj      = {},
                key      = '',
                lb       = '',
                i        = 0;

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

            function keyLoopCallback (item) {
                if (0 === layer[obj].length ||
                    -1 !== layer[obj].indexOf(i) ||
                    ('undefined' !== typeof item.id && 0 < item.id.length && (-1 !== item.id.indexOf(layer[obj])))
                ) {
                    target[obj].push(item);
                }
            }

            try {
                if ('string' === typeof layer) {
                    if (-1 !== layer.indexOf(',')) {
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
                                self[key].forEach(keyLoopCallback);
                            }
                        }
                    }
                    target.map = self.map;
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
                    ['marker', 'placeMarkers'],
                    ['direction', 'directionService'],
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
        //#!#QUERY
        /**
         * Method: Query address or latlng
         * @param {(string|Array|Object)} addr Address or latlng
         * @param {Function} callback Function callback
         */
        query: function (addr, callback) {
            var self = this,
                geocoder = new google.maps.Geocoder(),
                address = parseLatLng(addr),
                opt = {};
            if ('string' === typeof address) {
                opt.address = address;
            } else {
                opt = {
                    'location': {
                        'lat': parseFloat(address.lat, 10),
                        'lng': parseFloat(address.lng, 10)
                    }
                };
            }
            geocoder.geocode(opt, function (results, status) {
                try {
                    if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                        setTimeout(function () {
                            self.query(addr, callback);
                        }, self.interval);
                    } else if (status === google.maps.GeocoderStatus.OK && Array.isArray(results)) {
                        if (0 < results.length && results[0].hasOwnProperty('geometry')) {
                            if ('function' === typeof callback) {
                                callback.call(self, results[0]);
                            } else {
                                return results[0];
                            }
                        }
                    } else {
                        console.error('Geocoder Error Code: ' + status);
                    }
                } catch (ignore) {
                    console.error(ignore);
                }
            });
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
            var self = this,
                // Options
                opts = $.extend({}, {
                    'marker'   : true,
                    'polyline' : true,
                    'polygon'  : true,
                    'circle'   : true,
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
                        '<name><![CDATA[jQuery tinyMap Plugin]]></name>',
                        '<description><![CDATA[]]></description>',
                        '<Style id="style1">',
                        '<PolyStyle>',
                        '<color>50F05A14</color>',
                        '<colorMode>normal</colorMode>',
                        '<fill>1</fill>',
                        '<outline>1</outline>',
                        '</PolyStyle>',
                        '<IconStyle>',
                        '<Icon>',
                        '<href>https://maps.google.com/mapfiles/kml/paddle/grn-circle_maps.png</href>',
                        '</Icon>',
                        '</IconStyle>',
                        '</Style>',
                        '#PLACEMARKS#',
                        '</Document>',
                        '</kml>'
                    ],
                    'placemark': [
                        '<Placemark>',
                        '<name><![CDATA[#NAME#]]></name>',
                        '<Snippet></Snippet>',
                        '<description><![CDATA[]]></description>',
                        '<styleUrl>#style1</styleUrl>',
                        '<ExtendedData></ExtendedData>',
                        '#DATA#',
                        '</Placemark>'
                    ],
                    'polygon': [
                        '<Placemark>',
                        '<styleUrl>#style1</styleUrl>',
                        '<name><![CDATA[#NAME#]]></name>',
                        '<Polygon>',
                        '<tessellate>1</tessellate>',
                        '<extrude>1</extrude>',
                        '<altitudeMode>clampedToGround</altitudeMode>',
                        '<outerBoundaryIs>',
                        '<LinearRing>',
                        '<coordinates>#LATLNG#</coordinates>',
                        '</LinearRing>',
                        '</outerBoundaryIs>',
                        '</Polygon>',
                        '</Placemark>'
                    ],
                    'linestring': '<LineString><tessellate>1</tessellate><coordinates>#LATLNG#</coordinates></LineString>',
                    'point': '<Point><coordinates>#LATLNG#,0.000000</coordinates></Point>'
                },
                strMarker    = '',
                strPolyline  = '',
                strPolygon   = '',
                strCircle    = '',
                strDirection = '',
                output = '';

            // Refactoring
            // @since v3.3
            self.get('marker,polyline,polygon,circle,direction', function (ms) {
                var latlng = '';
                // Marker
                if (true === opts.marker && 'undefined' !== typeof ms.marker) {
                    ms.marker.forEach(function (marker) {
                        latlng = [marker.getPosition().lng(), marker.getPosition().lat()].join(',');
                        strMarker += templates.placemark.join('')
                                              .replace(/#NAME#/gi, 'Markers')
                                              .replace(
                                                  /#DATA#/gi,
                                                  templates.point.replace(/#LATLNG#/gi, latlng)
                                              );
                    });
                }
                // Polyline
                if (true === opts.polyline && 'undefined' !== typeof ms.polyline) {
                    ms.polyline.forEach(function (polyline) {
                        latlng = '';
                        polyline.getPath().getArray().forEach(function (k) {
                            latlng += [k.lng(), k.lat(), '0.000000\n'].join(',');
                        });
                        strPolyline += templates.placemark.join('')
                                                .replace(/#NAME#/gi, 'Polylines')
                                                .replace(
                                                    /#DATA#/gi,
                                                    templates.linestring.replace(/#LATLNG#/gi, latlng)
                                                );
                    });
                }
                // Polygon
                if (true === opts.polygon && 'undefined' !== typeof ms.polygon) {
                    ms.polygon.forEach(function (polygon) {
                        latlng = '';
                        polygon.getPath().getArray().forEach(function (k) {
                            latlng += [k.lng(), k.lat(), '0.000000\n'].join(',');
                        });
                        strPolygon += templates.polygon.join('')
                                               .replace(/#NAME#/gi, 'Polygons')
                                               .replace(/#LATLNG#/gi, latlng);
                    });
                }
                // Circle
                if (true === opts.circle && 'undefined' !== typeof ms.circle) {
                    ms.circle.forEach(function (circle) {
                        latlng = '';
                        var d2r = Math.PI / 180,
                            r2d = 180 / Math.PI,
                            earthsradius = 6378137,
                            points = 64,
                            rlat = (circle.getRadius() / earthsradius) * r2d,
                            rlng = rlat / Math.cos(circle.getCenter().lat() * d2r),
                            theta = 0,
                            ey = 0,
                            ex = 0,
                            j = 0;
                        for (j = 0; j < 65; j += 1) {
                            theta = Math.PI * (j / (points/2));
                            ey = circle.getCenter().lng() + (rlng * Math.cos(theta));
                            ex = circle.getCenter().lat() + (rlat * Math.sin(theta));
                            latlng += [ey, ex, '0.000000\n'].join(',');
                        }
                        strCircle += templates.polygon.join('')
                                              .replace(/#NAME#/gi, 'Circles')
                                              .replace(/#LATLNG#/gi, latlng);
                    });
                }
                // Direction
                if (true === opts.direction && 'undefined' !== typeof ms.direction) {
                    ms.direction.forEach(function (direction) {
                        var d = direction.getDirections();
                        if (
                            d.hasOwnProperty('routes') &&
                            Array.isArray(d.routes) &&
                            'undefined' !== typeof d.routes[0] &&
                            'undefined' !== typeof d.routes[0].legs &&
                            Array.isArray(d.routes[0].legs)
                        ) {
                            d.routes[0].legs.forEach(function (leg) {
                                if (Array.isArray(leg.steps)) {
                                    leg.steps.forEach(function (step) {
                                        latlng = '';
                                        if (Array.isArray(step.path)) {
                                            step.path.forEach(function (path) {
                                                latlng += [path.lng(), path.lat(), '0.000000\n'].join(',');
                                            });
                                        }
                                        strDirection += templates.placemark.join('')
                                                                 .replace(/#NAME#/gi, 'Directions')
                                                                 .replace(
                                                                     /#DATA#/gi,
                                                                     templates.linestring.replace(/#LATLNG#/gi, latlng)
                                                                 );
                                    });
                                }
                            });
                        }
                    });
                }
            });
            // Output KML
            output = templates.xml.join('')
                              .replace(/#NAME#/gi, '')
                              .replace(
                                  /#PLACEMARKS#/gi,
                                  strMarker +
                                  strPolyline +
                                  strPolygon +
                                  strCircle +
                                  strDirection
                              );
            if (true === opts.download) {
                window.open(mime + window.btoa(window.decodeURIComponent(window.encodeURIComponent(output))));
            } else {
                return output;
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
                vo       = {},
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
                    if (null !== self.div) {
                        self.div.appendTo($(self.getPanes().overlayLayer));
                        self.listeners = [
                            google.maps.event.addListener(self, 'visible_changed', function () { self.draw(); }),
                            google.maps.event.addListener(self, 'position_changed', function () { self.draw(); }),
                            google.maps.event.addListener(self, 'visible_changed', function () { self.draw(); }),
                            google.maps.event.addListener(self, 'clickable_changed', function () { self.draw(); }),
                            google.maps.event.addListener(self, 'text_changed', function () { self.draw(); }),
                            google.maps.event.addListener(self, 'zindex_changed', function () { self.draw(); })
                        ];
                    }
                };
                Label.prototype.draw = function () {
                    var self = this,
                        projection = self.getProjection(),
                        position   = {};
                    try {
                        if (null !== self.div) {
                            if (projection) {
                                position = projection.fromLatLngToDivPixel(self.get('position'));
                                if (position) {
                                    self.div.css({
                                        'left'    : position.x + 'px',
                                        'top'     : position.y + 'px',
                                        'display' : self.get('visible') ? 'block' : 'none'
                                    });
                                }
                                if (self.text) {
                                    self.span.html(self.text.toString());
                                }
                            }
                        }
                    } catch (ignore) {
                        console.error(ignore);
                    }
                };
                Label.prototype.onRemove = function () {
                    $(this.div).remove();
                    this.div = null;
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
                                setTimeout(function () {
                                    self.init();
                                }, self.interval);
                            } else if (status === google.maps.GeocoderStatus.OK && Array.isArray(results)) {
                                if (0 < results.length && results[0].hasOwnProperty('geometry')) {
                                    self.googleMapOptions.center = results[0].geometry.location;
                                    self.map = new google.maps.Map(self.container, self.googleMapOptions);
                                    google.maps.event.addListenerOnce(self.map, 'tilesloaded', function () {
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
                    google.maps.event.addListenerOnce(self.map, 'tilesloaded', function () {
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
