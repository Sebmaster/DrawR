DrawR.prototype.load = function (blob, fn) {
	var rd = new FileReader();
	rd.readAsArrayBuffer(blob);

	rd.onload = function (e) {
		var arrBuf = e.target.result;
		var stdLengths = new Uint32Array(arrBuf, 0, 2);
		var jsonLength = stdLengths[0];
		var layerCount = stdLengths[1];

		var layerLengths = new Uint32Array(arrBuf, 8, layerCount);
		var json = window.JSON.parse(String.fromCharCode.apply(undefined, new Uint16Array(arrBuf, 8 + layerCount * 4, jsonLength / 2)));

		var forwardLog = [];

		var offset = 8 + layerCount * 4 + jsonLength;
		for (var i = 0; i < layerCount; ++i) {
			var imageBlob = new Blob([new Uint8Array(arrBuf, offset, layerLengths[i])], { type: 'image/png' });
			var img = jQuery('<img>').prop('src', window.URL.createObjectURL(imageBlob))[0];

			json.layers[i].ctx = jQuery('<canvas>').prop({ width: this.options.width, height: this.options.height })[0].getContext('2d');
			json.layers[i].img = img;
			forwardLog[forwardLog.length] = { layer: json.layers[i], img: img };

			img.onload = function (layer) {
				layer.ctx.drawImage(this, 0, 0);
			}.bind(img, json.layers[i]);

			offset += layerLengths[i];
		}

		this.forwardLog[0] = forwardLog;

		this.options = json.options;
		this.layers = json.layers;

		this.surface.empty();
		for (var i = 0; i < this.layers.length; ++i) {
			this.surface.append(this.layers[i].ctx.canvas);
		}

		this.refreshLayout();

		if (fn) {
			fn();
		}
	}.bind(this);
};

DrawR.prototype.save = function (fn) {
	var options = jQuery.extend(true, {}, this.options);

	var canvasData = [];

	var lengths = new Uint32Array(this.layers.length + 2);

	var finished = 0;
	var layers = [];
	for (var i = 0; i < this.layers.length; ++i) {
		layers[i] = jQuery.extend({}, this.layers[i]);
		layers[i].ctx.canvas.toBlob(function (i, blob) {
			canvasData[i] = blob;
			lengths[i + 2] = canvasData[i].size;

			layers[i].ctx = null;
			layers[i].img = null;

			++finished;
			continueGen();
		}.bind(this, i));
	}

	function continueGen() {
		if (finished !== layers.length) return;

		var json = window.JSON.stringify({ options: options, layers: layers });
		var buf = new Uint16Array(json.length);
		for (var i = 0; i < buf.length; ++i) {
			buf[i] = json.charCodeAt(i);
		}

		var jsonBlob = new Blob([buf], { type: 'application/json' });
		lengths[0] = buf.length * 2;

		lengths[1] = layers.length;

		var blobArr = [];
		blobArr.push(lengths);
		blobArr.push(jsonBlob);
		blobArr.push.apply(blobArr, canvasData);

		fn(new Blob(blobArr, { type: 'application/x.drawr' }));
	}
};

DrawR.prototype.download = function (fn) {
	var result = jQuery('<canvas>').prop({ width: this.options.width, height: this.options.height })[0];
	var ctx = result.getContext('2d');
	for (var i = 0; i < this.layers.length; ++i) {
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