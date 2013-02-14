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
    
    var layer = {
    	ctx: ctx,
    	visible: true,
    	blendMode: 'normal',
    	opacity: 100,
    	canvasData: ctx.createImageData(this.options.width, this.options.height)
	};
    this.layers.splice(idx, 0, layer);
    
    this.refreshLayout();
    
    return layer;
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
			blendMode: this.layers[i].blendMode,
			visibility: this.layers[i].visible ? 'visible' : 'hidden'
		});
	}
};