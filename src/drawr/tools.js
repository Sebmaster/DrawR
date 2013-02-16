DrawR.prototype.drawOutliner = function (touchPoints, start) {
    this.activeLayer.ctx.beginPath();

    this.activeLayer.ctx.moveTo(touchPoints[start].x, touchPoints[start].y);
    for (var j = start + 1; j < touchPoints.length; ++j) {
        this.activeLayer.ctx.lineTo(touchPoints[j].x, touchPoints[j].y);
    }

    this.activeLayer.ctx.strokeStyle = this.foregroundColor;
    this.activeLayer.ctx.lineWidth = this.drawStyle.Outliner.minLineWidth * this.drawStyle.Outliner.lineWidth + (this.drawStyle.Outliner.lineWidth - this.drawStyle.Outliner.minLineWidth * this.drawStyle.Outliner.lineWidth) * touchPoints[start].force;
    this.activeLayer.ctx.lineJoin = this.activeLayer.ctx.lineCap = 'round';
    this.activeLayer.ctx.stroke();
    
    return this.determineDirtyOutliner(touchPoints, start);
};
DrawR.prototype.redrawDirtyOutliner = false;

DrawR.prototype.determineDirtyOutliner = function (touchPoints, start) {
	var lineWidth = Math.ceil(this.drawStyle.Outliner.lineWidth / 2);
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
    
    return {minX: minX - lineWidth,
    	    minY: minY - lineWidth,
    	    maxX: maxX + lineWidth,
    	    maxY: maxY + lineWidth};
};

DrawR.prototype.drawBrush = function (touchPoints, start) {
    this.activeLayer.ctx.beginPath();

    this.activeLayer.ctx.moveTo(touchPoints[start].x, touchPoints[start].y);
    for (var j = start; j < touchPoints.length; ++j) {
        this.activeLayer.ctx.lineTo(touchPoints[j].x, touchPoints[j].y);
    }

    this.activeLayer.ctx.strokeStyle = this.foregroundColor;
    this.activeLayer.ctx.lineWidth = this.drawStyle.Brush.minLineWidth * this.drawStyle.Brush.lineWidth + (this.drawStyle.Brush.lineWidth - this.drawStyle.Brush.minLineWidth * this.drawStyle.Brush.lineWidth) * touchPoints[start].force;
    this.activeLayer.ctx.lineJoin = this.activeLayer.ctx.lineCap = 'round';
    this.activeLayer.ctx.stroke();
    
    return this.determineDirtyBrush(touchPoints, start);
};

DrawR.prototype.redrawDirtyBrush = false;

DrawR.prototype.determineDirtyBrush = function (touchPoints, start) {
	var lineWidth = Math.ceil(this.drawStyle.Brush.minLineWidth * this.drawStyle.Brush.lineWidth + (this.drawStyle.Brush.lineWidth - this.drawStyle.Brush.minLineWidth * this.drawStyle.Brush.lineWidth) * touchPoints[0].force / 2);
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
    
    return {minX: minX - lineWidth,
    	    minY: minY - lineWidth,
    	    maxX: maxX + lineWidth,
    	    maxY: maxY + lineWidth};
};

DrawR.prototype.drawEreaser = function (touchPoints, start) {
    this.activeLayer.ctx.beginPath();

    this.activeLayer.ctx.moveTo(touchPoints[start].x, touchPoints[start].y);
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
    
    return this.determineDirtyEreaser(touchPoints, start);
};
DrawR.prototype.redrawDirtyEreaser = false;

DrawR.prototype.determineDirtyEreaser = function (touchPoints, start) {
    var lineWidth = Math.ceil(this.drawStyle.Ereaser.lineWidth / 2);
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
    
    return {minX: minX - lineWidth,
    	    minY: minY - lineWidth,
    	    maxX: maxX + lineWidth,
    	    maxY: maxY + lineWidth};
};

DrawR.prototype.drawLine = function (touchPoints, start) {
    this.activeLayer.ctx.beginPath();
    this.activeLayer.ctx.moveTo(touchPoints[0].x, touchPoints[0].y);
    this.activeLayer.ctx.lineTo(touchPoints[touchPoints.length - 1].x, touchPoints[touchPoints.length - 1].y);
    this.activeLayer.ctx.lineWidth = this.drawStyle.Line.lineWidth;
    this.activeLayer.ctx.lineCap = 'round';
    this.activeLayer.ctx.strokeStyle = this.foregroundColor;
    this.activeLayer.ctx.stroke();
    
    var lineRadius = Math.ceil(this.drawStyle.Line.lineWidth / 2);
    
    return {minX: Math.min(touchPoints[0].x, touchPoints[touchPoints.length - 1].x) - lineRadius,
    	    minY: Math.min(touchPoints[0].y, touchPoints[touchPoints.length - 1].y) - lineRadius,
    	    maxX: Math.max(touchPoints[0].x, touchPoints[touchPoints.length - 1].x) + lineRadius,
    	    maxY: Math.max(touchPoints[0].y, touchPoints[touchPoints.length - 1].y) + lineRadius};
};
DrawR.prototype.redrawDirtyLine = true;

DrawR.prototype.determineDirtyLine = function (touchPoints, start) {
	var lineWidth = Math.ceil(this.drawStyle.Line.lineWidth / 2);
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
        minX: minX - lineWidth,
        minY: minY - lineWidth,
        maxX: maxX + lineWidth,
        maxY: maxY + lineWidth
    };
};

DrawR.prototype.drawBucket = function (touchPoints, start) {
    var width = this.options.width;
    var height = this.options.height;
	var data;

    var col = [0, 0, 0];
    var drawStyle = this.foregroundColor;
    col[0] = parseInt(drawStyle.substr(1, 2), 16);
    col[1] = parseInt(drawStyle.substr(3, 2), 16);
    col[2] = parseInt(drawStyle.substr(5, 2), 16);

    var origData = this.activeLayer.ctx.getImageData(0, 0, this.options.width, this.options.height);
    if (self.CanvasPixelArray && origData.data instanceof self.CanvasPixelArray) { // IE hack because data is an array
    	data = new Uint8Array(origData.data);
    } else {
    	data = origData.data;
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

    if (finalCol === oldColor) return null;

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

	if (self.CanvasPixelArray && origData.data instanceof self.CanvasPixelArray) {
		for (var i=minY; i <= maxY + 1; ++i) {
			for (var j=minX; j <= maxX + 1; ++j) {
				var pos = (j + i * width) * 4;
				origData[pos] = data[pos];
				origData[pos + 1] = data[pos + 1];
				origData[pos + 2] = data[pos + 2];
				origData[pos + 3] = data[pos + 3];
			}
		}
	}
    this.activeLayer.ctx.putImageData(origData, 0, 0, minX, minY, maxX - minX + 1, maxY - minY + 1);
    
    return {minX: minX,
    	    minY: minY,
    	    maxX: maxX,
    	    maxY: maxY};
};
DrawR.prototype.redrawDirtyBucket = false;

DrawR.prototype.determineDirtyBucket = function (touchPoints, start) {
    return null;
};