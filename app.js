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
var PLAYER_LIST = {};

var Player = function(id) {
	var self = {
		x:250,
		y:250,
		id:id,
		name:Math.floor(Math.random()*10),
		pressingRight:false,
		pressingLeft:false,
		pressingTop:false,
		pressingBottom:false,
		maxSpeed:10
	}

	self.updatePosition = function() {
		if(self.pressingRight)
			self.x += self.maxSpeed;
		if(self.pressingLeft)
			self.x -= self.maxSpeed;
		if(self.pressingTop)
			self.y -= self.maxSpeed;
		if(self.pressingBottom)
			self.y += self.maxSpeed;
	}
	return self;
}

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket) {
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;

	var player = Player(socket.id);
	PLAYER_LIST[socket.id] = player;

	console.log('New player with id = ' + socket.id + ' has been joined!');

	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
		delete PLAYER_LIST[socket.id];
		console.log('Player with id = ' + socket.id + ' has been left.');
	});

	socket.on('keyPress',function(data){
		if(data.inputId === 'right')
			player.pressingRight = data.state;
		if(data.inputId === 'left')
			player.pressingLeft = data.state;
		if(data.inputId === 'top')
			player.pressingTop = data.state;
		if(data.inputId === 'bottom')
			player.pressingBottom = data.state;
	});
});

setInterval(function(){
	var pack = [];
	for(var i  in PLAYER_LIST) {
		var player = PLAYER_LIST[i];
		player.updatePosition();
		pack.push({
			x:player.x,
			y:player.y,
			name: player.name
		});
	}
	for(var i  in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.emit('newPositions',pack);
	}

},20);