/**
	* Node.js chat
	* Copyright (c) 2013 Memo Ma
**/

var express = require('express');
var http = require('http');
var io = require('socket.io');
var app = express();
var redis = require('redis');
var RedisStore = require('connect-redis')(express);
var rClient = redis.createClient();
var sessionStore = new RedisStore({client:rClient});
var cookieParser = express.cookieParser('your secret here');

app.configure(function(){
	app.set('port', 8080);
	app.set('views', __dirname + '/app/server/views');
	app.set('view engine', 'jade');
	app.locals.pretty = true;
//	app.use(express.favicon());
//	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(cookieParser);
	app.use(express.session({store: sessionStore, key: 'jsessionid', secret: 'your secret here' }));
	app.use(express.methodOverride());
	app.use(require('stylus').middleware({ src: __dirname + '/app/public' }));
	app.use(express.static(__dirname + '/app/public'));
});

app.configure('development', function(){
	app.use(express.errorHandler());
});

var server = http.createServer(app
	).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});

io = io.listen(server);

// 输出级别，不输出
io.set('log level', 1);


// 路由
require('./app/server/routers/chat-app')(app);
require('./app/server/router')(app);

// socket-room
require('./app/server/sockets/socket-room')(io, sessionStore, cookieParser);
