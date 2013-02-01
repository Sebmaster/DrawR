var myApp = angular.module('myApp', []);

/**
 * @constructor
 * @param {Object} $scope
 */
function DrawCtrl($scope) {
	var $this = this;
	
	$scope.scalePercent = 25;
	$scope.rotation = 0;
    $scope.hue = 0;

	this.bindEvents($scope);
	this.initSurface($scope);

    $scope.newCanvas = this.initSurface.bind(this, $scope);

    $scope.save = function () {
        $scope.drawR.download(function (blob) {
            window.saveAs(blob, 'img.png');
        });
    };

    $scope.importImage = function () {
        jQuery('<input>').prop('type', 'file').change(function () {
            //console.log(this.files);
        }).click();
    };

    $scope.drawTool = function (tool) {
        $scope.drawR.drawMode = tool;
    };
    
    var changeColor = false;
    $scope.changeColorDown = function(evt) {
    	changeColor = true;
    	$scope.changeColorMove(evt);
    };
    
    $scope.changeColorUp = function() {
    	changeColor = false;
    };
    
    $scope.changeColorMove = function(evt) {
    	if (!changeColor) return;
    	
        var $target = jQuery('#colorpicker .chooser');
        var $pointer = $target.find('.pointer');
        
    	evt.preventDefault();
        var offset = $target.offset();
        offset.left = Math.min(Math.max(0, evt.pageX - offset.left), $target.width());
        offset.top = Math.min(Math.max(0, evt.pageY - offset.top), $target.height());
        
        $pointer.css({top: offset.top + 'px', left: offset.left + 'px'});
        
        $this.changeColor($scope);
    };

    $scope.$watch('hue', function() {
    	$this.changeColor($scope);
    });

    $scope.$watch('drawR.activeLayer.blendMode', function() {
    	$scope.drawR.setLayerCSS($scope.drawR.activeLayer);
    });

    $scope.toggleVisibility = function (layer) {
        if (layer.visible) {
            $scope.drawR.hideLayer(layer);
        } else {
            $scope.drawR.showLayer(layer);
        }
    };

    $scope.select = function (layer) {
        $scope.selectedLayer = layer;
    };

    $scope.addLayer = function () {
        var idx = $scope.drawR.layers.indexOf($scope.selectedLayer) + 1;
		
		var layer = $scope.drawR.addLayer(idx);
		layer.name = 'Untitled 1';
    };

    $scope.remove = function () {
        var i = $scope.drawR.layers.indexOf($scope.selectedLayer);
        $scope.drawR.removeLayer(i);

        if ($scope.activeLayer === $scope.selectedLayer) {
            $scope.activeLayer = $scope.drawR.layers[i > 0 ? i - 1 : i];
        }
        $scope.selectedLayer = $scope.drawR.layers[i > 0 ? i - 1 : i];
    };

    $scope.disableMoveUpLayer = function () {
        return $scope.selectedLayer === $scope.drawR.layers[0];
    };

    $scope.moveUpLayer = function () {
        if ($scope.disableMoveUpLayer()) return;
        
        var i = $scope.drawR.layers.indexOf($scope.selectedLayer);
        $scope.drawR.moveLayer(i, i - 1);
    };

    $scope.disableMoveDownLayer = function () {
        return $scope.selectedLayer === $scope.drawR.layers[$scope.drawR.layers.length - 1];
    };

    $scope.moveDownLayer = function () {
        if ($scope.disableMoveDownLayer()) return;

        var i = $scope.drawR.layers.indexOf($scope.selectedLayer);
        $scope.drawR.moveLayer(i, i + 1);
    };
}
DrawCtrl.$inject = ['$scope'];

DrawCtrl.prototype.bindEvents = function($scope) {
	jQuery(window).on('keydown', function(evt) {
		if (evt.keyCode === 124 && evt.altKey) { // right rotate
			$scope.$apply(function() {
				$scope.rotation += 30;
			});
		} else if (evt.keyCode === 125 && evt.altKey) { // left rotate
			$scope.$apply(function() {
				$scope.rotation -= 30;
			});
		}
	});
};

DrawCtrl.prototype.initSurface = function($scope) {
    $scope.drawR = new DrawR(jQuery('#drawSurface').empty());
    $scope.drawR.layers[0].name = 'Background';

    $scope.selectedLayer = $scope.drawR.layers[0];
};

DrawCtrl.prototype.changeColor = function($scope) {
	var $target = jQuery('#colorpicker .chooser');
    var $pointer = $target.find('.pointer');
	
	var position = $pointer.position();
    var s = position.left / $target.width();
    var v = 1 - position.top / $target.height();
    	
	var rgb = DrawR.hsvToRgb($scope.hue, s, v);
	
	var r = Math.round(rgb.r * 255);
    if (r <= 16) {
    	r = '0' + r.toString(16);
    } else {
    	r = r.toString(16);
    }
    
    var g = Math.round(rgb.g * 255);
    if (g <= 16) {
    	g = '0' + g.toString(16);
    } else {
    	g = g.toString(16);
    }
    
    var b = Math.round(rgb.b * 255);
    if (b <= 16) {
    	b = '0' + b.toString(16);
    } else {
    	b = b.toString(16);
    }

    $scope.drawR.foregroundColor = '#' + r + g + b;
};

window['DrawCtrl'] = DrawCtrl;