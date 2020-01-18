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

var Entity = function() {
	var self = {
		x:250,
		y:250,
		speedX:0,
		speedY:0,
		id:''
	}

	self.update = function(){
		self.updatePosition();
	}

	self.updatePosition = function() {
		self.x += self.speedX;
		self.y += self.speedY;
	}

	return self;
}

var Player = function(id) {
	var self = Entity();
	self.id = id;
	self.name = Math.floor(Math.random()*10);
	self.pressingRight=false;
	self.pressingLeft=false,
	self.pressingTop=false,
	self.pressingBottom=false,
	self.maxSpeed=10

	var super_update = self.update;
	self.update = function() {
		self.updateSpeed();
		super_update();
	}

	self.updateSpeed = function() {
		if(self.pressingRight)
			self.speedX = self.maxSpeed;
		else if(self.pressingLeft)
			self.speedX = -self.maxSpeed;
		else
			self.speedX = 0;
		if(self.pressingTop)
			self.speedY = -self.maxSpeed;
		else if(self.pressingBottom)
			self.speedY = self.maxSpeed;
		else 
			self.speedY = 0;
	}
	Player.list[id] = self;
	return self;
}

Player.list = {};
Player.onConnect = function(socket) {
	var player = Player(socket.id);
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
}
Player.onDisconnect = function(socket) {
	delete Player.list[socket.id];
}
Player.update = function() {
	var pack = [];
	for(var i  in Player.list) {
		var player = Player.list[i];
		player.update();
		pack.push({
			x:player.x,
			y:player.y,
			name: player.name
		});
	}
	return pack;
}

var Bullet = function(angle) {
	var self = Entity();
	self.id = Math.random();
	self.speedX = Math.cos(angle/180*Math.PI) * 10;
	self.speedY = Math.sin(angle/180*Math.PI) * 10;

	self.timer = 0;
	self.toRemove = false;
	var super_update = self.update;
	self.update = function() {
		if(self.timer++ > 100)
			self.toRemove = true;
		super_update();
	}

	Bullet.list[self.id] = self;
	return self;
}
Bullet.list = {};

Bullet.update = function() {
	if(Math.random()<0.1) {
		Bullet(Math.random()*360);
	}

	var pack = [];
	for(var i  in Bullet.list) {
		var bullet = Bullet.list[i];
		bullet.update();
		pack.push({
			x:bullet.x,
			y:bullet.y,
		});
	}
	return pack;
}

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket) {
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;
	Player.onConnect(socket);

	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
		
	});

});

//=================== GAME LOOP ==============
setInterval(function(){
	var pack = {
		players:Player.update(),
		bullets:Bullet.update()
	}
	
	for(var i  in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.emit('newPositions',pack);
	}

},20);