//import L from 'leaflet';
import turf from "./myTurf.js";
import "./PaintPolygon.css";

("use strict");
const PaintPolygon = L.Control.extend({
    options: {
        position: "topright",
        radius: 30,
        minRadius: 10,
        maxRadius: 50,
        layerOptions: {
            interactive: false, // if this is true, when touching over existing drawing, it will trigger map pan or pull-to-refresh of android
        },
        drawOptions: {
            weight: 1,
            interactive: false, // if this is true, when touching over existing drawer circle, it will trigger map pan or pull-to-refresh of android
        },
        eraseOptions: {
            color: "#ff324a",
            weight: 1,
            interactive: false, // if this is true, when touching over existing eraser circle, it will trigger map pan or pull-to-refresh of android
        },
        menu: {
            drawErase: true,
            size: true,
            eraseAll: true,
            savgeAll: true,
        },
    },

    _latlng: [0, 0],
    _metersPerPixel: {},

    onAdd: function (map) {
        this._map = map;
        this.setRadius(this.options.radius);

        if (this.options.menu === false) {
            return L.DomUtil.create("div");
        }

        this._container = L.DomUtil.create(
            "div",
            "leaflet-control-paintpolygon leaflet-bar leaflet-control"
        );
        this._createMenu();

        return this._container;
    },

    onRemove: function () {
        this._map.off("mousemove", this._onMouseMove, this);
    },

    setRadius: function (radius) {
        if (radius !== undefined) {
            if (radius < this.options.minRadius) {
                this._radius = this.options.minRadius;
            } else if (radius > this.options.maxRadius) {
                this._radius = this.options.maxRadius;
            } else {
                this._radius = radius;
            }
        }
        if (this._circle) {
            this._circle.setRadius(this._radius);
        }
    },
    startDraw: function () {
        this.stop();
        this._action = "draw";
        this._addMouseListener();
        this._circle = L.circleMarker(this._latlng, this.options.drawOptions)
            .setRadius(this._radius)
            .addTo(this._map);
    },
    startErase: function () {
        this.stop();
        this._action = "erase";
        this._addMouseListener();
        this._circle = L.circleMarker(this._latlng, this.options.eraseOptions)
            .setRadius(this._radius)
            .addTo(this._map);
    },
    stop: function () {
        this._action = null;
        if (this._circle) {
            this._circle.remove();
        }
        this._removeMouseListener();
    },
    getLayer: function () {
        return this._layer;
    },
    setData: function (data) {
        this._data = data;
        if (this._layer !== undefined) {
            this._layer.remove();
        }
        this._layer = L.geoJSON(this._data, this.options.layerOptions).addTo(
            this._map
        );
    },
    getData: function () {
        return this._data;
    },
    eraseAll: function () {
        this.setData();
    },
    saveAll: function () {
        let data = JSON.stringify(this._data);

        // Convert the text to BLOB.
        const textToBLOB = new Blob([data], { type: "text/plain" });
        const sFileName = "map.json"; // The file to save the data.

        let newLink = document.createElement("a");
        newLink.download = sFileName;

        if (window.webkitURL != null) {
            newLink.href = window.webkitURL.createObjectURL(textToBLOB);
        } else {
            newLink.href = window.URL.createObjectURL(textToBLOB);
            newLink.style.display = "none";
            document.body.appendChild(newLink);
        }

        newLink.click();
    },

    /////////////////////////
    // Menu creation and click callback
    _createMenu: function () {
        if (this.options.menu.drawErase !== false) {
            this._iconDraw = L.DomUtil.create(
                "a",
                "leaflet-control-paintpolygon-icon leaflet-control-paintpolygon-icon-brush",
                this._container
            );
            this._iconErase = L.DomUtil.create(
                "a",
                "leaflet-control-paintpolygon-icon leaflet-control-paintpolygon-icon-eraser",
                this._container
            );
            L.DomEvent.on(
                this._iconDraw,
                "click mousedown",
                this._clickDraw,
                this
            );
            L.DomEvent.on(
                this._iconErase,
                "click mousedown",
                this._clickErase,
                this
            );
        }

        if (this.options.menu.size !== false) {
            this._iconSize = L.DomUtil.create(
                "a",
                "leaflet-control-paintpolygon-icon leaflet-control-paintpolygon-icon-size",
                this._container
            );

            this._menu = L.DomUtil.create(
                "div",
                "leaflet-bar leaflet-control-paintpolygon-menu",
                this._container
            );
            L.DomEvent.disableClickPropagation(this._menu);

            var menuContent = L.DomUtil.create(
                "div",
                "leaflet-control-paintpolygon-menu-content",
                this._menu
            );
            var cursor = L.DomUtil.create("input", "", menuContent);
            cursor.type = "range";
            cursor.value = this._radius;
            cursor.min = this.options.minRadius;
            cursor.max = this.options.maxRadius;

            L.DomEvent.on(cursor, "input change", this._cursorMove, this);
            L.DomEvent.on(
                this._iconSize,
                "click mousedown",
                this._clickSize,
                this
            );
        }

        if (this.options.menu.eraseAll !== false) {
            this._iconEraseAll = L.DomUtil.create(
                "a",
                "leaflet-control-paintpolygon-icon leaflet-control-paintpolygon-icon-trash",
                this._container
            );
            L.DomEvent.on(
                this._iconEraseAll,
                "click mousedown",
                this._clickEraseAll,
                this
            );
        }
        if (this.options.menu.saveAll !== false) {
            this._iconSaveAll = L.DomUtil.create(
                "a",
                "leaflet-control-paintpolygon-icon leaflet-control-paintpolygon-icon-save",
                this._container
            );
            L.DomEvent.on(
                this._iconSaveAll,
                "click mousedown",
                this._clickSaveAll,
                this
            );
        }
        if (this.options.menu.load !== false) {
            
            this._iconLoad = L.DomUtil.create(
                "div",
                "leaflet-control-paintpolygon-icon-load",
                this._container
            );
            var imageUpload = L.DomUtil.create(
                "div",
                "image-upload",
                this._iconLoad
            );
            var inputLabel = L.DomUtil.create(
                "label",
                "input-label",
                imageUpload
            );
            inputLabel.setAttribute("for", "file-input");
            var iconImg = L.DomUtil.create(
                "img",
                "",
                inputLabel
            );
            iconImg.setAttribute("src", "src/load.png");
            var fileInput = L.DomUtil.create(
                "input",
                "",
                imageUpload
            );
            fileInput.setAttribute("id", "file-input");
            fileInput.setAttribute("accept", ".json");
            fileInput.setAttribute("type", "file");
            L.DomEvent.on(fileInput, "input change", this._loadMap, this);
            
            // L.DomEvent.on(
            //     this._inputLabel,
            //     "click mousedown",
            //     this._clickLoad,
            //     this
            // );
            // <div class="image-upload">
            //     <label class="input-label" for="file-input">
            //         <img src="src/load.png" />
            //     </label>
            //     <input id="file-input" type="file" accept=".json"/>
            // </div>
        }
    },

    _clickDraw: function (evt) {
        if (evt.type == "mousedown") {
            L.DomEvent.stop(evt);
            return;
        }
        this._resetMenu();
        if (this._action == "draw") {
            this.stop();
        } else {
            this.startDraw();
            this._activeIconStyle(this._iconDraw);
        }
    },
    _clickErase: function (evt) {
        if (evt.type == "mousedown") {
            L.DomEvent.stop(evt);
            return;
        }
        this._resetMenu();
        if (this._action == "erase") {
            this.stop();
        } else {
            this.startErase();
            this._activeIconStyle(this._iconErase);
        }
    },
    _clickSize: function (evt) {
        if (evt.type == "mousedown") {
            L.DomEvent.stop(evt);
            return;
        }
        if (
            L.DomUtil.hasClass(
                this._menu,
                "leaflet-control-paintpolygon-menu-open"
            )
        ) {
            this._closeMenu();
        } else {
            this._openMenu();
        }
    },
    _clickEraseAll: function (evt) {
        this.eraseAll();
    },
    _clickSaveAll: function (evt) {
        this.saveAll();
    },
    _resetMenu: function () {
        L.DomUtil.removeClass(
            this._iconDraw,
            "leaflet-control-paintpolygon-icon-active"
        );
        L.DomUtil.removeClass(
            this._iconErase,
            "leaflet-control-paintpolygon-icon-active"
        );
    },
    _activeIconStyle: function (icon) {
        L.DomUtil.addClass(icon, "leaflet-control-paintpolygon-icon-active");
    },
    _openMenu: function () {
        L.DomUtil.addClass(
            this._menu,
            "leaflet-control-paintpolygon-menu-open"
        );
    },
    _closeMenu: function () {
        L.DomUtil.removeClass(
            this._menu,
            "leaflet-control-paintpolygon-menu-open"
        );
    },
    _cursorMove: function (evt) {
        this.setRadius(evt.target.valueAsNumber);
    },
    _loadMap: function (evt) {
        try {
            let files = evt.target.files;
            if (!files.length) {
                alert('No file selected!');
                return;
            }
            let file = files[0];
            let reader = new FileReader();
            const self = this;
            reader.onload = (event) => {
                this.setData(JSON.parse(event.target.result));
            };
            reader.readAsText(file);
        } catch (err) {
            console.error(err);
        }
        //console.log('loading');
    },
    /////////////////

    ////////////////
    // Map events

    _addMouseListener: function () {
        if (L.Browser.mobile) {
            console.log("mobile");
            const mapDiv = this._map.getContainer();
            L.DomEvent.addListener(
                mapDiv,
                "touchstart",
                this._onTouchStart,
                this
            );
            L.DomEvent.addListener(
                mapDiv,
                "touchmove",
                this._onTouchMove,
                this
            );
            L.DomEvent.addListener(mapDiv, "touchend", this._onTouchEnd, this);
        } else {
            console.log("desktop");
            this._map.on("mousemove", this._onMouseMove, this);
            this._map.on("mousedown", this._onMouseDown, this);
            this._map.on("mouseup", this._onMouseUp, this);
        }
    },
    _removeMouseListener: function () {
        if (L.Browser.mobile) {
            const mapDiv = this._map.getContainer();
            L.DomEvent.removeListener(
                mapDiv,
                "touchstart",
                this._onTouchStart,
                this
            );
            L.DomEvent.removeListener(
                mapDiv,
                "touchmove",
                this._onTouchMove,
                this
            );
            L.DomEvent.removeListener(
                mapDiv,
                "touchend",
                this._onTouchEnd,
                this
            );
        } else {
            this._map.off("mousemove", this._onMouseMove, this);
            this._map.off("mousedown", this._onMouseDown, this);
            this._map.off("mouseup", this._onMouseUp, this);
        }
    },
    _onMouseDown: function (evt) {
        this._map.dragging.disable();
        this._mousedown = true;
        this._onMouseMove(evt);
    },
    _onMouseMove: function (evt) {
        this._setLatLng(evt.latlng);
        if (this._mousedown === true) {
            this._stackEvt(
                evt.latlng,
                this._map.getZoom(),
                this._radius,
                this._action
            );
        }
    },
    _onMouseUp: function (evt) {
        this._map.dragging.enable();
        this._mousedown = false;
    },

    _onTouchStart: function (evt) {
        L.DomEvent.stop(evt); // Very important to prevent dragging and panning the map
        const mapDiv = this._map.getContainer();
        if (evt.target !== mapDiv) return; // to prevent drawing when dragging overlay marker or so

        this._mousedown = true;
        this._onTouchMove(evt);
    },
    _onTouchMove: function (evt) {
        L.DomEvent.stop(evt); // Very important to prevent dragging and panning the map
        const mapDiv = this._map.getContainer();
        if (evt.target !== mapDiv) return; // to prevent drawing when dragging overlay marker or so

        const latlng = this._map.mouseEventToLatLng(evt.touches.pop());
        this._setLatLng(latlng);
        if (this._mousedown === true) {
            this._stackEvt(
                latlng,
                this._map.getZoom(),
                this._radius,
                this._action
            );
        }
    },
    _onTouchEnd: function (evt) {
        L.DomEvent.stop(evt); // Very important to prevent dragging and panning the map
        this._mousedown = false;
    },

    ////////////////

    _setLatLng: function (latlng) {
        if (latlng !== undefined) {
            this._latlng = latlng;
        }
        if (this._circle) {
            this._circle.setLatLng(this._latlng);
        }
    },

    _latLngAsGeoJSON: function (latlng) {
        return {
            type: "Point",
            coordinates: [latlng.lng, latlng.lat],
        };
    },

    _getCircleAsPolygon: function (latlng, zoom, radius) {
        var lat = latlng.lat;

        if (this._metersPerPixel[zoom] === undefined) {
            this._metersPerPixel[zoom] =
                (40075016.686 * Math.abs(Math.cos((lat * Math.PI) / 180))) /
                Math.pow(2, zoom + 8);
        }

        let circle = null;
        try {
            circle = turf.circle(
                this._latLngAsGeoJSON(latlng),
                (this._metersPerPixel[zoom] * radius) / 1000,
                {
                    //steps: 128
                }
            );
        } catch (err) {
            console.log(err);
        }

        return circle;
    },

    _draw: function (latlng, zoom, radius) {
        if (this._data === undefined || this._data === null) {
            this.setData(this._getCircleAsPolygon(latlng, zoom, radius));
        } else {
            let fc = {
                type: "FeatureCollection",
                features: [
                    this._data,
                    this._getCircleAsPolygon(latlng, zoom, radius),
                ],
            };

            try {
                this.setData(turf.union(fc));
            } catch (err) {
                console.log(err);
            }
        }
    },
    _erase: function (latlng, zoom, radius) {
        if (this._data === undefined || this._data === null) {
            return;
        } else {
            try {
                this.setData(
                    turf.difference(
                        this._data,
                        this._getCircleAsPolygon(latlng, zoom, radius)
                    )
                );
            } catch (err) {
                console.log(err);
            }
        }
    },

    _stackEvt: function (latlng, zoom, radius, action) {
        if (this._stack === undefined) {
            this._stack = new Array();
        }

        this._stack.push({
            latlng: latlng,
            zoom: zoom,
            radius: radius,
            action: action,
        });
        this._processStack();
    },

    _processStack: function () {
        if (this._processingStack === true || this._stack.length == 0) {
            return;
        }
        this._processingStack = true;

        var evt = this._stack.shift();
        if (evt.action == "draw") {
            this._draw(evt.latlng, evt.zoom, evt.radius);
        } else if (evt.action == "erase") {
            this._erase(evt.latlng, evt.zoom, evt.radius);
        }

        this._processingStack = false;
        this._processStack();
    },
});

L.Control.PaintPolygon = PaintPolygon;
L.control.paintPolygon = (options) => new L.Control.PaintPolygon(options);

export default PaintPolygon;
