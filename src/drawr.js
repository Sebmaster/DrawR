/**
 * @constructor
 * @param {HTMLCanvasElement|string|jQuery} surface
 * @param {HTMLCanvasElement|string|jQuery=} globalSurface
 * @param {{width: number, height: number}=} options
 */
function DrawR(surface, globalSurface, options) {
    if (!globalSurface) globalSurface = 'body';

    this.options = /** @type {{width: number, height: number}} */(jQuery.extend(true, {
        width: 2480,
        height: 3508
    }, options));

    this.globalSurface = jQuery(globalSurface);
    this.surface = jQuery(surface);
    /** @type {Array.<DrawR.Layer>} */
    this.layers = [];
	
    this.toggleActive(this.addLayer(0));
	
    this.modifyOperations = {};

    this.drawStyle = {
        Outliner: {
            minLineWidth: 0.5,
            lineWidth: 2
        },
        Brush: {
            minLineWidth: 0.1,
            lineWidth: 5
        },
        Bucket: {

        },
        Line: {
            lineWidth: 5
        },
        Ereaser: {
            lineWidth: 4
        }
    };

    this.bindEvents();
}

/** @typedef {{ctx: CanvasRenderingContext2D, visible: boolean, blendMode: string, opacity: number, canvasData: ImageData}} */
DrawR.Layer;

/**
 * @enum {string}
 */
DrawR.BrushModes = {
	OUTLINER: 'Outliner',
	BRUSH: 'Brush',
	BUCKET: 'Bucket'
};

(function() {
	var y = new Uint32Array([1]);
	var x = new Uint8Array(y.buffer);
	DrawR.littleEndian = x[0] === 1;
})();

DrawR.hsvToRgb = function(h, s, v) {
	h = h / 60;
    var i = Math.floor(h);
    var f = h - i;
    var p = v * (1 - s);
    var q = v * (1 - s * f);
    var t = v * (1 - s * (1 - f));
    var rgb;
    
    switch (i) {
    	case 0:
            rgb = {r: v, g: t, b: p};
    		break;
		case 1:
            rgb = {r: q, g: v, b: p};
    		break;
		case 2:
            rgb = {r: p, g: v, b: t};
    		break;
		case 3:
            rgb = {r: p, g: q, b: v};
    		break;
		case 4:
            rgb = {r: t, g: p, b: v};
    		break;
		case 5:
            rgb = {r: v, g: p, b: q};
    		break;
    }
    
	return rgb;
};

DrawR.rgbToHsv = function(r, g, b) {
    var hsv = {h: 0, s: 0, v: 0};
    if (r === 0 || g === 0 || b === 0) return hsv;
    
    r /= 255; g /= 255; b /= 255;
    
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var delta = max - min;
    
    if (delta === 0) return hsv;
    
    hsv.s = delta / max;
    
    if (max === r) {
        hsv.h = (g - b) / delta;
    } else if (max === g) {
        hsv.h = 2 + (b - r) / delta;
    } else {
        hsv.h = 4 + (r - g) / delta;
    }
    hsv.h *= 60;
    if (hsv.h < 0) hsv.h += 360;
    
    return hsv;
};

/**
 * Defines the color in which the active drawMode draws.
 * @type {string}
 */
DrawR.prototype.foregroundColor = '#000000';
/** @type {DrawR.BrushModes} */
DrawR.prototype.drawMode = DrawR.BrushModes.BRUSH;
/**
 * @private
 * @type {number}
 */
DrawR.prototype.touches = 0;
/**
 * @private
 * @type {number}
 */
DrawR.prototype.rotation = 0;

/**
 * Adds a new layer at the specified index.
 * 
 * @param {number} idx the index to add the layer at
 * @return {DrawR.Layer}
 */
DrawR.prototype.addLayer = function(idx) {
	var startCanvas = jQuery('<canvas>').prop({ width: this.options.width, height: this.options.height });
	
	if (idx === 0) {
    	startCanvas.prependTo(this.surface);
	} else {
    	startCanvas.insertAfter(this.layers[idx - 1].ctx.canvas);
	}

    var ctx = startCanvas[0].getContext('2d');
    ctx.translate(0.5, 0.5);
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    
    var layer = { ctx: ctx, visible: true, blendMode: 'normal', opacity: 100, canvasData: ctx.createImageData(this.options.width, this.options.height) };
    this.layers.splice(idx, 0, layer);
    
    this.refreshLayout();
    
    return layer;
};

