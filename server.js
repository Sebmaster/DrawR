var express = require('express');
var fs = require('fs');
var lessMiddleware = require('less-middleware');

var app = express();

app.use(express.bodyParser());
app.use(lessMiddleware({ src: __dirname + '/public', optimization: 2 }));
app.use(express.static(__dirname + '/public', { maxAge: 86400000 }));
app.use(express.staticCache());

var i = 0;

app.post('/post', function(req, res) {
	fs.writeFile(__dirname + '/data_' + (i++) + '.json', req.body.data);
	res.status(200);
	res.end();
});

app.listen(33202);