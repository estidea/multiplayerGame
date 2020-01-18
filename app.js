var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(8080);
console.log("Server is started. Open localhost:8080");

var SOCKET_LIST = {};

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket) {
	socket.id = Math.random();
	socket.x = 0;
	socket.y = 0;
	socket.name = Math.floor(Math.random()*10);
	SOCKET_LIST[socket.id] = socket;

	console.log('New player with id = ' + socket.id + ' has been joined!');

	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
		console.log('Player with id = ' + socket.id + ' has been exited.');
	})
});

setInterval(function(){
	var pack = [];
	for(var i  in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.x++;
		socket.y++;
		pack.push({
			x:socket.x,
			y:socket.y,
			name: socket.name
		});
	}
	for(var i  in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.emit('newPositions',pack);
	}

},20);