/**
 * Toggles the active layer.
 * If the given layer is currently active, it will be set to inactive.
 * 
 * @param {DrawR.Layer} layer the layer to toggle
 */
DrawR.prototype.toggleActive = function(layer) {
    if (this.activeLayer === layer) {
        this.activeLayer = null;
    } else {
        this.activeLayer = layer;
    }
};

DrawR.prototype.moveLayer = function(from, to) {
	if (to > from) {
    	jQuery(this.layers[to].ctx.canvas).after(this.layers[from].ctx.canvas);
	} else {
    	jQuery(this.layers[to].ctx.canvas).before(this.layers[from].ctx.canvas);
	}
    
    var layer = this.layers.splice(from, 1)[0];
    this.layers.splice(to, 0, layer);
};

DrawR.prototype.refreshLayout = function() {
	this.surface.css('transform', 'rotate3d(0, 0, 1, ' + this.rotation + 'deg)');
	
	for (var i=0; i < this.layers.length; ++i) {
		jQuery(this.layers[i].ctx.canvas).css({
			opacity: this.layers[i].opacity / 100,
			MozBlendMode: this.layers[i].blendMode,
			WebkitBlendMode: this.layers[i].blendMode,
			blendMode: this.layers[i].blendMode
		});
	}
};

DrawR.prototype.removeLayer = function (idx) {
    var layer = this.layers.splice(idx, 1)[0];
    jQuery(layer.ctx.canvas).remove();
};

DrawR.prototype.showLayer = function (layer) {
    layer.visible = true;
    jQuery(layer.ctx.canvas).css('visibility', '');
};

DrawR.prototype.hideLayer = function (layer) {
    layer.visible = false;
    jQuery(layer.ctx.canvas).css('visibility', 'hidden');
};

/**
 * Since the touch events only have positions relative to the document,
 * this function is used to transform these coordinates into canvas coordinates.
 * Additionally this function recalculates size differences between the
 * rendering size and the surface size of the canvas.
 * 
 * @private 
 * @param {number} x the x coordinate
 * @return {number} the calculated canvas x-position
 */
DrawR.prototype.transformX = function (x) {
    return Math.round(x * this.options.width / this.surface[0].clientWidth);
};

/**
 * @see {DrawR.prototype.transformX}
 * 
 * @private 
 * @param {number} y the y coordinate
 * @return {number} the calculated canvas y-position
 */
DrawR.prototype.transformY = function (y) {
    return Math.round(y * this.options.height / this.surface[0].clientHeight);
};

/**
 * Binds the necessary events to draw to the canvas and the globalSurface.
 * 
 * This function accounts for browser differences (IE10 <=> all other browsers).
 */
