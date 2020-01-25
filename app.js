var express = require('express');
var app = express();
var serv = require('http').Server(app);
var mongoose = require("mongoose");
require('dotenv').config();

/* Database connection */
var MONGO_DB_USERNAME = process.env.MONGO_DB_USERNAME;
var MONGO_DB_PASSWORD = process.env.MONGO_DB_PASSWORD;
const MONGOURI = "mongodb://"+ MONGO_DB_USERNAME +":"+ MONGO_DB_PASSWORD +"@ds011432.mlab.com:11432/multiplayer"

mongoose.connect(MONGOURI,{useUnifiedTopology: true,useNewUrlParser: true },function(error){
	if(error){
		console.log(error);
	} else {
		console.log("Connected to database");
	}
});

var userSchema = new mongoose.Schema({
	username: String,
	password: String
});

var User = mongoose.model("User", userSchema);

/* Routes */

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

var PORT = process.env.PORT || 80

serv.listen(PORT, function() {
	console.log("Server is started");
});

var SOCKET_LIST = {};
var DEBUG = true;

var USERS = {}

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

	self.getDistance = function(toObject) {
		return Math.sqrt(Math.pow(self.x-toObject.x,2) + Math.pow(self.y-toObject.y,2));
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
	self.pressingAttack=false,
	self.mouseAngle = 0,
	self.maxSpeed=10

	var super_update = self.update;
	self.update = function() {
		self.updateSpeed();
		super_update();

		if(self.pressingAttack) {
			self.shootBullet(self.mouseAngle);
		}
	}

	self.shootBullet = function(angle) {
		var b = Bullet(self.id,angle);
		b.x = self.x;
		b.y = self.y;
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
		if(data.inputId === 'attack')
			player.pressingAttack = data.state;
		if(data.inputId === 'mouseAngle')
			player.mouseAngle = data.state;
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

var Bullet = function(parent,angle) {
	var self = Entity();
	self.id = Math.random();
	self.speedX = Math.cos(angle/180*Math.PI) * 10;
	self.speedY = Math.sin(angle/180*Math.PI) * 10;
	self.parent = parent;
	self.timer = 0;
	self.toRemove = false;
	var super_update = self.update;
	self.update = function() {
		if(self.timer++ > 40)
			self.toRemove = true;
		super_update();

		for (var i in Player.list) {
			var p = Player.list[i];
			if(self.getDistance(p) <= 20 && self.parent != p.id ) {
				self.toRemove = true;
				console.log("collision!");
			}
		}
	}

	Bullet.list[self.id] = self;
	return self;
}
Bullet.list = {};

Bullet.update = function() {
	var pack = [];
	for(var i  in Bullet.list) {
		var bullet = Bullet.list[i];
		bullet.update();
		if (bullet.toRemove === true) {
			delete bullet;
		} else {
			pack.push({
				x:bullet.x,
				y:bullet.y,
			});
		}
	}
	return pack;
}

var isValidPassword = function(data,callback) {
User.find({username:data.username,password:data.password},function(error,res){
	if(res.length>0){
		callback(true);
	} else {
		callback(false);
	}
});
}

var isUsernameTaken = function(data,callback) {
	User.find({username:data.username},function(error,res){
		if(res.length>0){
			callback(true);
		} else {
			callback(false);
		}
	});
}

var addUser = function(data,callback) {
	User.create({
		username:data.username,
		password:data.password
	},function(error,data){
		if(error){
			console.log("There was a problem to add new user");
			console.log(error);
			callback(false);
		} else {
			console.log("The user was added:");
			console.log(data);
			callback(true);
		}
	});
}

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket) {
	var sacket = socket; //TODO zachem??
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;
	

	socket.on('disconnect', function(){
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
	});

	socket.on('chatMsgToServ', function(data){
		var playerName = sacket.id;
		var msg = "<div>[" + playerName + "]: " + data + "</div>";
		for(var i in SOCKET_LIST) {
			var socket = SOCKET_LIST[i];
			socket.emit('chatMsgToClient',msg);
		}
	});

	socket.on('evalServer', function(data) {
		if (DEBUG === false)
			return;

		try {
			var res = eval(data);
		} catch(error) {
			res = error.message;
		}
		socket.emit('evalAnswer',res);
	})

	socket.on('signIn', function(data) {
		var success,errorMsg;
		isUsernameTaken(data,function(resUsername){ // resUsername = true || false
			if(resUsername===false){
				success = false;
				errorMsg = "Username " + data.username + " isn't registered yet";
				socket.emit('signInResponse',{success:success,errorMsg:errorMsg});
			} else {
				isValidPassword(data,function(resPass){
					if(resPass==false){
						success = false;
						errorMsg = "The password is not correct";
						socket.emit('signInResponse',{success:success,errorMsg:errorMsg});
					} else {
						Player.onConnect(socket);
						success = true;
						socket.emit('signInResponse',{success:success,errorMsg:errorMsg});
					}
				})
			}
		});
	});

	socket.on('signGuest', function() {
		var success,errorMsg;
		Player.onConnect(socket);
		socket.emit('signGuestResponse',{success:true,errorMsg:errorMsg});
	});

	socket.on('signUp', function(data) {
		var success,errorMsg;
		isUsernameTaken(data,function(resUsername){
			console.log(resUsername);
			if(resUsername==true) {
				success = false;
				errorMsg = "This username's been already used";
				socket.emit('signUpResponse',{success:success,errorMsg:errorMsg});
			} else {
				addUser(data,function(){
					success = true;
					Player.onConnect(socket);
					socket.emit('signUpResponse',{success:success,errorMsg:errorMsg});
				});
			}
		})
		
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