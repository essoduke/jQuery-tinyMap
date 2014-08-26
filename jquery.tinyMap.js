/*jshint undef:false, unused:false */
/**
 * MIT License
 * Copyright(c) 2014 essoduke.org
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 『AS IS』, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * jQuery tinyMap 輕鬆建立 Google Maps 的 jQuery 擴充套件
 * 短小精幹！拯救你免於 Google Maps API 的摧殘，輕鬆建立 Google Maps 的 jQuery 擴充套件。
 *
 * http://app.essoduke.org/tinyMap/
 *
 * @author: Essoduke Chang
 * @version: 2.9.3
 *
 * [Changelog]
 * 新增 direction.icon 參數可設置 from, to, waypoint 的自訂 icon url。
 *
 * Release 2014.08.26.184831
 */
;(function ($, window, document, undefined) {

    'use strict';

    var pluginName = 'tinyMap',
    // Plugin default settings
        defaults = {
            'center': {x: '', y: ''},
            'control': true,
            'disableDoubleClickZoom': false, //2.6.4
            'disableDefaultUI': false, //2.5.1
            'draggable': true,
            'infoWindowAutoClose':  true, //2.8.4
            'keyboardShortcuts': true,
            'mapTypeControl': true,
            'mapTypeControlOptions': {
                'position': 'TOP_RIGHT',
                'style': 'DEFAULT'
            },
            'mapTypeId': 'ROADMAP',
            'marker': [],
            'markerFitBounds': false,
            'markerCluster': false, //2.6.0
            'maxZoom': null, //2.5.1
            'minZoom': null, //2.5.1
            'panControl': true, //2.5.1
            'panControlOptions': {
                'position': 'LEFT_TOP'
            },
            'polyline': [], // 2.8.0 update
            'navigationControl': true,
            'navigationControlOptions': {
                'position': 'TOP_LEFT',
                'style': 'DEFAULT'
            },
            'scaleControl': true,
            'scaleControlOptions': {
                'position': 'BOTTOM_LEFT',
                'style': 'DEFAULT'
            },
            'scrollwheel': true,
            'streetViewControl': true, //2.5.1
            'streetViewControlOptions': {
                'position': 'LEFT_TOP'
            },
            'zoom': 4,
            'zoomControl': true,
            'zoomControlOptions': {
                'style': 'LARGE',
                'position': 'LEFT_TOP'
            },
            'notfound': '找不到查詢的地點',
            'loading': '讀取中&hellip;',
            'kml': {
                'url': '',
                'viewport': true,
                'infowindow': false
            },
            'interval': 100, //2.5.0
            'event': null, //2.7.0
            'showStreetView': false, // 2.7.5
            'autoLocation': false //2.8.2
        },
        _directMarkersLength = 0,
        _geoMarkersLength = 0,
        styles = {}; //2.8.8

    //#!#START STYLES
    styles = {
        // Grey Scale
        'greyscale': [{
            'featureType': 'all',
            'stylers': [{
                'saturation': -100
            }, {
                'gamma': 0.5
            }]
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
        }
    }

    /**
     * Parsing the location
     * @param {string|array|Object} loc Location
     * @param {bool} formatting Format to Google Maps LatLng Object
     * @return {Object}
     */
    function parseLatLng (loc, formatting) {
        var arr = [],
            re = /^[+-]?\d+(\.\d+)?$/,
            result = {
                'lat': '',
                'lng': ''
            };
        if ('string' === typeof loc || $.isArray(loc)) {
            arr = 'string' === typeof loc ? loc.replace(/\s+/, '').split(',') : loc;
            if (2 === arr.length) {
                if (re.test(arr[0]) && re.test(arr[1])) {
                    result.lat = arr[0];
                    result.lng = arr[1];
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
        var self = this,
            pane = self.getPanes().overlayLayer;
        self.div.appendTo($(pane));
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

        var div = {},
            loc = {},
            opt = {};

        // Make sure the API has loaded.
        if (!_hasOwnProperty(window, 'google')) {
            return;
        }

        opt = $.extend({}, defaults, options);

        /**
         * Map instance
         * @type {Object}
         */
        this.map = null;
        /**
         * Map marker cluster
         * @type {Object}
         */
        this.markerCluster = null;
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
         * Interval for geocoder's query interval
         * @type {number}
         */
        this.interval = parseInt(this.options.interval, 10) || 1100;
        /**
         * Google Maps options
         * @type {Object}
         */
        this.googleMapOptions = {
            'center': '',
            'control': opt.control,
            'disableDoubleClickZoom': opt.disableDoubleClickZoom,
            'disableDefaultUI': opt.disableDefaultUI,
            'draggable': opt.draggable,
            'keyboardShortcuts': opt.keyboardShortcuts,
            'mapTypeId': google.maps.MapTypeId[opt.mapTypeId.toUpperCase()],
            'mapTypeControl': opt.mapTypeControl,
            'mapTypeControlOptions': {
                'position': google.maps.ControlPosition[opt.mapTypeControlOptions.position],
                'style': google.maps.MapTypeControlStyle[opt.mapTypeControlOptions.style.toUpperCase()]
            },
            'maxZoom': opt.maxZoom,
            'minZoom': opt.minZoom,
            'navigationControl': opt.navigationControl,
            'navigationControlOptions': {
                'position': google.maps.ControlPosition[opt.navigationControlOptions.position],
                'style': google.maps.NavigationControlStyle[opt.navigationControlOptions.style.toUpperCase()]
            },
            'panControl': opt.panControl,
            'panControlOptions': {
                'position': google.maps.ControlPosition[opt.panControlOptions.position]
            },
            'rotateControl': opt.rotateControl,
            'scaleControl': opt.scaleControl,
            'scaleControlOptions': {
                'position': google.maps.ControlPosition[opt.scaleControlOptions.position],
                'style': google.maps.ScaleControlStyle[opt.scaleControlOptions.style.toUpperCase()]
            },
            'scrollwheel': opt.scrollwheel,
            'streetViewControl': opt.streetViewControl,
            'streetViewControlOptions': {
                'position': google.maps.ControlPosition[opt.streetViewControlOptions.position]
            },
            'zoom': opt.zoom,
            'zoomControl': opt.zoomControl,
            'zoomControlOptions': {
                'position': google.maps.ControlPosition[opt.zoomControlOptions.position],
                'style': google.maps.ZoomControlStyle[opt.zoomControlOptions.style.toUpperCase()]
            }
        };

        // tinyMap.center parsing
        this.options.center = this.googleMapOptions.center = parseLatLng(opt.center, true);

        if (true === opt.disableDefaultUI) {
            this.googleMapOptions.mapTypeControl = false;
            this.googleMapOptions.navigationControl = false;
            this.googleMapOptions.panControl = false;
            this.googleMapOptions.rotateControl = false;
            this.googleMapOptions.scaleControl = false;
            this.googleMapOptions.streetViewControl = false;
            this.googleMapOptions.zoomControl = false;
        }

        //#!#START STYLES
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

        VERSION: '2.9.3',

        // Layers container
        _polylines: [],
        _polygons: [],
        _circles: [],
        _kmls: [],
        _directions: [],

        // Google Maps LatLngClass
        bounds: new google.maps.LatLngBounds(),
        /**
         * Set zoom level of the map
         * @param {Object} map Map instance
         * @param {Object} opt tinyMap options
         */
        setZoom: function (map, opt) {
            if (_hasOwnProperty(opt, 'zoom') && map) {
                map.setZoom(opt.zoom);
            }
        },
        //#!#START KML
        /**
         * KML overlay
         * @param {Object} map Map instance
         * @param {Object} opt KML options
         */
        kml: function (map, opt) {
            var kml_opt = {},
                kml_url = '',
                kml = {};
            opt = (!opt ? this.options : opt);
            if (undefined !== opt.kml) {
                kml_opt = {
                    preserveViewport: true,
                    suppressInfoWindows: false
                };
                kml_url = ('string' === typeof opt.kml && 0 !== opt.kml.length) ?
                          opt.kml :
                          (undefined !== opt.kml.url ? opt.kml.url : '');
                kml = new google.maps.KmlLayer(kml_url, $.extend(kml_opt, opt.kml));
                this._kmls.push(kml);
                kml.setMap(map);
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
            var d = '';
            opt = !opt ? this.options : opt;
            if (_hasOwnProperty(opt, 'direction') && 0 < opt.direction.length) {
                for (d in opt.direction) {
                    if (_hasOwnProperty(opt.direction, d)) {
                        this.directionService(opt.direction[d]);
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
            var self = this,
                m = '',
                i = 0,
                j = 0,
                markers = [],
                labels  = [];
                
            opt = !opt ? this.options : opt;

            _directMarkersLength = 0;
            _geoMarkersLength = 0;
            
            markers = self._markers;

            // For first initialize of instance.
            if (!source || 0 === markers.length) {
                if ($.isArray(opt.marker)) {
                    for (m in opt.marker) {
                        if (_hasOwnProperty(opt.marker, m) &&
                            _hasOwnProperty(opt.marker[m], 'addr')
                        ) {
                            opt.marker[m].parseAddr = parseLatLng(opt.marker[m].addr, true);
                            if ('string' === typeof opt.marker[m].parseAddr) {
                                this.markerByGeocoder(map, opt.marker[m], opt);
                            } else {
                                this.markerDirect(map, opt.marker[m], opt);
                            }
                        }
                    }
                }
            }
            
            /**
             * Put existed markers to the new position
             */
            if ('modify' === source) {

                labels  = this._labels;

                for (i = 0; i < opt.marker.length; i += 1) {
                    if (_hasOwnProperty(opt.marker[i], 'id')) {
                        for (j = 0; j < markers.length; j += 1) {
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
                        for (j = 0; j < labels.length; j += 1) {
                            if (opt.marker[i].id === labels[j].id) {
                                if (_hasOwnProperty(opt.marker[i], 'label')) {
                                    labels[j].text = opt.marker[i].label;
                                }
                                labels[j].draw();
                                continue;
                            }
                        }
                    // Insert the new marker if it is not existed.
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
                p = '',
                c = {},
                len = 0,
                coords = new google.maps.MVCArray(),
                path   = [],
                service = {},
                waypoints = [],
                distance = {};

            opt = !opt ? this.options : opt;
            if (_hasOwnProperty(opt, 'polyline') &&
                _hasOwnProperty(opt.polyline, 'coords')
            ) {
                for (p in opt.polyline.coords) {
                    if (_hasOwnProperty(opt.polyline.coords, p)) {
                        c = opt.polyline.coords;
                        if (undefined !== c[p]) {
                            coords.push(new google.maps.LatLng(c[p][0], c[p][1]));
                        }
                    }
                }

                polyline = new google.maps.Polyline({
                    'strokeColor': opt.polyline.color || '#FF0000',
                    'strokeOpacity': 1.0,
                    'strokeWeight': opt.polyline.width || 2
                });

                this._polylines.push(polyline);

                if (2 < coords.getLength()) {
                    for (i = 0; i < coords.length; i += 1) {
                        if (0 < i && (coords.getLength() - 1 > i)) {
                            waypoints.push({
                                'location': coords[i],
                                'stopover': false
                            });
                        }
                    }
                }

                if (true === opt.polyline.snap) {
                    service = new google.maps.DirectionsService();
                    service.route({
                        'origin': coords.getAt(0),
                        'waypoints': waypoints,
                        'destination': coords.getAt(coords.getLength() - 1),
                        'travelMode': google.maps.DirectionsTravelMode.DRIVING
                    }, function (result, status) {
                        if (status === google.maps.DirectionsStatus.OK) {
                            for (i = 0, len = result.routes[0].overview_path.length; i < len; i += 1) {
                                path.push(result.routes[0].overview_path[i]);
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
                    if (_hasOwnProperty(google.maps.geometry, 'spherical')) {
                        if ('function' === typeof google.maps.geometry.spherical.computeDistanceBetween) {
                            distance = google.maps.geometry.spherical.computeDistanceBetween(coords.getAt(0), coords.getAt(coords.getLength() - 1));
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
                p = '',
                c = {},
                coords = [];
            opt = !opt ? this.options : opt;
            if (_hasOwnProperty(opt, 'polygon') &&
                _hasOwnProperty(opt.polygon, 'coords')
            ) {
            
                for (p in opt.polygon.coords) {
                    if (_hasOwnProperty(opt.polygon.coords, p)) {
                        c = opt.polygon.coords;
                        if (undefined !== c[p]) {
                            coords.push(new google.maps.LatLng(c[p][0], c[p][1]));
                        }
                    }
                }
                polygon = new google.maps.Polygon({
                    'path': coords,
                    'strokeColor': opt.polygon.color || '#FF0000',
                    'strokeOpacity': 1.0,
                    'strokeWeight': opt.polygon.width || 2,
                    'fillColor': opt.polygon.fillcolor || '#CC0000',
                    'fillOpacity': 0.35
                });
                this._polygons.push(polygon);
                polygon.setMap(this.map);
                if ('function' === typeof opt.polygon.click) {
                    google.maps.event.addListener(polygon, 'click', opt.polygon.click);
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
            var c = 0,
                loc = {
                    'lat': '',
                    'lng': ''
                },
                locArray = [],
                circle = {},
                circles = {};
            opt = !opt ? this.options : opt;
            if (_hasOwnProperty(opt, 'circle') && $.isArray(opt.circle)) {
                for (c = opt.circle.length - 1; c >= 0; c -= 1) {
                    circle = opt.circle[c];
                    if (_hasOwnProperty(circle, 'center')) {
                        loc = parseLatLng(circle.center);
                    }
                    if (loc.lat && loc.lng) {
                        circles = new google.maps.Circle({
                            'strokeColor': circle.color || '#FF0000',
                            'strokeOpacity': circle.opacity || 0.8,
                            'strokeWeight': circle.width || 2,
                            'fillColor': circle.fillcolor || '#FF0000',
                            'fillOpacity': circle.fillopacity || 0.35,
                            'map': this.map,
                            'center': new google.maps.LatLng(loc.lat, loc.lng),
                            'radius': circle.radius || 10,
                            'zIndex': 100,
                            'id' : _hasOwnProperty(opt, 'id') ? opt.id : ''
                        });
                        this._circles.push(circles);
                        if ('function' === typeof opt.circle[c].click) {
                            google.maps.event.addListener(circles, 'click', opt.circle[c].click);
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
                // StreetView service
                this.streetView(map, opt);
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
            var icons = {};
            if (_hasOwnProperty(opt, 'icon')) {

                if ('string' === typeof opt.icon) {
                    return opt.icon;
                }
                if (_hasOwnProperty(opt.icon, 'url')) {
                    icons.url = opt.icon.url;
                }
                if (_hasOwnProperty(opt.icon, 'size')) {
                    if (undefined !== opt.icon.size[0] &&
                        undefined !== opt.icon.size[1]
                    ) {
                        icons.scaledSize = new google.maps.Size(
                            opt.icon.size[0],
                            opt.icon.size[1]
                        );
                    }
                }
                if (_hasOwnProperty(opt.icon, 'anchor')) {
                    if (undefined !== opt.icon.anchor[0] &&
                        undefined !== opt.icon.anchor[1]
                    ) {
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
                markerOptions = {
                    'map': map,
                    'position': opt.parseAddr,
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

            if ('string' === typeof icons || _hasOwnProperty(icons, 'url')) {
                markerOptions.icon = icons;
            }

            if (_hasOwnProperty(opt.animation)) {
                if ('string' === typeof opt.animation) {
                    markerOptions.animation = google.maps.Animation[opt.animation.toUpperCase()];
                }
            }

            marker = new google.maps.Marker(markerOptions);
            self._markers.push(marker);

            // Apply marker fitbounds
            if (_hasOwnProperty(marker, 'position')) {
                if (marker.getPosition().lat() && marker.getPosition().lng()) {
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
                        self.markerCluster = new MarkerClusterer(map, self._markers);
                        return;
                    }
                }
            }

            labelOpt = {
                map: map,
                css: undefined !== opt.css ? opt.css : '',
                id:  id
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
                    if ('string' === typeof icons || _hasOwnProperty(icons, 'url')) {
                        markerOptions.icon = icons;
                    }

                    if (_hasOwnProperty(opt, 'animation')) {
                        if ('string' === typeof opt.animation) {
                            markerOptions.animation = google.maps.Animation[opt.animation.toUpperCase()];
                        }
                    }

                    marker = new google.maps.Marker(markerOptions);
                    self._markers.push(marker);

                    // Apply marker fitbounds
                    if (_hasOwnProperty(marker, 'position')) {
                        if (marker.getPosition().lat() && marker.getPosition().lng()) {
                            self.bounds.extend(markerOptions.position);
                        }
                    }
                    if (true === self.options.markerFitBounds) {
                        // Make sure fitBounds call after the last marker created.
                        if (self._markers.length === self.options.marker.length) {
                            map.fitBounds(self.bounds);
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
                                self.markerCluster = new MarkerClusterer(map, self._markers);
                                return;
                            }
                        }
                    }

                    labelOpt = {
                        map: self.map,
                        css: opt.css || ''
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
            var self = this,
                directionsService = new google.maps.DirectionsService(),
                directionsDisplay = new google.maps.DirectionsRenderer(),
                request = {
                    'travelMode': google.maps.DirectionsTravelMode.DRIVING,
                    'optimizeWaypoints': opt.optimize || false
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

            if (undefined !== opt.waypoint && 0 !== opt.waypoint) {
                for (i = 0, c = opt.waypoint.length; i < c; i += 1) {
                    waypointsOpts = {};
                    if ('string' === typeof opt.waypoint[i]) {
                        waypointsOpts = {
                            'location' : opt.waypoint[i].toString(),
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

            if (undefined !== request.origin && undefined !== request.destination) {
                directionsService.route(request, function (response, status) {
                    var legs = 0,
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

                            endLocation = 1 === legs.length ?
                                          legs[0].end_location :
                                          legs[legs.length - 1].end_location;
                            endText     = 1 === legs.length ?
                                          legs[0].end_address :
                                          legs[legs.length - 1].end_address;

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
                            for (i = 1; i < legs.length; i += 1) {
                                legs[i].start_address = waypointsText[i - 1];
                                if (_hasOwnProperty(opt, 'icon') && _hasOwnProperty(opt.icon, 'waypoint')) {
                                    self.directionServiceMarker(legs[i].start_location, {
                                        'icon': opt.icon.waypoint,
                                        'text': legs[i].start_address
                                    });
                                }
                            }
                        } catch (ignore) {
                        }
                        directionsDisplay.setOptions(renderOpts);
                        directionsDisplay.setDirections(response);
                    }
                });
                directionsDisplay.setMap(self.map);
                if (panel.length) {
                    directionsDisplay.setPanel(panel.get(0));
                }
                self._directions.push(directionsDisplay);
            }
        },
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
                            if (undefined !== m.infoWindow) {
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
        /**
         * Switch StreetView
         * @this {tinyMap}
         */
        streetView: function (map, opt) {
            var pano = map.getStreetView();
            pano.setPosition(map.getCenter());
            if (_hasOwnProperty(opt, 'showStreetView')) {
                pano.setVisible(opt.showStreetView);
            }
        },
        //#!#START PANTO
        /**
         * Method: Google Maps PanTo
         * @param {string} addr Text address or "latitude, longitude" format
         * @public
         */
        panto: function (addr) {
            var self = this,
                loc = '',
                latlng = '',
                geocoder = {},
                m = self.map;
            if (_hasOwnProperty(self, 'map')) {
                if (null !== m && undefined !== m) {
                    loc = parseLatLng(addr, true);
                    if ('string' === typeof addr) {
                        geocoder = new google.maps.Geocoder();
                        geocoder.geocode({'address': addr}, function (results, status) {
                            if (status === google.maps.GeocoderStatus.OK) {
                                if ('function' === typeof m.panTo && undefined !== results[0]) {
                                    m.panTo(results[0].geometry.location);
                                }
                            }
                        });
                        return;
                    }
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
         * @param {string} type Layer type (markers, polylines, polygons, circles, kmls, directions)
         * @public
         */
        clear: function (layer) {
            var self = this,
                layers = [],
                label = '',
                i = 0,
                j = 0;

            layers = 'string' === typeof layer ?
                     layer.split(',') :
                     ($.isArray(layer) ? layer : []);

            layers = !layers.length ? ['marker', 'circle', 'polygon', 'polyline', 'direction', 'kml'] : layers;

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
                    ['zoom', 'setZoom'],
                    ['showStreetView', 'streetView']
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
                                self[func[i]](m, options, 'modify');
                            }
                        }
                    } else {
                        m.setOptions(options);
                    }
                }
            }
        },
        //#!#END
        //#!#START AUTOLOCATION
        /**
         * Use HTML5 Geolocation API to detect the client's location.
         * @param {Object} map Map intance
         * @param {Object} opt Plugin options
         */
        geoLocation: function (map, opt) {

            var self = this,
                watch = false,
                positionOptions = {
                    'maximumAge': 600000,
                    'timeout': 3000,
                    'enableHighAccuracy': false
                },
                geolocation = navigator.geolocation;

            if (!geolocation) {
                return;
            }

            if (true === opt.autoLocation) {
                geolocation.getCurrentPosition(
                    function (loc) {
                        if (loc) {
                            map.panTo(
                                new google.maps.LatLng(
                                    loc.coords.latitude,
                                    loc.coords.longitude
                                )
                            );
                        }
                    },
                    function (error) {
                    },
                    positionOptions
                );
            } 
        },
        //#!#END
        /**
         * tinyMap Initialize
         * @this {tinyMap}
         */
        init: function () {
            var self = this,
                error = {},
                geocoder = {},
                msg = '';

            if ('string' === typeof self.options.center) {
                geocoder = new google.maps.Geocoder();
                geocoder.geocode({'address': self.options.center}, function (results, status) {
                    try {
                        if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                            self.init();
                        } else if (status === google.maps.GeocoderStatus.OK && 0 !== results.length) {
                            self.googleMapOptions
                                .center = (status === google.maps.GeocoderStatus.OK && 0 !== results.length) ?
                                          results[0].geometry.location :
                                          '';
                            self.map = new google.maps.Map(self.container, self.googleMapOptions);
                            google.maps.event.addListenerOnce(self.map, 'idle', function () {
                                self.overlay();
                            });
                            // Events binding
                            self.bindEvents(self.map, self.options.event);
                        } else {
                            msg = self.options.notfound.text || status;
                            error.html(msg.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
                        }
                    } catch (ignore) {
                        error.html((undefined !== ignore.message ? ignore.message : ignore.description).toString());
                    }
                });
                
            } else {
                self.map = new google.maps.Map(self.container, self.googleMapOptions);
                google.maps.event.addListenerOnce(self.map, 'idle', function () {
                    self.overlay();
                });
                // Events binding
                self.bindEvents(self.map, self.options.event);
            }
        }
    };
    /**
     * jQuery tinyMap instance
     * @param {Object} options Plugin settings
     * @public
     */
    $.fn[pluginName] = function (options) {
        var args = arguments,
            result = [],
            instance = {};
        if ('string' === typeof options) {
            this.each(function () {
                instance = $.data(this, pluginName);
                if (instance instanceof TinyMap && 'function' === typeof instance[options]) {
                    result = instance[options].apply(instance, Array.prototype.slice.call(args, 1));
                }
            });
            return undefined !== result ? result : this;
        } else {
            return this.each(function () {
                if (!$.data(this, pluginName)) {
                    $.data(this, pluginName, new TinyMap(this, options));
                }
            });
        }
    };
})(jQuery, window, document);