DrawR.prototype.bindEvents = function () {
    var $this = this;

    if (navigator.msPointerEnabled) {
        $this.surface.on('MSPointerDown', function (evt) {
            evt.preventDefault();
            evt = evt.originalEvent;
            $this.touchStart({ x: evt.offsetX, y: evt.offsetY, identifier: evt.pointerId, force: evt['pressure'] });

            $this.globalSurface.one('MSPointerUp MSPointerOut', function (evt) {
                evt = evt.originalEvent;
                $this.touchEnd({ identifier: evt.pointerId });
            });
        });
        $this.globalSurface.on('MSPointerMove', function (evt) {
            evt.preventDefault();
            evt = evt.originalEvent;
            if (!$this.modifyOperations[evt.pointerId]) return;

            $this.touchMove({ identifier: evt.pointerId, x: evt.offsetX, y: evt.offsetY, force: evt['pressure'] });
        });
    } else {
        $this.surface.on('touchstart', function (evt) {
            evt.preventDefault();
            evt = evt.originalEvent;
            var offset = $this.surface.offset();

            for (var i = 0; i < evt.changedTouches.length; ++i) {
                var touch = evt.changedTouches[i];
                $this.touchStart({ x: touch.pageX - offset.left, y: touch.pageY - offset.top, identifier: touch.identifier, force: touch['webkitForce'] || touch.force });
            }

            $this.surface.one('touchend touchleave touchcancel', function (evt) {
                for (var i = 0; i < evt.originalEvent.changedTouches.length; ++i) {
                    $this.touchEnd(evt.originalEvent.changedTouches[i]);
                }
            });
        }).on('mousedown', function (evt) {
            if (evt.which !== 1) return;

            evt.preventDefault();
            $this.touchStart({ x: evt.offsetX, y: evt.offsetY, identifier: -1, force: 0 });

            $this.globalSurface.one('mouseup mouseleave', function (evt) {
                $this.touchEnd({ identifier: -1 });
            });
        });

        $this.globalSurface.on('touchmove', function (evt) {
            evt.preventDefault();
            evt = evt.originalEvent;
            var offset = $this.surface.offset();

            for (var i = 0; i < evt.changedTouches.length; ++i) {
                var touch = evt.changedTouches[i];
                if (!$this.modifyOperations[touch.identifier]) continue;

                $this.touchMove({ x: touch.pageX - offset.left, y: touch.pageY - offset.top, identifier: touch.identifier, force: touch['webkitForce'] || touch.force });
            }
        }).on('mousemove', function (evt) {
            if (!$this.modifyOperations[-1]) return;

            evt.preventDefault();

            $this.touchMove({ x: evt.offsetX, y: evt.offsetY, identifier: -1, force: 0 });
        })
    }
};

DrawR.prototype.load = function(blob, fn) {
	var rd = new FileReader();
	rd.readAsArrayBuffer(blob);
	
	rd.onload = function(e) {
		var arrBuf = e.target.result;
		var stdLengths = new Uint32Array(arrBuf.slice(0, 8));
		var jsonLength = stdLengths[0];
		var layerCount = stdLengths[1];
		
		var layerLengths = new Uint32Array(arrBuf.slice(8, 8 + layerCount * 4));
		var json = JSON.parse(String.fromCharCode.apply(undefined, new Uint16Array(arrBuf.slice(8 + layerCount * 4, 8 + layerCount * 4 + jsonLength))));
		
		var offset = 8 + layerCount * 4 + jsonLength;
		for (var i=0; i < layerCount; ++i) {
			var imageBlob = arrBuf.slice(offset, offset + layerLengths[i]);
			var img = jQuery('<img>').prop('src', URL.createObjectURL(new Blob([imageBlob], {type: 'image/png'})))[0];
			
			var layer = json.layers[i].ctx = jQuery('<canvas>').prop({width: this.options.width, height: this.options.height})[0].getContext('2d');
			
			img.onload = function(layer, img) {
				layer.drawImage(img, 0, 0);
				layer.canvasData = layer.getImageData(0, 0, this.options.width, this.options.height);
			}.bind(this, layer, img);
			
			offset += layerLengths[i];
		}
		
		this.options = json.options;
		this.layers = json.layers;
		
		this.surface.empty();
		for (var i=0; i < this.layers.length; ++i) {
			this.surface.append(this.layers[i].ctx.canvas);
		}
		if (fn) {
			fn();
		}
	}.bind(this);
};

DrawR.prototype.save = function(fn) {
	var options = jQuery.extend(true, {}, this.options);
	
	var canvasData = [];
	
	var lengths = new Uint32Array(this.layers.length + 2);
	
	var finished = 0;
	var layers = [];
	for (var i=0; i < this.layers.length; ++i) {
		layers[i] = jQuery.extend({}, this.layers[i]);
		layers[i].ctx.canvas.toBlob(function(i, blob) {
			canvasData[i] = blob;
			lengths[i + 2] = canvasData[i].size;
		
			layers[i].ctx = null;
			layers[i].canvasData = null;
			
			++finished;
			continueGen();
		}.bind(this, i));
	}
	
	function continueGen() {
		if (finished !== layers.length) return;
		
		var json = JSON.stringify({options: options, layers: layers});
		var buf = new Uint16Array(json.length);
		for (var i=0; i < buf.length; ++i) {
			buf[i] = json.charCodeAt(i);
		}
		
		var json = new Blob([buf], {type: 'application/json'});
		lengths[0] = buf.length * 2;
		
		lengths[1] = layers.length;
		
		var blobArr = [];
		blobArr.push(lengths);
		blobArr.push(json);
		blobArr.push.apply(blobArr, canvasData);
		
		fn(new Blob(blobArr, {type: 'application/x.drawr'}));
	}
};

