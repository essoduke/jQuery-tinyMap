/**
 * MIT License
 * Copyright(c) 2013 essoduke.org
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
 * http://app.essoduke.org/tinyMap/
 *
 * @author: Essoduke Chang
 * @version: 2.5.0
 *
 * [Changelog]
 * 廢除原有的 tinyMapPanTo, tinyMapModify, tinyMapClear 方法，改為由 tinyMap 以字串參數呼叫。
 * 新增 interval 參數可以設定每次 geocoder 查詢的間隔秒數（毫秒）
 *
 * Last Modify: Wed, 28 August 2013 09:22:01 GMT
 */
;(function ($, window, document, undefined) {

    'use strict';

    // Loop counter for geocoder
    var pluginName = 'tinyMap',
        loop = 0,
    // Plugin default settings
        defaults = {
            'center': {x: '24', y: '121'},
            'control': true,
            'draggable': true,
            'keyboardShortcuts': true,
            'mapTypeControl': true,
            'mapTypeControlOptions': {
                'position': 'TOP_RIGHT',
                'style': 'DEFAULT'
            },
            'mapTypeId': 'ROADMAP',
            'marker': [],
            'markerFitBounds': false,
            'polyline': [],
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
            'zoom': 4,
            'notfound': '找不到查詢的地點',
            'loading': '讀取中…',
            'kml': {
                'url': '',
                'viewport': true,
                'infowindow': false
            },
            'interval': 200 //v2.5.0
        };

    /**
     * _hasOwnProperty for compatibility IE
     * @param {Object} obj Object
     * @param {string} property Property name
     * @return {boolean}
     * @version 2.4.3
     */
    function _hasOwnProperty(obj, property) {
        try {
            return (!window.hasOwnProperty) ? Object.prototype.hasOwnProperty.call(obj, property.toString()) : obj.hasOwnProperty(property.toString());
        } catch (ignore) {
        }
    }

    //#!#CLASS_LABEL
    /**
     * Label in Maps
     * @param {Object} options Label options
     * @constructor
     */
    function Label (options) {
        var css = (options.css || '');
        this.setValues(options);
        this.span = $('<span/>').css({'position': 'relative', 'left': '-50%', 'top': '0', 'white-space': 'nowrap'}).addClass(css);
        this.div = $('<div/>').css({'position': 'absolute', 'display': 'none'});
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
        var pane = this.getPanes().overlayLayer, me = this;
        this.div.appendTo($(pane));
        this.listeners = [
            google.maps.event.addListener(this, 'position_changed', function () { me.draw(); }),
            google.maps.event.addListener(this, 'text_changed', function() { me.draw(); })
        ];
    };
    /**
     * Label draw to map
     * @this {Label}
     */
    Label.prototype.draw = function () {
        var projection = this.getProjection(),
            position = projection.fromLatLngToDivPixel(this.get('position'));
        this.div.css({'left': position.x + 'px', 'top': position.y + 'px', 'display': 'block'});
        if (this.text) {
            this.span.html(this.text.toString());
        }
    };
    //#!#END
    /**
     * tinyMap Constructor
     * @param {Object} container HTML element
     * @param {(Object|string)} options User settings
     * @constructor
     */
    function tinyMap (container, options) {
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
         * DOM of selector
         * @type {Object}
         */
        this.container = container;
        /**
         * Merge the options
         * @type {Object}
         */
        this.options = $.extend({}, defaults, options);
        /**
         * Interval for geocoder's query interval
         * @type {number}
         */
        this.interval = parseInt(this.options.interval, 10);

        /**
         * Google Maps options
         * @type {Object}
         */
        this.GoogleMapOptions = {
            'center': new google.maps.LatLng(this.options.center.x, this.options.center.y),
            'control': this.options.control,
            'draggable': this.options.draggable,
            'keyboardShortcuts': this.options.keyboardShortcuts,
            'mapTypeId': google.maps.MapTypeId[this.options.mapTypeId.toUpperCase()],
            'mapTypeControl': this.options.mapTypeControl,
            'mapTypeControlOptions': {
                'position': google.maps.ControlPosition[this.options.mapTypeControlOptions.position],
                'style': google.maps.MapTypeControlStyle[this.options.mapTypeControlOptions.style.toUpperCase()]
            },
            'navigationControl': this.options.navigationControl,
            'navigationControlOptions': {
                'position': google.maps.ControlPosition[this.options.navigationControlOptions.position],
                'style': google.maps.NavigationControlStyle[this.options.navigationControlOptions.style.toUpperCase()]
            },
            'scaleControl': this.options.scaleControl,
            'scaleControlOptions': {
                'position': google.maps.ControlPosition[this.options.scaleControlOptions.position],
                'style': google.maps.ScaleControlStyle[this.options.scaleControlOptions.style.toUpperCase()]
            },
            'scrollwheel': this.options.scrollwheel,
            'zoom': this.options.zoom
        };
        this.init();
    }
    /**
     * tinyMap prototype
     */
    tinyMap.prototype = {

        VERSION: '2.5.0',

        // Layers container
        _markers: [],
        _labels: [],
        _polylines: [],
        _polygons: [],
        _circles: [],
        _kmls: [],
        _directions: [],

        // Google Maps LatLngClass
        bounds: new google.maps.LatLngBounds(),
        //#!#FUNC_KML
        /**
         * KML overlay
         * @param {Object} map Map instance
         * @param {Object} opt KML options
         */
        kml: function (map, opt) {
            var opt = (!opt ? this.options : opt), kml_opt, kml_url, kml;
            if (undefined !== opt.kml) {
                kml_opt = {
                    preserveViewport: true,
                    suppressInfoWindows: false
                },
                kml_url = ('string' === typeof opt.kml && 0 !== opt.kml.length) ? opt.kml : (undefined !== opt.kml.url ? opt.kml.url : ''),
                kml = new google.maps.KmlLayer(kml_url, $.extend(kml_opt, opt.kml));
                this._kmls.push(kml);
                kml.setMap(map);
            }
        },
        //#!#END
        //#!#FUNC_DIRECTION
        /**
         * Direction overlay
         * @param {Object} map Map instance
         * @param {Object} opt Direction options
         */
        direction: function (map, opt) {
            var d, opt = !opt ? this.options : opt;
            if (undefined !== opt.direction && 0 < opt.direction.length) {
                for (d in opt.direction) {
                    if (_hasOwnProperty(opt.direction, d)) {
                        if (undefined !== opt.direction[d]) {
                            this.DirectionService(opt.direction[d]);
                        }
                    }
                }
            }
        },
        //#!#END
        //#!#FUNC_MARKERS
        /**
         * Markers overlay
         * @param {Object} map Map instance
         * @param {Object} opt Markers options
         */
        markers: function (map, opt) {
            var m, opt = !opt ? this.options : opt;
            if (undefined !== opt.marker) {
                if (0 < opt.marker.length) {
                    for (m in opt.marker) {
                        if (_hasOwnProperty(opt.marker, m)) {
                            if (_hasOwnProperty(opt.marker[m], 'addr')) {
                                if ('object' === typeof opt.marker[m].addr) {
                                    if (2 === opt.marker[m].addr.length) {
                                        this.MarkerDirect(opt.marker[m]);
                                    }
                                } else {
                                    this.MarkerByGeocoder(opt.marker[m]);
                                }
                            }
                        }
                    }
                }
            }
        },
        //#!#END
        //#!#FUNC_POLYLINE
        /**
         * Polyline overlay
         * @param {Object} map Map instance
         * @param {Object} opt Polyline options
         */
        DrawPolyline: function (map, opt) {
            var polyline, p, c, coords = [], opt = !opt ? this.options : opt;
            if (undefined !== opt.polyline) {
                if (undefined !== opt.polyline.coords) {
                    for (p in opt.polyline.coords) {
                        if (_hasOwnProperty(opt.polyline.coords, p)) {
                            c = opt.polyline.coords;
                            if (undefined !== c[p]) {
                                coords.push(new google.maps.LatLng(c[p][0], c[p][1]));
                            }
                        }
                    }
                    polyline = new google.maps.Polyline({
                        'path': coords,
                        'strokeColor': opt.polyline.color || '#FF0000',
                        'strokeOpacity': 1.0,
                        'strokeWeight': opt.polyline.width || 2
                    });
                    this._polylines.push(polyline);
                    polyline.setMap(map);
                }
            }
        },
        //#!#END
        //#!#FUNC_POLYGON
        /**
         * Polygon overlay
         * @param {Object} map Map instance
         * @param {Object} opt Polygon options
         */
        DrawPolygon: function (map, opt) {
            var polygon, p, c, coords = [], opt = !opt ? this.options : opt;
            if (undefined !== opt.polygon) {
                if (undefined !== opt.polygon.coords) {
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
                    if ($.isFunction(opt.polygon.click)) {
                        google.maps.event.addListener(polygon, 'click', opt.polygon.click);
                    }
                }
            }
        },
        //#!#END
        //#!#FUNC_CIRCLE
        /**
         * Circle overlay
         * @param {Object} map Map instance
         * @param {Object} opt Circle options
         */
        DrawCircle: function (map, opt) {
            var c, circle, circles, opt = !opt ? this.options : opt;
            if (undefined !== opt.circle && 0 < opt.circle.length) {
                for (c = opt.circle.length - 1; c >= 0; c -= 1) {
                    circle = opt.circle[c];
                    if (undefined !== circle.center.x && undefined !== circle.center.y) {
                        circles = new google.maps.Circle({
                            'strokeColor': circle.color || '#FF0000',
                            'strokeOpacity': circle.opacity || 0.8,
                            'strokeWeight': circle.width || 2,
                            'fillColor': circle.fillcolor || '#FF0000',
                            'fillOpacity': circle.fillopacity || 0.35,
                            'map': this.map,
                            'center': new google.maps.LatLng(circle.center.x, circle.center.y),
                            'radius': circle.radius || 10,
                            'zIndex': 100
                        });
                        this._circles.push(circles);
                        if ($.isFunction(opt.circle[c].click)) {
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
            //#!#CALL_KML
            // kml overlay
            this.kml(this.map);
            //#!#END
            //#!#CALL_DIRECTION
            // direction overlay
            this.direction(this.map);
            //#!#END
            //#!#CALL_MARKERS
            // markers overlay
            this.markers(this.map);
            //#!#END
            //#!#CALL_POLYLINE
            // polyline overlay
            this.DrawPolyline(this.map);
            //#!#END
            //#!#CALL_POLYGON
            // polygon overlay
            this.DrawPolygon(this.map);
            //#!#END
            //#!#CALL_CIRCLE
            // circle overlay
            this.DrawCircle(this.map);
            //#!#END
        },
        //#!#PROTOTYPE_MARKERS
        /**
         * Set a marker directly by latitude and longitude
         * @param {Object} opt Options
         * @this {tinyMap}
         */
        MarkerDirect: function (opt) {
            var self = this,
                marker, label_opt, label,
                markerOptions = {
                    'map': this.map,
                    'position': new google.maps.LatLng(opt.addr[0], opt.addr[1]),
                    'title': opt.text.replace(/<([^>]+)>/g, ''),
                    'infoWindow': new google.maps.InfoWindow({content: opt.text})
                };
            if ('string' === typeof opt.icon) {
                markerOptions.icon = opt.icon;
            }

            marker = new google.maps.Marker(markerOptions);
            this._markers.push(marker);

            // autozoom
            if (_hasOwnProperty(marker, 'position')) {
                if (marker.getPosition().lat() && marker.getPosition().lng()) {
                    self.bounds.extend(markerOptions.position);
                }
            }

            label_opt = {
                map: this.map,
                css: undefined !== opt.css ? opt.css : ''
            };
            if ('string' === typeof opt.label && 0 !== opt.label.length) {
                label_opt.text = opt.label;
            }
            label = new Label(label_opt);
            label.bindTo('position', marker, 'position');
            label.bindTo('text', marker, 'position');
            this._labels.push(label);
            google.maps.event.addListener(marker, 'click', function () {
                marker.infoWindow.open(self.map, marker);
            });
        },
        /**
         * Set a marker by Geocoder service
         * @param {Object} opt Options
         * @this {tinyMap}
         */
        MarkerByGeocoder: function (opt) {
            var geocoder = new google.maps.Geocoder(),
                self = this;
            geocoder.geocode({'address': opt.addr}, function (results, status) {
                // if exceeded limit, then call again;
                if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                    window.setTimeout(function () {
                        self.MarkerByGeocoder(opt);
                    }, this.interval);
                } else if (status === google.maps.GeocoderStatus.OK) {
                    var marker, label_opt, label,
                        markerOptions = {
                            'map': self.map,
                            'position': results[0].geometry.location,
                            'title': opt.text.replace(/<([^>]+)>/g, ''),
                            'infoWindow': new google.maps.InfoWindow({content: opt.text})
                        };
                    if ('string' === typeof opt.icon) {
                        markerOptions.icon = opt.icon;
                    }
                    marker = new google.maps.Marker(markerOptions);
                    self._markers.push(marker);
                    // autozoom
                    if (_hasOwnProperty(marker, 'position')) {
                        if (marker.getPosition().lat() && marker.getPosition().lng()) {
                            self.bounds.extend(markerOptions.position);
                        }
                    }
                    label_opt = {
                        map: self.map,
                        css: opt.css || ''
                    };
                    if ('string' === typeof opt.label && 0 !== opt.label.length) {
                        label_opt.text = opt.label;
                    }
                    label = new Label(label_opt);
                    label.bindTo('position', marker, 'position');
                    label.bindTo('text', marker, 'position');
                    google.maps.event.addListener(marker, 'click', function () {
                        marker.infoWindow.open(self.map, marker);
                    });
                }
            });
        },
        //#!#END
        //#!#PROTOTYPE_DIRECTION
        /**
         * Direction service
         * @param {Object} opt Options
         * @this {tinyMap}
         */
        DirectionService: function (opt) {
            var waypoints = [],
                directionsService = new google.maps.DirectionsService(),
                directionsDisplay = new google.maps.DirectionsRenderer(),
                request = {
                    'travelMode': google.maps.DirectionsTravelMode.DRIVING,
                    'optimizeWaypoints': opt.optimize || false
                },
                i = 0,
                c = 0;
            if ('string' === typeof opt.from) {
                request.origin = opt.from;
            }
            if ('string' === typeof opt.to) {
                request.destination = opt.to;
            }
            if ('string' === typeof opt.travel) {
                if (0 < opt.travel.length) {
                    request.travelMode = google.maps.DirectionsTravelMode[opt.travel.toUpperCase()];
                }
            }
            if (undefined !== opt.waypoint && 0 !== opt.waypoint) {
                for (i = 0, c = opt.waypoint.length; i < c; i += 1) {
                    waypoints.push({
                        'location': opt.waypoint[i].toString(),
                        'stopover': true
                    });
                }
                request.waypoints = waypoints;
            }
            if (undefined !== request.origin && undefined !== request.destination) {
                directionsService.route(request, function (response, status) {
                    if (status === google.maps.DirectionsStatus.OK) {
                        directionsDisplay.setDirections(response);
                    }
                });
                directionsDisplay.setMap(this.map);
                this._directions.push(directionsDisplay);
            }
        },
        //#!#END
        /**
         * tinyMap Initialize
         * @this {tinyMap}
         */
        init: function () {
            var self = this, geocoder;
            loop += 1;
            if ('string' === typeof this.options.center) {
                window.setTimeout(function () {
                    geocoder = new google.maps.Geocoder(), error = $(self.container), msg = '';
                    geocoder.geocode({'address': self.options.center}, function (results, status) {
                        try {
                            if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
                                self.init();
                            } else if (status === google.maps.GeocoderStatus.OK && 0 !== results.length) {
                                self.GoogleMapOptions.center = (status === google.maps.GeocoderStatus.OK && 0 !== results.length) ? results[0].geometry.location : '';
                                self.map = new google.maps.Map(self.container, self.GoogleMapOptions);
                                self.overlay();
                                if (self.options.marker.length && true === self.options.markerFitBounds) {
                                    setTimeout(function () {
                                        self.map.fitBounds(self.bounds);
                                    }, this.interval);
                                }
                            } else {
                                msg = self.options.notfound.text || status;
                                error.html(msg.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
                            }
                        } catch (ignore) {
                            error.html((undefined !== ignore.message ? ignore.message : ignore.description).toString());
                        }
                    });
                }, (this.interval * loop));
            } else {
                self.map = new google.maps.Map(self.container, self.GoogleMapOptions);
                self.overlay();
                if (self.options.marker.length && true === self.options.markerFitBounds) {
                    self.map.fitBounds(self.bounds);
                }
            }
        },
        /**
         * Method: Google Maps PanTo
         * @param {string} addr Text address or "latitude, longitude" format
         * @public
         */
        panto: function (addr) {
            var self = this, latlng, geocoder;
            if (_hasOwnProperty(self, 'map')) {
                if (null !== self.map && undefined !== self.map) {
                    if ('string' === typeof addr) {
                        if (-1 !== addr.indexOf(',')) {
                            latlng = 'loc: ' + addr;
                        }
                        geocoder = new google.maps.Geocoder();
                        geocoder.geocode({'address': addr}, function (results, status) {
                            if (status === google.maps.GeocoderStatus.OK) {
                                if ($.isFunction(self.map.panTo) && undefined !== results[0]) {
                                    self.map.panTo(results[0].geometry.location);
                                }
                            }
                        });
                        return;
                    } else {
                        if ('[object Array]' === Object.prototype.toString.call(addr)) {
                            if (2 === addr.length) {
                                latlng = new google.maps.LatLng(addr[0], addr[1]);
                            }
                        } else if (_hasOwnProperty(addr, 'lat') && _hasOwnProperty(addr, 'lng')) {
                            latlng = new google.maps.LatLng(addr.lat, addr.lng);
                        } else if (_hasOwnProperty(addr, 'x') && _hasOwnProperty(addr, 'y')) {
                            latlng = new google.maps.LatLng(addr.x, addr.y);
                        }
                        if ($.isFunction(self.map.panTo) && undefined !== latlng) {
                            self.map.panTo(latlng);
                        }
                    }
                }
            }
        },
        /**
         * Method: Google Maps clear the specificed layer
         * @param {string} type Layer type (markers, polylines, polygons, circles, kmls, directions)
         * @public
         */
        clear: function (layer) {
            var self = this, layers, label, i, j;
            if ('string' === typeof layer) {
                layers = layer.split(',');
            }
            for (i = 0; i < layers.length; i += 1) {
                label = '_' + $.trim(layers[i].toString().toLowerCase()) + 's';
                if (undefined !== self[label] && self[label].length) {
                    for (j = 0; j < self[label].length; j += 1) {
                        self[label][j].setMap(null);
                    }
                    self[label] = [];
                }
            }
        },
        /**
         * Method:  Google Maps dynamic add layers
         * @param {Object} options Refernce by tinyMap options
         * @public
         */
        modify: function (options) {
            var self = this,
                func = [],
                label = [
                    ['kml', 'kml'],
                    ['marker', 'markers'],
                    ['direction', 'direction'],
                    ['polyline', 'DrawPolyline'],
                    ['polygon', 'DrawPolygon'],
                    ['circle', 'DrawCircle']
                ],
                i;
            
            if (undefined !== options) {
                for (i = 0; i < label.length; i += 1) {
                    if (_hasOwnProperty(options, label[i][0])) {
                        func.push(label[i][1]);
                    }
                }
                if (null !== self.map && undefined !== self.map && func) {
                    for (i = 0; i < func.length; i += 1) {
                        if ('function' === typeof self[func[i]]) {
                            self[func[i]](self.map, options);
                        }
                    }
                }
            }
        }
    };
    /**
     * jQuery tinyMap instance
     * @param {Object} options Plugin settings
     * @public
     */
    $.fn[pluginName] = function (options) {
        var args = arguments, result, instance;
        if ('string' === typeof options) {
            this.each(function () {
                instance = $.data(this, pluginName);
                if (instance instanceof tinyMap && 'function' === typeof instance[options]) {
                    result = instance[options].apply(instance, Array.prototype.slice.call(args, 1));
                }
            });
            return undefined !== result ? result : this;;
        } else {
            return this.each(function () {
                if (!$.data(this, pluginName)) {
                    $.data(this, pluginName, new tinyMap(this, options));
                }
            });
        }
    };
    //#!#END
})(jQuery, window, document);
