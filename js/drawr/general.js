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
    this.surface = jQuery(surface).on('contextmenu', function() {
    	return false;
    });
    
    /** @type {Array.<DrawR.Layer>} */
    this.layers = [];
	
    this.toggleActive(this.addLayer(0));
	
    this.modifyOperations = {};
    
    /** @type {Array.<Array.<{layer: !DrawR.Layer, data: !Image}>>} */
    this.forwardLog = [];
	var img = document.createElement('canvas');
	img.width = 1;
	img.height = 1;
	this.forwardLog[0] = [{layer: this.activeLayer, img: img}];

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

/** @typedef {{ctx: CanvasRenderingContext2D, visible: boolean, blendMode: string, opacity: number, img: Image}} */
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
DrawR.prototype.forwardLogPtr = 0;
/**
 * @private
 * @type {number}
 */
DrawR.prototype.rotation = 0;

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
            $this.touchStart({ x: evt.offsetX !== undefined ? evt.offsetX : evt.originalEvent.layerX, y: evt.offsetY !== undefined ? evt.offsetY : evt.originalEvent.layerY, identifier: -1, force: 0 });

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
            var x = evt.offsetX !== undefined ? evt.offsetX : evt.originalEvent.layerX;
            var y = evt.offsetY !== undefined ? evt.offsetY : evt.originalEvent.layerY;
            var target = jQuery(evt.target);
            if (!target.is('canvas')) {
                var offset = target.position();
                x -= offset.left;
                y -= offset.top;
            }

            $this.touchMove({ x: x, y: y, identifier: -1, force: 0 });
        })
    }
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

	var op = this.activeLayer.ctx.globalCompositeOperation;
	this.activeLayer.ctx.globalCompositeOperation = 'copy';
    this.activeLayer.ctx.drawImage(this.activeLayer.img, 0,0,this.options.width, this.options.height);
    this.activeLayer.ctx.globalCompositeOperation = op;

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
        this.draw();
    } else {
    	var len = this.modifyOperations[touch.identifier].length;
    	var dirty = this['draw' + this.drawMode](this.modifyOperations[touch.identifier], len - 2);
    	
    	if (dirty !== null) {
   			this.mergeCanvas(dirty.minX, dirty.minY, dirty.maxX - dirty.minX, dirty.maxY - dirty.minY);
    	}
    }
};

DrawR.prototype.touchEnd = function (touch) {
    if (!this.modifyOperations[touch.identifier]) return;

    --this.touches;
    if (this.touches === 0) {
        this.modifyOperations = {};
        
		var img = document.createElement('canvas');
		img.width = this.options.width;
		img.height = this.options.height;
		img.getContext('2d').drawImage(this.activeLayer.ctx.canvas, 0, 0);
		
		this.activeLayer.img = img;
    	var diff = this.forwardLog.length - 1 - this.forwardLogPtr;
    	if (diff !== 0) {
    		this.forwardLog.splice(this.forwardLogPtr + 1, diff);
    	}
    	
		this.forwardLog[this.forwardLog.length] = [{layer: this.activeLayer, img: img}];
		++this.forwardLogPtr;
    }
};

DrawR.prototype.undo = function() {
	if (this.forwardLogPtr !== 0) {
		var logEntry = this.forwardLog[this.forwardLogPtr - 1];
		
		for (var i=0; i < logEntry.length; ++i) {
			if (this.layers.indexOf(logEntry[i].layer) === -1) {
				this.layers.push(logEntry[i].layer);
				this.surface.append(logEntry[i].layer.ctx.canvas);
			}
			var ctx = logEntry[i].layer.ctx;
			var op = ctx.globalCompositeOperation;
			ctx.globalCompositeOperation = 'copy';
			ctx.drawImage(logEntry[i].img, 0, 0, this.options.width, this.options.height);
			ctx.globalCompositeOperation = op;
		}
		
		--this.forwardLogPtr;
	}
};