DrawR.prototype.download = function (fn) {
	var result = jQuery('<canvas>').prop({width: this.options.width, height: this.options.height})[0];
	var ctx = result.getContext('2d');
	for (var i=0; i < this.layers.length; ++i) {
		if (!this.layers[i].visible) continue;

		if (this.layers[i].blendMode === 'normal') {
			ctx.globalCompositeOperation = 'source-over';
		} else {
			ctx.globalCompositeOperation = this.layers[i].blendMode;
		}
		ctx.globalAlpha = this.layers[i].opacity / 100;
		ctx.drawImage(this.layers[i].ctx.canvas, 0, 0);
	}
    result.toBlob(fn.bind(this));
};

DrawR.prototype.draw = function () {
    if (Object.keys(this.modifyOperations).length === 0) return;

    var minX = Number.POSITIVE_INFINITY;
    var minY = Number.POSITIVE_INFINITY;
    var maxX = Number.NEGATIVE_INFINITY;
    var maxY = Number.NEGATIVE_INFINITY;

    for (var i in this.modifyOperations) {
        var dirty = this['determineDirty' + this.drawMode](this.modifyOperations[i], 0);
        minX = Math.min(dirty.minX, minX);
        minY = Math.min(dirty.minY, minY);
        maxX = Math.max(dirty.maxX, maxX);
        maxY = Math.max(dirty.maxY, maxY);
    }

    this.activeLayer.ctx.putImageData(this.activeLayer.canvasData, 0, 0, minX, minY, maxX - minX, maxY - minY);

    for (var i in this.modifyOperations) {
        this['draw' + this.drawMode](this.modifyOperations[i], 0);
    }
	this.mergeCanvas(minX, minY, maxX, maxY);
};

DrawR.prototype.mergeCanvas = function(x, y, w, h) {
	/*x = x || 0;
	y = y || 0;
	w = w || this.options.width;
	h = h || this.options.height;
	
	for (var i=0; i < this.layers.length; ++i) {
		var imageData = this.layers[i].ctx.getImageData(0, 0, this.options.width, this.options.height);
		this.layers[i].tex.loadContentsOf(imageData);
		this.compositeCanvas.draw(this.layers[i].tex);
	}
	this.compositeCanvas.update();*/
};

DrawR.prototype.touchStart = function (touch) {
    if (touch.force === 0) touch.force = 1;
    touch.x = this.transformX(touch.x);
    touch.y = this.transformY(touch.y);
    
    if (touch.x > this.options.width || touch.y > this.options.height) return;

    if (!this.modifyOperations[touch.identifier]) this.modifyOperations[touch.identifier] = [];
    this.modifyOperations[touch.identifier].push(touch);

    this['draw' + this.drawMode](this.modifyOperations[touch.identifier], 0);

    ++this.touches;
};

DrawR.prototype.touchMove = function (touch) {
    if (touch.force === 0) touch.force = 1;
    touch.x = this.transformX(touch.x);
    touch.y = this.transformY(touch.y);

    this.modifyOperations[touch.identifier].push(touch);

    if (this['redrawDirty' + this.drawMode]) {
        requestAnimationFrame(this.draw.bind(this));
    } else {
    	var $this = this;
    	var len = $this.modifyOperations[touch.identifier].length;
    	
   		$this['draw' + $this.drawMode]($this.modifyOperations[touch.identifier], len - 2);
   		
   		var dirty = $this['determineDirty' + $this.drawMode]($this.modifyOperations[touch.identifier], len - 2);
   		$this.mergeCanvas(dirty.minX, dirty.minY, dirty.maxX - dirty.minX, dirty.maxY - dirty.minY);
    }
};

DrawR.prototype.touchEnd = function (touch) {
    if (!this.modifyOperations[touch.identifier]) return;

    --this.touches;
    if (this.touches === 0) {
    	if (this['redrawDirty' + this.drawMode]) {
    		this.draw();
    	}
    	
        this.modifyOperations = {};
        var $this = this;
    	(self.setImmediate || self.setTimeout)(function() {
        	$this.activeLayer.canvasData = $this.activeLayer.ctx.getImageData(0, 0, $this.options.width, $this.options.height);
    	}, 0);
    }
};

