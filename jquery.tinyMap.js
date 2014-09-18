/*jshint unused:false */
/**
 * MIT License
 * Copyright(c) 2014 essoduke.org
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 『AS IS』, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * jQuery tinyMap 輕鬆建立 Google Maps 的 jQuery 擴充套件
 * 短小精幹！拯救你免於 Google Maps API 的摧殘，輕鬆建立 Google Maps 的 jQuery 擴充套件。
 *
 * http://app.essoduke.org/tinyMap/
 *
 * @author: Essoduke Chang
 * @version: 2.9.8
 *
 * [Changelog]
 * 新增 google.maps.MapOptions 原生屬性的支援，例如 backgroundColor, heading...。
 * 修正 direction.waypoint.text 無法正確設置的錯誤。
 * 修正 modify 方法無法變更 streetView 的錯誤。
 *
 * Release 2014.09.18.185856
 */
;(function ($, window, document, undefined) {

    'use strict';

    // Default settings
    var defaults = {
            'autoLocation': false,
            'center': [24, 121],
            'event': null,
            'infoWindowAutoClose':  true,
            'interval': 200,
            'kml': [],
            'loading': '讀取中&hellip;',
            'marker': [],
            'markerCluster': false,
            'markerFitBounds': false,
            'notfound': '找不到查詢的地點',
            'polyline': [],
            'zoom': 8
        },
        _directMarkersLength = 0,
        _geoMarkersLength = 0,
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
     * _hasOwnProperty for compatibility IE
     * @param {Object} obj Object
     * @param {string} property Property name
     * @return {boolean}
     * @version 2.4.3
     */
    function _hasOwnProperty (obj, property) {
        try {
            return (!window.hasOwnProperty) ?
                   Object.prototype.hasOwnProperty.call(obj, property.toString()) :
                   obj.hasOwnProperty(property.toString());
        } catch (ignore) {
            console.dir(ignore);
        }
    }
    /**
     * Parsing the location
     * @param {string|Array|Object} loc Location
     * @param {boolean} formatting Format to Google Maps LatLng object
     * @return {Object}
     */
    function parseLatLng (loc, formatting) {
        var array = [],
            re = /^[+-]?\d+(\.\d+)?$/,
            result = {
                'lat': '',
                'lng': ''
            };
        if ('string' === typeof loc || $.isArray(loc)) {
            array = 'string' === typeof loc ? loc.replace(/\s+/, '').split(',') : loc;
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
            if ('function' === typeof loc.lat || 'function' === typeof loc.lng) {
                return loc;
            } else if (_hasOwnProperty(loc, 'x') && _hasOwnProperty(loc, 'y')) {
                result.lat = loc.x;
                result.lng = loc.y;
            } else if (_hasOwnProperty(loc, 'lat') && _hasOwnProperty(loc, 'lng')) {
                result.lat = loc.lat;
                result.lng = loc.lng;
            }
        }
        if (undefined !== formatting && true === formatting) {
            return new google.maps.LatLng(result.lat, result.lng);
        }
        return result;
    }
    //#!#START LABEL
    /**
     * Label in Maps
     * @param {Object} options Label options
     * @constructor
     */
    function Label (options) {
        var css = (options.css || '');
        this.setValues(options);
        this.span = $('<span/>').css({
            'position': 'relative',
            'left': '-50%',
            'top': '0',
            'white-space': 'nowrap'
        }).addClass(css);
        this.div = $('<div/>').css({
            'position': 'absolute',
            'display': 'none'
        });
        this.span.appendTo(this.div);
    }
    /**
     * Inherit from Google Maps OverlayView
     * @this {Label}
     */
    Label.prototype = new google.maps.OverlayView();
    /**
     * binding the customize events to map
     * @this {Label}
     */
    Label.prototype.onAdd = function () {
        var self = this;
        self.div.appendTo($(self.getPanes().overlayLayer));
        self.listeners = [
            google.maps.event.addListener(self, 'visible_changed', self.onRemove)
        ];
    };
    /**
     * Label draw to map
     * @this {Label}
     */
    Label.prototype.draw = function () {
        var projection = this.getProjection(),
            position   = {};
        try {
            position = projection.fromLatLngToDivPixel(this.get('position'));
            this.div.css({
                'left': position.x + 'px',
                'top': position.y + 'px',
                'display': 'block'
            });
            if (this.text) {
                this.span.html(this.text.toString());
            }
        } catch (ignore) {
        }
    };
    /**
     * Label remove from the map
     * @this {Label}
     */
    Label.prototype.onRemove = function () {
        $(this.div).remove();
    };
    //#!#END
    /**
     * tinyMap Constructor
     * @param {Object} container HTML element
     * @param {(Object|string)} options User settings
     * @constructor
     */
    function TinyMap (container, options) {

        var opt = $.extend({}, defaults, options),
            vo = {},
            o = '';

        // Make sure the API has loaded.
        if (!_hasOwnProperty(window, 'google')) {
            return;
        }
        /**
         * Map instance
         * @type {Object}
         */
        this.map = null;
        /**
         * Map markers
         * @type {Object}
         */
        this._markers = [];
        /**
         * Map Labels
         * @type {Object}
         */
        this._labels = [];
        /**
         * DOM of selector
         * @type {Object}
         */
        this.container = container;
        /**
         * Merge the options
         * @type {Object}
         */
        this.options = opt;
        /**
         * Google Map options
         * @type {Object}
         */
        this.googleMapOptions = {};
        /**
         * Interval for geocoder's query interval
         * @type {number}
         */
        this.interval = parseInt(this.options.interval, 10) || 200;

        // Parsing ControlOptions
        for (o in this.options) {
            if (_hasOwnProperty(this.options, o)) {
                vo = this.options[o];
                if (/ControlOptions/g.test(o)) {
                    if (_hasOwnProperty(vo, 'position')) {
                        if ('string' === typeof vo.position) {
                            this.options[o].position = google.maps.ControlPosition[vo.position.toUpperCase()];
                        }
                    }
                }
            }
        }

        // Merge options
        this.googleMapOptions = this.options;

        // Process streetView conflict
        if (_hasOwnProperty(opt, 'streetView')) {
            this.googleMapOptions.streetViewObj = opt.streetView;
            delete this.googleMapOptions.streetView;
        }

        // Parsing Center location
        this.googleMapOptions.center = parseLatLng(opt.center, true);
        
        //#!#START STYLES
        // Map styles apply
        if (_hasOwnProperty(opt, 'styles')) {
            if ('string' === typeof opt.styles) {
                if (_hasOwnProperty(styles, opt.styles)) {
                    this.googleMapOptions.styles = styles[opt.styles];
                }
            } else if ($.isArray(opt.styles)) {
                this.googleMapOptions.styles = opt.styles;
            }
        }
        //#!#END
        $(this.container).html(opt.loading);
        this.init();
    }
    /**
     * tinyMap prototype
     */
    TinyMap.prototype = {

        VERSION: '2.9.8',

        // Layers
        _polylines: [],
        _polygons: [],
        _circles: [],
        _kmls: [],
        _directions: [],
        _directionsMarkers: [],

        // Google Maps LatLngBounds Class
        bounds: new google.maps.LatLngBounds(),
        //#!#START KML
        /**
         * KML overlay
         * @param {Object} map Map instance
         * @param {Object} opt KML options
         */
        kml: function (map, opt) {
            
            var kml = {},
                kmlOpt = {
                    'preserveViewport': false,
                    'suppressInfoWindows': false
                },
                i = 0;

            if (_hasOwnProperty(opt, 'kml')) {
                if ('string' === typeof opt.kml) {
                    kml = new google.maps.KmlLayer(opt.kml, kmlOpt);
                    kml.setMap(map);
                    this._kmls.push(kml);
                } else if ($.isArray(opt.kml)) {
                    for (i = 0; i < opt.kml.length; i += 1) {
                        if ('string' === typeof opt.kml[i]) {
                            kml = new google.maps.KmlLayer(opt.kml[i], kmlOpt);
                            kml.setMap(map);
                            this._kmls.push(kml);
                        }
                    }
                }
            }
        },
        //#!#END
        //#!#START DIRECTION
        /**
         * Direction overlay
         * @param {Object} map Map instance
         * @param {Object} opt Direction options
         */
        direction: function (map, opt) {
            if (_hasOwnProperty(opt, 'direction') && $.isArray(opt.direction)) {
                for (var d = 0; d < opt.direction.length; d += 1) {
                    this.directionService(opt.direction[d]);
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
            var self = this,
                m = {},
                c = 0,
                i = 0,
                j = 0,
                k = 0,
                markers = [],
                labels  = [];
                
            _directMarkersLength = 0;
            _geoMarkersLength = 0;
            
            markers = self._markers;

            // For first initialize of instance.
            if (!source || 0 === markers.length && $.isArray(opt.marker)) {
                for (i = 0, c = opt.marker.length; i < c; i += 1) {
                    m = opt.marker[i];
                    if (_hasOwnProperty(m, 'addr')) {
                        m.parseAddr = parseLatLng(m.addr, true);
                        if ('string' === typeof m.parseAddr) {
                            this.markerByGeocoder(map, m, opt);
                        } else {
                            this.markerDirect(map, m, opt);
                        }
                    }
                }
            }
            
            // Modify markers
            if ('modify' === source) {
                labels  = this._labels;
                for (i = 0, c = opt.marker.length; i < c; i += 1) {
                    if (_hasOwnProperty(opt.marker[i], 'id')) {
                        for (j = 0; j < markers.length; j += 1) {
                            // Moving matched markers to the new position.
                            if (opt.marker[i].id === markers[j].id &&
                                _hasOwnProperty(opt.marker[i], 'addr')
                            ) {
                                markers[j].setPosition(
                                    new google.maps.LatLng(
                                        opt.marker[i].addr[0],
                                        opt.marker[i].addr[1]
                                    )
                                );
                                if (_hasOwnProperty(opt.marker[i], 'text')) {
                                    if (_hasOwnProperty(markers[j], 'infoWindow')) {
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
                                if (_hasOwnProperty(opt.marker[i], 'icon')) {
                                    markers[j].setIcon(opt.marker[i].icon);
                                }
                                continue;
                            }
                        }
                        // Redrawing the labels
                        for (j = 0, k = labels.length; j < k; j += 1) {
                            if (opt.marker[i].id === labels[j].id) {
                                if (_hasOwnProperty(opt.marker[i], 'label')) {
                                    labels[j].text = opt.marker[i].label;
                                }
                                labels[j].draw();
                                continue;
                            }
                        }
                    // Insert the new marker if it is not matched.
                    } else {
                        if (_hasOwnProperty(opt.marker[i], 'addr')) {
                            opt.marker[i].parseAddr = parseLatLng(opt.marker[i].addr, true);
                            if ('string' === typeof opt.marker[i].parseAddr) {
                                this.markerByGeocoder(map, opt.marker[i]);
                            } else {
                                this.markerDirect(map, opt.marker[i]);
                            }
                        }
                    }
                }
            }
            /**
             * Apply marker cluster.
             * Require markerclusterer.js
             * @see {@link http://google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclusterer/src/}
             */
            if (_hasOwnProperty(opt, 'markerCluster') && true === opt.markerCluster) {
                if ('function' === typeof MarkerClusterer) {
                    return new MarkerClusterer(map, this._markers);
                }
            }
        },
        //#!#END
        //#!#START POLYLINE
        /**
         * Polyline overlay
         * @param {Object} map Map instance
         * @param {Object} opt Polyline options
         */
        drawPolyline: function (map, opt) {
            var polyline = {},
                i = 0,
                p = {},
                c = {},
                len = 0,
                coords = new google.maps.MVCArray(),
                defOpt = {},
                path   = [],
                service = {},
                waypoints = [],
                distance = {};

            if (_hasOwnProperty(opt, 'polyline') &&
                _hasOwnProperty(opt.polyline, 'coords') &&
                $.isArray(opt.polyline.coords)
            ) {
                for (i = 0; i < opt.polyline.coords.length; i += 1) {
                    p = opt.polyline.coords[i];
                    c = parseLatLng(p, true);
                    if ('function' === typeof c.lat) {
                        coords.push(c);
                    }
                }

                defOpt = $.extend({}, {
                    'strokeColor': opt.polyline.color || '#FF0000',
                    'strokeOpacity': 1.0,
                    'strokeWeight': opt.polyline.width || 2
                }, opt.polyline);

                polyline = new google.maps.Polyline(defOpt);

                this._polylines.push(polyline);

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

                if (_hasOwnProperty(opt.polyline, 'event')) {
                    self.bindEvents(polyline, opt.polyline.event);
                }

                if (_hasOwnProperty(opt.polyline, 'snap') &&
                    true === opt.polyline.snap
                ) {
                    service = new google.maps.DirectionsService();
                    service.route({
                        'origin': coords.getAt(0),
                        'waypoints': waypoints,
                        'destination': coords.getAt(coords.length - 1),
                        'travelMode': google.maps.DirectionsTravelMode.DRIVING
                    }, function (result, status) {
                        if (status === google.maps.DirectionsStatus.OK) {
                            for (i = 0, len = result.routes[0].overview_path; i < len.length; i += 1) {
                                path.push(len[i]);
                            }
                            polyline.setPath(path);
                            if ('function' === typeof opt.polyline.getDistance) {
                                distance = result.routes[0].legs[0].distance;
                                opt.polyline.getDistance.call(this, distance);
                            }
                        }
                    });
                } else {
                    polyline.setPath(coords);
                    if (_hasOwnProperty(google.maps, 'geometry') &&
                        _hasOwnProperty(google.maps.geometry, 'spherical')
                    ) {
                        if ('function' === typeof google.maps.geometry.spherical.computeDistanceBetween) {
                            distance = google.maps
                                             .geometry
                                             .spherical
                                             .computeDistanceBetween(
                                                coords.getAt(0),
                                                coords.getAt(coords.length - 1)
                                             );
                            if ('function' === typeof opt.polyline.getDistance) {
                                opt.polyline.getDistance.call(this, distance);
                            }
                        }
                    }
                }
                polyline.setMap(map);
            }
        },
        //#!#END
        //#!#START POLYGON
        /**
         * Polygon overlay
         * @param {Object} map Map instance
         * @param {Object} opt Polygon options
         */
        drawPolygon: function (map, opt) {
            var polygon = {},
                i = 0,
                p = {},
                c = {},
                defOpt = {},
                coords = [];

            if (_hasOwnProperty(opt, 'polygon') &&
                _hasOwnProperty(opt.polygon, 'coords') &&
                $.isArray(opt.polygon.coords)
            ) {
                for (i = 0; i < opt.polygon.coords.length; i += 1) {
                    p = opt.polygon.coords[i];
                    c = parseLatLng(p, true);
                    if ('function' === typeof c.lat) {
                        coords.push(c);
                    }
                }

                defOpt = $.extend({}, {
                    'path': coords,
                    'strokeColor': opt.polygon.color || '#FF0000',
                    'strokeOpacity': 1.0,
                    'strokeWeight': opt.polygon.width || 2,
                    'fillColor': opt.polygon.fillcolor || '#CC0000',
                    'fillOpacity': 0.35
                }, opt.polygon);

                polygon = new google.maps.Polygon(defOpt);
                if (_hasOwnProperty(opt.polygon, 'event')) {
                    this.bindEvents(polygon, opt.polygon.event);
                }
                this._polygons.push(polygon);
                polygon.setMap(map);
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
                c = 0,
                loc = {},
                defOpt = {},
                circle = {},
                circles = {};
            
            if (_hasOwnProperty(opt, 'circle') && $.isArray(opt.circle)) {
                for (c = opt.circle.length - 1; c >= 0; c -= 1) {
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
                        'id' : _hasOwnProperty(circle, 'id') ? circle.id : ''
                    }, circle);

                    if (_hasOwnProperty(circle, 'center')) {
                        loc = parseLatLng(circle.center, true);
                        defOpt.center = loc;
                    }

                    if ('function' === typeof loc.lat) {
                        circles = new google.maps.Circle(defOpt);
                        this._circles.push(circles);
                        if (_hasOwnProperty(circle, 'event')) {
                            self.bindEvents(circles, circle.event);
                        }
                    }
                }
            }
        },
        //#!#END
        /**
         * Overlay process
         * @this {tinyMap}
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
                // GeoLocation
                this.geoLocation(map, opt);
            } catch (ignore) {
                console.dir(ignore);
            }
        },
        //#!#START MARKER
        /**
         * Build the icon options of marker
         * @param {Object} opt Marker option
         * @this {tinyMap}
         */
        markerIcon: function (opt) {
            var icons = $.extend({}, icons, opt.icon);
            if (_hasOwnProperty(opt, 'icon')) {
                if ('string' === typeof opt.icon) {
                    return opt.icon;
                }
                if (_hasOwnProperty(opt.icon, 'url')) {
                    icons.url = opt.icon.url;
                }
                if (_hasOwnProperty(opt.icon, 'size')) {
                    if ($.isArray(opt.icon.size) && 2 === opt.icon.size.length) {
                        icons.size = new google.maps.Size(
                            opt.icon.size[0],
                            opt.icon.size[1]
                        );
                    }
                }
                if (_hasOwnProperty(opt.icon, 'scaledSize')) {
                    if ($.isArray(opt.icon.scaledSize) && 2 === opt.icon.scaledSize.length) {
                        icons.scaledSize = new google.maps.Size(
                            opt.icon.scaledSize[0],
                            opt.icon.scaledSize[1]
                        );
                    }
                }
                if (_hasOwnProperty(opt.icon, 'anchor')) {
                    if ($.isArray(opt.icon.anchor) && 2 === opt.icon.anchor.length) {
                        icons.anchor = new google.maps.Point(
                            opt.icon.anchor[0],
                            opt.icon.anchor[1]
                        );
                    }
                }
            }
            return icons;
        },
        /**
         * Set a marker directly by latitude and longitude
         * @param {Object} opt Options
         * @this {tinyMap}
         */
        markerDirect: function (map, opt) {
            var self     = this,
                marker   = {},
                labelOpt = {},
                label    = {},
                id       = _hasOwnProperty(opt, 'id') ? opt.id : '',
                title    = _hasOwnProperty(opt, 'title') ?
                           opt.title.toString().replace(/<([^>]+)>/g, '') :
                           false,
                content  = _hasOwnProperty(opt, 'text') ? opt.text.toString() : false,
                markerOptions = $.extend({}, {
                    'map': map,
                    'position': opt.parseAddr,
                    'animation': null,
                    'id': id
                }, opt),
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

            if (_hasOwnProperty(opt, 'animation') &&
                'string' === typeof opt.animation
            ) {
                markerOptions.animation = google.maps.Animation[opt.animation.toUpperCase()];
            }

            //markerOptions = $.extend({}, markerOptions, opt);
            marker = new google.maps.Marker(markerOptions);
            self._markers.push(marker);

            // Apply marker fitbounds
            if (_hasOwnProperty(marker, 'position')) {
                if ('function' === typeof marker.getPosition) {
                    self.bounds.extend(marker.position);
                }
                if (true === self.options.markerFitBounds) {
                    // Make sure fitBounds call after the last marker created.
                    if (self._markers.length === self.options.marker.length) {
                        map.fitBounds(self.bounds);
                    }
                }
            }
            /**
             * Apply marker cluster.
             * Require markerclusterer.js
             * @see {@link http://google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclusterer/src/}
             */
            if (true === self.options.markerCluster) {
                if ('function' === typeof MarkerClusterer) {
                    if (_directMarkersLength === self.options.marker.length) {
                        return new MarkerClusterer(map, self._markers);
                    }
                }
            }
            labelOpt = {
                'map': map,
                'css': _hasOwnProperty(opt, 'css') ? opt.css.toString() : '',
                'id':  id
            };
            if ('string' === typeof opt.label && 0 !== opt.label.length) {
                labelOpt.text = opt.label;
                label = new Label(labelOpt);
                label.bindTo('position', marker, 'position');
                label.bindTo('text', marker, 'position');
                label.bindTo('visible', marker);
                this._labels.push(label);
            }
            self.bindEvents(marker, opt.event);
        },
        /**
         * Set a marker by Geocoder service
         * @param {Object} opt Options
         * @this {tinyMap}
         */
        markerByGeocoder: function (map, opt) {
            var geocoder = new google.maps.Geocoder(),
                self = this;

            geocoder.geocode({'address': opt.parseAddr}, function (results, status) {
                // If exceeded, call it later;
                if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                    window.setTimeout(function () {
                        self.markerByGeocoder(map, opt);
                    }, self.interval);
                } else if (status === google.maps.GeocoderStatus.OK) {
                    var marker = {},
                        labelOpt = {},
                        label = {},
                        id    = _hasOwnProperty(opt, 'id') ? opt.id : '',
                        title = _hasOwnProperty(opt, 'title') ?
                                opt.title.toString().replace(/<([^>]+)>/g, '') :
                                false,
                        content = _hasOwnProperty(opt, 'text') ? opt.text.toString() : false,
                        markerOptions = {
                            'map': map,
                            'position': results[0].geometry.location,
                            'animation': null,
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
                    
                    if (_hasOwnProperty(opt, 'animation')) {
                        if ('string' === typeof opt.animation) {
                            markerOptions.animation = google.maps.Animation[opt.animation.toUpperCase()];
                        }
                    }

                    markerOptions = $.extend({}, markerOptions, opt);
                    marker = new google.maps.Marker(markerOptions);
                    self._markers.push(marker);

                    // Apply marker fitbounds
                    if (_hasOwnProperty(marker, 'position')) {
                        if ('function' === typeof marker.getPosition) {
                            self.bounds.extend(marker.position);
                        }
                        if (true === self.options.markerFitBounds) {
                            // Make sure fitBounds call after the last marker created.
                            if (self._markers.length === self.options.marker.length) {
                                map.fitBounds(self.bounds);
                            }
                        }
                    }
                    /**
                     * Apply marker cluster.
                     * Require markerclusterer.js
                     * @see {@link http://google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclusterer/src/}
                     */
                    if (_hasOwnProperty(self.options, 'markerCluster')) {
                        if ('function' === typeof MarkerClusterer) {
                            if (_geoMarkersLength === self.options.marker.length) {
                                return new MarkerClusterer(map, self._markers);
                            }
                        }
                    }
                    labelOpt = {
                        'map': self.map,
                        'css': _hasOwnProperty(opt, 'css') ? opt.css.toString() : ''
                    };
                    if ('string' === typeof opt.label && 0 !== opt.label.length) {
                        labelOpt.text = opt.label;
                        label = new Label(labelOpt);
                        label.bindTo('position', marker, 'position');
                        label.bindTo('text', marker, 'position');
                        label.bindTo('visible', marker);
                        self._labels.push(label);
                    }
                    self.bindEvents(marker, opt.event);
                }
            });
        },
        //#!#END
        //#!#START DIRECTION
        /**
         * Direction service
         * @param {Object} opt Options
         * @this {tinyMap}
         */
        directionService: function (opt) {

            // Make sure the `from` and `to` have setting.
            if (!(_hasOwnProperty(opt, 'from') && _hasOwnProperty(opt, 'to'))) {
                return;
            }

            var self = this,
                directionsService = new google.maps.DirectionsService(),
                directionsDisplay = new google.maps.DirectionsRenderer(),
                request = {
                    'travelMode': google.maps.DirectionsTravelMode.DRIVING,
                    'optimizeWaypoints': _hasOwnProperty(opt, 'optimize') ? opt.optimize : false
                },
                panel = {},
                renderOpts = {},
                waypoints = [],
                waypointsOpts = {},
                waypointsText = [],
                endLocation = {},
                endText = '',
                i = 0,
                c = 0;

            request.origin = parseLatLng(opt.from, true);
            request.destination = parseLatLng(opt.to, true);

            if (_hasOwnProperty(opt, 'travel') &&
                google.maps.TravelMode[opt.travel.toString().toUpperCase()]
            ) {
                request.travelMode = google.maps.TravelMode[opt.travel.toString().toUpperCase()];
            }

            if (_hasOwnProperty(opt, 'panel')) {
                panel = $(opt.panel);
            }

            if (_hasOwnProperty(opt, 'waypoint') && $.isArray(opt.waypoint)) {
                for (i = 0, c = opt.waypoint.length; i < c; i += 1) {
                    waypointsOpts = {};
                    if ('string' === typeof opt.waypoint[i] || $.isArray(opt.waypoint[i])) {
                        waypointsOpts = {
                            'location' : parseLatLng(opt.waypoint[i], true),
                            'stopover' : true
                        };
                    } else {
                        if (_hasOwnProperty(opt.waypoint[i], 'location')) {
                            waypointsOpts.location = parseLatLng(opt.waypoint[i].location, true);
                        }
                        waypointsOpts.stopover = _hasOwnProperty(opt.waypoint[i], 'stopover') ?
                                                 opt.waypoint[i].stopover :
                                                 true;
                    }
                    waypointsText.push(opt.waypoint[i].text || opt.waypoint[i].toString());
                    waypoints.push(waypointsOpts);
                }
                request.waypoints = waypoints;
            }

            directionsService.route(request, function (response, status) {
                var legs = 0,
                    modify = {},
                    i = 0;
                if (status === google.maps.DirectionsStatus.OK) {
                    legs = response.routes[0].legs;
                    if (_hasOwnProperty(opt, 'autoViewport')) {
                        renderOpts.preserveViewport = false === opt.autoViewport ? true : false;
                    }
                    try {
                        if (_hasOwnProperty(opt, 'fromText')) {
                            legs[0].start_address = opt.fromText;
                        }
                        if (_hasOwnProperty(opt, 'toText')) {
                            if (1 === legs.length) {
                                legs[0].end_address = opt.toText;
                            } else {
                                legs[legs.length - 1].end_address = opt.toText;
                            }
                        }
                        if (1 === legs.length) {
                            endLocation = legs[0].end_location;
                            endText = legs[0].end_address;
                        } else {
                            endLocation = legs[legs.length - 1].end_location;
                            endText = legs[legs.length - 1].end_address;
                        }
                        if (_hasOwnProperty(opt, 'icon')) {
                            renderOpts.suppressMarkers = true;
                            if (_hasOwnProperty(opt.icon, 'from') && 'string' === typeof opt.icon.from) {
                                self.directionServiceMarker(legs[0].start_location, {
                                    'icon': opt.icon.from,
                                    'text': legs[0].start_address
                                });
                            }
                            if (_hasOwnProperty(opt.icon, 'to') && 'string' === typeof opt.icon.to) {
                                self.directionServiceMarker(endLocation, {
                                    'icon': opt.icon.to,
                                    'text': endText
                                });
                            }
                        }
                        for (i = 0; i < legs.length - 1; i += 1) {
                            legs[i].end_address = waypointsText[i];
                            if (_hasOwnProperty(opt, 'icon') && _hasOwnProperty(opt.icon, 'waypoint')) {
                                self.directionServiceMarker(legs[i].start_location, {
                                    'icon': opt.icon.waypoint,
                                    'text': legs[i].start_address
                                });
                            }
                        }
                    } catch (ignore) {
                    }
                    self.bindEvents(directionsDisplay, opt.event);
                    directionsDisplay.setOptions(renderOpts);
                    directionsDisplay.setDirections(response);
                }
            });
            directionsDisplay.setMap(self.map);
            if (panel.length) {
                directionsDisplay.setPanel(panel.get(0));
            }
            self._directions.push(directionsDisplay);
        },
        /**
         * Create the marker for directions
         * @param {Object} loc LatLng Location
         * @param {Object} opt MarkerOptions
         */
        directionServiceMarker: function (loc, opt) {
            var def = {
                    'position': loc,
                    'map': this.map
                },
                setting = $.extend({}, def, opt),
                marker  = {};
            if (_hasOwnProperty(setting, 'text')) {
                setting.infoWindow = new google.maps.InfoWindow({
                    'content': setting.text
                });
            }
            marker = new google.maps.Marker(setting);
            this._directionsMarkers.push(marker);
            this.bindEvents(marker);
        },
        //#!#END
        /**
         * bind events
         * @param {Object} marker Marker objects
         * @param {function|Object} event Events
         * @this {tinyMap}
         */
        bindEvents: function (target, event) {
            var self = this,
                e = {};
            switch (typeof event) {
            case 'function':
                google.maps.event.addListener(target, 'click', event);
                break;
            case 'object':
                for (e in event) {
                    if ('function' === typeof event[e]) {
                        google.maps.event.addListener(target, e, event[e]);
                    } else {
                        if (_hasOwnProperty(event[e], 'func') && 'function' === typeof event[e].func) {
                            if (_hasOwnProperty(event[e], 'once') && true === event[e].once) {
                                google.maps.event.addListenerOnce(target, e, event[e].func);
                            } else {
                                google.maps.event.addListener(target, e, event[e].func);
                            }
                        } else if ('function' === typeof event[e]) {
                            google.maps.event.addListener(target, e, event[e]);
                        }
                    }
                }
            }
            if (_hasOwnProperty(target, 'infoWindow')) {
                google.maps.event.addListener(target, 'click', function () {
                    var i = 0,
                        m = {};
                    // Close all infoWindows if `infoWindowAutoClose` was true.
                    if (_hasOwnProperty(self.options, 'infoWindowAutoClose') &&
                        true === self.options.infoWindowAutoClose
                    ) {
                        for (i = 0; i < self._markers.length; i += 1) {
                            m = self._markers[i];
                            if (_hasOwnProperty(m, 'infoWindow')) {
                                if ('function' === typeof m.infoWindow.close) {
                                    m.infoWindow.close();
                                }
                            }
                        }
                    }
                    target.infoWindow.open(self.map, target);
                });
            }
        },
        //#!#START STREETVIEW
        /**
         * Switch StreetView
         * @this {tinyMap}
         */
        streetView: function (map, opt) {
            var self = this,
                pano = {},
                opts = _hasOwnProperty(opt, 'streetViewObj') ? opt.streetViewObj : {},
                svOpt = {
                    'heading': 0,
                    'pitch': 0,
                    'zoom': 1
                },
                events = [
                    'closeclick',
                    'links_changed',
                    'pano_changed',
                    'position_changed',
                    'pov_changed',
                    'resize',
                    'status_changed',
                    'visible_changed',
                    'zoom_changed'
                ],
                i = 0,
                loc = {};

            if ('function' === typeof map.getStreetView &&
                _hasOwnProperty(opt, 'streetViewObj')
            ) {
                pano = map.getStreetView();
                // Default position of streetView
                if (_hasOwnProperty(opts, 'position')) {
                    loc = parseLatLng(opts.position, true);
                    if ('object' !== typeof loc) {
                        opts.position = map.getCenter();
                    } else {
                        opts.position = loc;
                    }
                } else {
                    opts.position = map.getCenter();
                }
                // Pov configure
                if (_hasOwnProperty(opts, 'pov')) {
                    opts.pov = $.extend({}, svOpt, opts.pov);
                }
                if (_hasOwnProperty(opts, 'visible')) {
                    pano.setVisible(opts.visible);
                }
                // Apply options
                pano.setOptions(opts);
                // Events Binding
                if (_hasOwnProperty(opts, 'event')) {
                    self.bindEvents(pano, opts.event);
                }
            }
        },
        //#!#END
        //#!#START PANTO
        /**
         * Method: Google Maps PanTo
         * @param {string|Array|Object} addr Location
         * @public
         */
        panto: function (addr) {
            var loc = {},
                geocoder = {},
                m = this.map;
            if (null !== m && undefined !== m) {
                loc = parseLatLng(addr, true);
                if ('string' === typeof loc) {
                    geocoder = new google.maps.Geocoder();
                    geocoder.geocode({'address': loc}, function (results, status) {
                        if (status === google.maps.GeocoderStatus.OK) {
                            if ('function' === typeof m.panTo && results.length) {
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
        },
        //#!#END
        //#!#START CLEAR
        /**
         * Method: Google Maps clear the specificed layer
         * @param {string} type Layer type
         * @public
         */
        clear: function (layer) {
            var self = this,
                layers = 'marker,circle,polygon,polyline,direction,kml',
                label = '',
                i = 0,
                j = 0;

            layers = 'string' === typeof layer ?
                     layer.split(',') :
                     ($.isArray(layer) ? layer : layers.split(','));

            for (i = 0; i < layers.length; i += 1) {
                label = '_' + $.trim(layers[i].toString().toLowerCase()) + 's';
                if (undefined !== self[label] && self[label].length) {
                    for (j = 0; j < self[label].length; j += 1) {
                        if (self.map === self[label][j].getMap()) {
                            self[label][j].set('visible', false);
                            self[label][j].set('directions', null);
                            self[label][j].setMap(null);
                        }
                    }
                    self[label].length = 0;
                }
                // Remove the direction icons.
                if ('direction' === layers[i]) {
                    for (j = 0; j < self._directionsMarkers.length; j += 1) {
                        self._directionsMarkers[j].setMap(null);
                    }
                }
            }
        },
        //#!#END
        //#!#START MODIFY
        /**
         * Method:  Google Maps dynamic add layers
         * @param {Object} options Refernce by tinyMap options
         * @public
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
                    ['streetView', 'streetView']
                ],
                i = 0,
                m = self.map;

            if (undefined !== options) {
                for (i = 0; i < label.length; i += 1) {
                    if (_hasOwnProperty(options, label[i][0])) {
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
                    if (_hasOwnProperty(options, 'event')) {
                        self.bindEvents(m, options.event);
                    }
                }
            }
        },
        //#!#END
        //#!#START DESTROY
        destroy: function () {
            var container = $(this.container);
            $.data(container.get(0), 'tinyMap', null);
        },
        //#!#END
        /**
         * Use HTML5 Geolocation API to detect the client's location.
         * @param {Object} map Map intance
         * @param {Object} opt Plugin options
         */
        geoLocation: function (map, opt) {

            var watch = false,
                geolocation = navigator.geolocation;

            if (!geolocation) {
                return;
            }

            if (true === opt.autoLocation) {
                geolocation.getCurrentPosition(
                    function (loc) {
                        if (loc && _hasOwnProperty(loc, 'coords')) {
                            map.panTo(new google.maps.LatLng(
                                loc.coords.latitude,
                                loc.coords.longitude
                            ));
                        }
                    },
                    function (error) {
                        console.error(error);
                    },
                    {
                        'maximumAge': 600000,
                        'timeout': 3000,
                        'enableHighAccuracy': false
                    }
                );
            } 
        },
        /**
         * tinyMap Initialize
         * @this {tinyMap}
         */
        init: function () {
            var self = this,
                geocoder = {};

            if ('string' === typeof self.options.center) {
                geocoder = new google.maps.Geocoder();
                geocoder.geocode({'address': self.options.center}, function (results, status) {
                    try {
                        if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                            self.init();
                        } else if (status === google.maps.GeocoderStatus.OK && 0 !== results.length) {
                            if (undefined !== results[0] && _hasOwnProperty(results[0], 'geometry')) {
                                self.googleMapOptions.center = results[0].geometry.location;
                                self.map = new google.maps.Map(self.container, self.googleMapOptions);
                                google.maps.event.addListenerOnce(self.map, 'idle', function () {
                                    self.overlay();
                                });
                                self.bindEvents(self.map, self.options.event);
                            }
                        } else {
                            console.error(status);
                        }
                    } catch (ignore) {
                        console.error(ignore);
                    }
                });
            } else {
                self.map = new google.maps.Map(self.container, self.googleMapOptions);
                google.maps.event.addListenerOnce(self.map, 'idle', function () {
                    self.overlay();
                });
                self.bindEvents(self.map, self.options.event);
            }
        }
    };
    /**
     * jQuery tinyMap instance
     * @param {Object} options Plugin settings
     * @public
     */
    $.fn.tinyMap = function (options) {
        var args = arguments,
            id   = 'tinyMap',
            result = [],
            instance = {};
        if ('string' === typeof options) {
            this.each(function () {
                instance = $.data(this, id);
                if (instance instanceof TinyMap &&'function' === typeof instance[options]) {
                    result = instance[options].apply(instance, Array.prototype.slice.call(args, 1));
                }
            });
            return undefined !== result ? result : this;
        } else {
            return this.each(function () {
                if (!$.data(this, id)) {
                    $.data(this, id, new TinyMap(this, options));
                }
            });
        }
    };
})(jQuery, window, document);
