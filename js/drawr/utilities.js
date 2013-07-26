DrawR.hsvToRgb = function (h, s, v) {
	h = h / 60;
	var i = Math.floor(h);
	var f = h - i;
	var p = v * (1 - s);
	var q = v * (1 - s * f);
	var t = v * (1 - s * (1 - f));
	var rgb;

	switch (i) {
		case 0:
			rgb = { r: v, g: t, b: p };
			break;
		case 1:
			rgb = { r: q, g: v, b: p };
			break;
		case 2:
			rgb = { r: p, g: v, b: t };
			break;
		case 3:
			rgb = { r: p, g: q, b: v };
			break;
		case 4:
			rgb = { r: t, g: p, b: v };
			break;
		case 5:
			rgb = { r: v, g: p, b: q };
			break;
	}

	return rgb;
};

DrawR.rgbToHsv = function (r, g, b) {
	var hsv = { h: 0, s: 0, v: 0 };
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