/**
 * Returns a blob of a specified image region.
 *  
 * @param {DrawR.Layer} layer the layer to copy from
 * @param {number} x the x coordinate of the region
 * @param {number} y the y coordinate of the region
 * @param {number} width the width coordinate of the region
 * @param {number} height the height coordinate of the region
 * @param {function(Blob)} fn the callback to call with the finished blob
 */
DrawR.prototype.copyImageRegion = function(layer, x, y, width, height, fn) {
	var canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	var ctx = canvas.getContext('2d');
	ctx.drawImage(layer.ctx.canvas, x, y, width, height, 0, 0, width, height);
	canvas.toBlob(fn.bind(this));
};

DrawR.prototype.drawOutliner = function (touchPoints, start) {
    this.activeLayer.ctx.beginPath();

    var lastX = touchPoints[start].x;
    var lastY = touchPoints[start].y;

    this.activeLayer.ctx.moveTo(lastX, lastY);
    for (var j = start + 1; j < touchPoints.length; ++j) {
        this.activeLayer.ctx.lineTo(touchPoints[j].x, touchPoints[j].y);
    }

    this.activeLayer.ctx.strokeStyle = this.foregroundColor;
    this.activeLayer.ctx.lineWidth = this.drawStyle.Outliner.minLineWidth * this.drawStyle.Outliner.lineWidth + (this.drawStyle.Outliner.lineWidth - this.drawStyle.Outliner.minLineWidth * this.drawStyle.Outliner.lineWidth) * touchPoints[start].force;
    this.activeLayer.ctx.lineJoin = this.activeLayer.ctx.lineCap = 'round';
    this.activeLayer.ctx.stroke();
};
DrawR.prototype.redrawDirtyOutliner = false;

DrawR.prototype.determineDirtyOutliner = function (touchPoints, start) {
	var minX = touchPoints[start].x;
	var minY = touchPoints[start].y;
	var maxX = minX;
	var maxY = minY;
	
    for (var j = start + 1; j < touchPoints.length; ++j) {
        minX = Math.min(touchPoints[j].x, minX);
        minY = Math.min(touchPoints[j].y, minY);
        maxX = Math.max(touchPoints[j].x, maxX);
        maxY = Math.max(touchPoints[j].y, maxY);
    }
    
    return {minX: minX - this.drawStyle.Outliner.lineWidth / 2,
    	    minY: minY - this.drawStyle.Outliner.lineWidth / 2,
    	    maxX: maxX + this.drawStyle.Outliner.lineWidth / 2,
    	    maxY: maxY + this.drawStyle.Outliner.lineWidth / 2};
};

DrawR.prototype.drawBrush = function (touchPoints, start) {
    this.activeLayer.ctx.beginPath();

    var lastX = touchPoints[start].x;
    var lastY = touchPoints[start].y;

    this.activeLayer.ctx.moveTo(lastX, lastY);
    for (var j = start; j < touchPoints.length; ++j) {
        this.activeLayer.ctx.lineTo(touchPoints[j].x, touchPoints[j].y);
    }

    this.activeLayer.ctx.strokeStyle = this.foregroundColor;
    this.activeLayer.ctx.lineWidth = this.drawStyle.Brush.minLineWidth * this.drawStyle.Brush.lineWidth + (this.drawStyle.Brush.lineWidth - this.drawStyle.Brush.minLineWidth * this.drawStyle.Brush.lineWidth) * touchPoints[start].force;
    this.activeLayer.ctx.lineJoin = this.activeLayer.ctx.lineCap = 'round';
    this.activeLayer.ctx.stroke();
};

DrawR.prototype.redrawDirtyBrush = false;

