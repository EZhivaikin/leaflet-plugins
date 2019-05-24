/*
 * L.TileLayer is used for standard xyz-numbered tile layers.
 */

/* global ymaps: true */

L.Yandex = L.Layer.extend({
	includes: L.Evented ? L.Evented.prototype : L.Mixin.Events,

	options: {
		minZoom: 0,
		maxZoom: 18,
		attribution: '',
		opacity: 1,
		traffic: false
	},

	possibleShortMapTypes: {
		schemaMap: 'map',
		satelliteMap: 'satellite',
		hybridMap: 'hybrid',
		publicMap: 'publicMap',
		publicMapInHybridView: 'publicMapHybrid',
		overlay: 'overlay'
	},
	
	_getPossibleMapType: function (mapType) {
		var result = 'yandex#map';
		if (typeof mapType !== 'string') {
			return result;
		}
		for (var key in this.possibleShortMapTypes) {
			if (mapType === this.possibleShortMapTypes[key]) {
				result = 'yandex#' + mapType;
				break;
			}
			if (mapType === ('yandex#' + this.possibleShortMapTypes[key])) {
				result = mapType;
			}
		}
		return result;
	},
	
	// Possible types: yandex#map, yandex#satellite, yandex#hybrid, yandex#publicMap, yandex#publicMapHybrid
	// Or their short names: map, satellite, hybrid, publicMap, publicMapHybrid
	initialize: function (type, options) {
		if (typeof type === 'object') {
			options = type;
			type = options.type;
		}
		L.Util.setOptions(this, options);
		//Assigning an initial map type for the Yandex layer
		this._type = this._getPossibleMapType(type || this.options.type);
	},

	onAdd: function (map, insertAtTheBottom) {
		this._map = map;
		this._insertAtTheBottom = insertAtTheBottom;

		// create a container div for tiles
		this._initContainer();
		this._initMapObject();

		// set up events
		map.on('viewreset', this._reset, this);

		this._limitedUpdate = L.Util.throttle(this._update, 150, this);
		map.on('move', this._update, this);

		map._controlCorners.bottomright.style.marginBottom = '3em';

		this._reset();
		this._update(true);
	},

	onRemove: function (map) {
		this._container.remove();

		this._map.off('viewreset', this._reset, this);

		this._map.off('move', this._update, this);

		if (map._controlCorners) {
			map._controlCorners.bottomright.style.marginBottom = '0em';
		}
	},

	getAttribution: function () {
		return this.options.attribution;
	},

	setOpacity: function (opacity) {
		this.options.opacity = opacity;
		if (opacity < 1) {
			L.DomUtil.setOpacity(this._container, opacity);
		}
	},

	setElementSize: function (e, size) {
		e.style.width = size.x + 'px';
		e.style.height = size.y + 'px';
	},

	_initContainer: function () {
		if (!this._container) {
			var className = 'leaflet-yandex-layer leaflet-map-pane leaflet-pane '
				+ (this.options.overlay ? 'leaflet-overlay-pane' : 'leaflet-tile-pane');
			this._container = L.DomUtil.create('div', className);
			this._container.id = '_YMapContainer_' + L.Util.stamp(this);
			this.setOpacity(this.options.opacity);
		}
		this._map.getContainer().appendChild(this._container);
		this.setElementSize(this._container, this._map.getSize());
	},

	_initMapObject: function () {
		if (this._yandex) return;

		// Check that ymaps.Map is ready
		if (ymaps.Map === undefined) {
			return ymaps.load(['package.map'], this._initMapObject, this);
		}

		// If traffic layer is requested check if control.TrafficControl is ready
		if (this.options.traffic)
			if (ymaps.control === undefined ||
					ymaps.control.TrafficControl === undefined) {
				return ymaps.load(['package.traffic', 'package.controls'],
					this._initMapObject, this);
			}
		//Creating ymaps map-object without any default controls on it
		var map = new ymaps.Map(this._container, {center: [0, 0], zoom: 0, behaviors: [], controls: []});

		if (this.options.traffic)
			map.controls.add(new ymaps.control.TrafficControl({shown: true}));

		if (this.options.overlay) {
			this._type = new ymaps.MapType('overlay', []);
			map.container.getElement().style.background = 'transparent';
		}
		map.setType(this._type);

		this._yandex = map;
		this._update(true);
		
		//Reporting that map-object was initialized
		this.fire('MapObjectInitialized', {mapObject: map});
	},

	_reset: function () {
		this._initContainer();
	},

	_update: function (force) {
		if (!this._yandex) return;
		this._resize(force);

		var center = this._map.getCenter();
		var zoom = this._map.getZoom();
		this._yandex.setCenter([center.lat, center.lng], zoom);
	},

	_resize: function (force) {
		var size = this._map.getSize(), style = this._container.style;
		if (style.width === size.x + 'px' && style.height === size.y + 'px')
			if (force !== true) return;
		this.setElementSize(this._container, size);
		this._yandex.container.fitToViewport();
	}
});

L.yandex = function (type, options) {
	return new L.Yandex(type, options);
};