DrawR.prototype.determineDirtyBrush = function (touchPoints, start) {
	var lineWidth = this.drawStyle.Brush.minLineWidth * this.drawStyle.Brush.lineWidth + (this.drawStyle.Brush.lineWidth - this.drawStyle.Brush.minLineWidth * this.drawStyle.Brush.lineWidth) * touchPoints[0].force;
	var minX = touchPoints[start].x;
	var minY = touchPoints[start].y;
	var maxX = minX;
	var maxY = minY;
	
    for (var j = start + 1; j < touchPoints.length; ++j) {
        minX = Math.min(touchPoints[j].x, minX);
        minY = Math.min(touchPoints[j].y, minY);
        maxX = Math.max(touchPoints[j].x, maxX);
        maxY = Math.max(touchPoints[j].y, maxY);
    }
    
    return {minX: minX - lineWidth / 2,
    	    minY: minY - lineWidth / 2,
    	    maxX: maxX + lineWidth / 2,
    	    maxY: maxY + lineWidth / 2};
};

DrawR.prototype.drawEreaser = function (touchPoints, start) {
    this.activeLayer.ctx.beginPath();

    var lastX = touchPoints[start].x;
    var lastY = touchPoints[start].y;

    this.activeLayer.ctx.moveTo(lastX, lastY);
    for (var j = start; j < touchPoints.length; ++j) {
        this.activeLayer.ctx.lineTo(touchPoints[j].x, touchPoints[j].y);
    }

    var op = this.activeLayer.ctx.globalCompositeOperation;
    this.activeLayer.ctx.globalCompositeOperation = 'copy';
    this.activeLayer.ctx.lineWidth = this.drawStyle.Ereaser.lineWidth;
    this.activeLayer.ctx.strokeStyle = 'rgba(0, 0, 0, 0)';
    this.activeLayer.ctx.lineJoin = this.activeLayer.ctx.lineCap = 'round';
    this.activeLayer.ctx.stroke();
    this.activeLayer.ctx.globalCompositeOperation = op;
};
DrawR.prototype.redrawDirtyEreaser = false;

DrawR.prototype.determineDirtyEreaser = function (touchPoints, start) {
    var lineWidth = this.drawStyle.Ereaser.lineWidth;
	var minX = touchPoints[start].x;
	var minY = touchPoints[start].y;
	var maxX = minX;
	var maxY = minY;
	
    for (var j = start + 1; j < touchPoints.length; ++j) {
        minX = Math.min(touchPoints[j].x, minX);
        minY = Math.min(touchPoints[j].y, minY);
        maxX = Math.max(touchPoints[j].x, maxX);
        maxY = Math.max(touchPoints[j].y, maxY);
    }
    
    return {minX: minX - lineWidth / 2,
    	    minY: minY - lineWidth / 2,
    	    maxX: maxX + lineWidth / 2,
    	    maxY: maxY + lineWidth / 2};
};

DrawR.prototype.drawLine = function (touchPoints, start) {
    this.activeLayer.ctx.beginPath();
    this.activeLayer.ctx.moveTo(touchPoints[0].x, touchPoints[0].y);
    this.activeLayer.ctx.lineTo(touchPoints[touchPoints.length - 1].x, touchPoints[touchPoints.length - 1].y);
    this.activeLayer.ctx.lineWidth = this.drawStyle.Line.lineWidth;
    this.activeLayer.ctx.lineCap = 'round';
    this.activeLayer.ctx.strokeStyle = this.foregroundColor;
    this.activeLayer.ctx.stroke();
    
    return {minX: touchPoints[0].x,
    	    minY: touchPoints[0].y,
    	    maxX: touchPoints[touchPoints.length - 1].x,
    	    maxY: touchPoints[touchPoints.length - 1].y};
};
DrawR.prototype.redrawDirtyLine = true;

DrawR.prototype.determineDirtyLine = function (touchPoints, start) {
    var minX = touchPoints[0].x;
    var minY = touchPoints[0].y;

    var maxX = minX;
    var maxY = minY;

    for (var i = 1; i < touchPoints.length; ++i) {
        minX = Math.min(touchPoints[i].x, minX);
        minY = Math.min(touchPoints[i].y, minY);
        maxX = Math.max(touchPoints[i].x, maxX);
        maxY = Math.max(touchPoints[i].y, maxY);
    }

    return {
        minX: minX - Math.ceil(this.drawStyle.Line.lineWidth / 2),
        minY: minY - Math.ceil(this.drawStyle.Line.lineWidth / 2),
        maxX: maxX + Math.ceil(this.drawStyle.Line.lineWidth / 2),
        maxY: maxY + Math.ceil(this.drawStyle.Line.lineWidth / 2)
    };
};

DrawR.prototype.drawBucket = function (touchPoints, start) {
    var width = this.options.width;
    var height = this.options.height;

    var col = [0, 0, 0];
    var drawStyle = this.foregroundColor;
    col[0] = parseInt(drawStyle.substr(1, 2), 16);
    col[1] = parseInt(drawStyle.substr(3, 2), 16);
    col[2] = parseInt(drawStyle.substr(5, 2), 16);

    var data = this.activeLayer.canvasData.data;
    if (self.CanvasPixelArray && data instanceof self.CanvasPixelArray) { // IE hack because data is an array
    	data = new Uint8Array(data);
    }
    var target = new Int32Array(data.buffer);
    var finalCol;
    
    if (DrawR.littleEndian) {
		finalCol = (
			(255 << 24) |
			(col[2] << 16) |
			(col[1] << 8) |
			 col[0]
		);
	} else {
		finalCol = (
			255 |
			(col[2] << 8) |
			(col[1] << 16) |
			(col[0] << 24)
		);
	}

    var touchPoint = touchPoints[touchPoints.length - 1];

    var stack = [[touchPoint.x, touchPoint.y]];
    var oldColor = target[touchPoint.x + touchPoint.y * width];

    if (finalCol === oldColor) return;

    var minX = touchPoint.x;
    var minY = touchPoint.y;
    var maxX = minX;
    var maxY = minY;
    var now;

    while (now = stack.shift()) {
        var arrPos = now[0] + now[1] * width;

        var myColor = target[arrPos];

        if (myColor !== oldColor) continue;

        minX = Math.min(now[0], minX);
        minY = Math.min(now[1], minY);
        maxX = Math.max(now[0], maxX);
        maxY = Math.max(now[1], maxY);

        target[arrPos] = finalCol;

        if (now[0] > 0) {
            stack.push([now[0] - 1, now[1]]);
        }
        if (now[0] < this.options.width - 1) {
            stack.push([now[0] + 1, now[1]]);
        }
        if (now[1] > 0) {
            stack.push([now[0], now[1] - 1]);
        }
        if (now[1] < this.options.height - 1) {
            stack.push([now[0], now[1] + 1]);
        }
    }

	if (self.CanvasPixelArray && this.activeLayer.canvasData.data instanceof self.CanvasPixelArray) {
		var backData = this.activeLayer.canvasData.data;
		
		for (var i=minY; i <= maxY + 1; ++i) {
			for (var j=minX; j <= maxX + 1; ++j) {
				var pos = (j + i * width) * 4;
				backData[pos] = data[pos];
				backData[pos + 1] = data[pos + 1];
				backData[pos + 2] = data[pos + 2];
				backData[pos + 3] = data[pos + 3];
			}
		}
	}
    this.activeLayer.ctx.putImageData(this.activeLayer.canvasData, 0, 0, minX, minY, maxX - minX + 1, maxY - minY + 1);
    
    return {minX: minX,
    	    minY: minY,
    	    maxX: maxX,
    	    maxY: maxY};
};
DrawR.prototype.redrawDirtyBucket = false;

DrawR.prototype.determineDirtyBucket = function (touchPoints, start) {
    return null;
};

DrawR.prototype.hsvFilter = function(h, s, v) {
    var imageData = this.activeLayer.canvasData.data;
    
    for (var i=0; i < this.options.width; ++i) {
        for (var j=0; j < this.options.height; ++j) {
            var pos = i * this.options.height + j;
            var hsv = DrawR.rgbToHsv(imageData[pos], imageData[pos + 1], imageData[pos + 2]);
            hsv.h += h;
            hsv.s += s;
            hsv.v += v;
            var rgb = DrawR.hsvToRgb(hsv.h, hsv.s, hsv.v);
            imageData[pos] = rgb.r;
            imageData[pos + 1] = rgb.g;
            imageData[pos + 2] = rgb.b;
        }
    }
    
    this.activeLayer.ctx.putImageData(this.activeLayer.canvasData, 0, 0);
};
