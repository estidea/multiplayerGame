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

var USERS = {};
var worldsize = 2000;

var Entity = function(param) {
	var self = {
		x:250,
		y:250,
		speedX:0,
		speedY:0,
		id:''
	}

	if(param){
		if(param.x)
			self.x = param.x;
		if(param.y)
			self.y = param.y;
		if(param.id)
			self.id = param.id;
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

var Player = function(param) {
	var self = Entity(param);
	self.name = Math.floor(Math.random()*10);
	self.pressingRight=false;
	self.pressingLeft=false;
	self.pressingTop=false;
	self.pressingBottom=false;
	self.pressingAttack=false;
	self.mouseAngle = 0;
	self.maxSpeed=10;
	self.canShoot=true;
	self.reloadTime=25;
	self.hp = 10;
	self.maxHp = 10;
	self.score = 0;

	var super_update = self.update;
	self.update = function() {
		self.updateSpeed();
		self.updateReload();
		super_update();

		if(self.pressingAttack) {
			self.shootBullet(self.mouseAngle);
		}
	}

	self.updateReload = function() {
		if(self.reloadTime<25) {
			self.reloadTime++;
		} else {
			self.canShoot = true;
		}
		
	}

	self.shootBullet = function(angle) {
		if(self.canShoot) {
			self.reloadTime = 0;
			self.canShoot = false;
			var b = Bullet({
				parent:self.id,
				angle:angle,
				x:self.x,
				y:self.y
			});
		}
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

	self.getInitPack = function() {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			name:self.name,
			hp:self.hp,
			maxHp:self.maxHp,
			score:self.score,
		}
	}

	self.getUpdatePack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			hp:self.hp,
			score:self.score,
		}
	}
	Player.list[self.id] = self;
	initPack.player.push(self.getInitPack());
	return self;
}

Player.list = {};
Player.onConnect = function(socket) {
	var player = Player({
		id:socket.id
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
		if(data.inputId === 'attack')
			player.pressingAttack = data.state;
		if(data.inputId === 'mouseAngle')
			player.mouseAngle = data.state;
	});

	socket.emit('init', {
		worldsize:worldsize,
		selfId:socket.id,
		player:Player.getAllInitPack(),
		bullet:Bullet.getAllInitPack()
	})
}
Player.onDisconnect = function(socket) {
	delete Player.list[socket.id];
	removePack.player.push(socket.id);
}
Player.update = function() {
	var pack = [];
	for(var i  in Player.list) {
		var player = Player.list[i];
		player.update();
		pack.push(player.getUpdatePack());
	}
	return pack;
}

Player.getAllInitPack = function() {
	var players = [];
	for (var i in Player.list) 
		players.push(Player.list[i].getInitPack());
	return players;
}

var Bullet = function(param) {
	var self = Entity(param);
	self.id = Math.random();
	self.angle = param.angle; 
	self.speedX = Math.cos(param.angle/180*Math.PI) * 10;
	self.speedY = Math.sin(param.angle/180*Math.PI) * 10;
	self.parent = param.parent;
	self.timer = 0;
	self.toRemove = false;
	var super_update = self.update;
	self.update = function() {
		if(self.timer++ > 40)
			self.toRemove = true;
		super_update();

		for (var i in Player.list) {
			var p = Player.list[i];
			if(self.getDistance(p) <= 20 && self.parent !== p.id ) {
				p.hp -= 1;
				var shooter = Player.list[self.parent];
				if(shooter) 
					shooter.score += 1;
				if (p.hp <= 0) {
					if(shooter) 
						shooter.score += 10;
					p.hp = p.maxHp;
					p.x = Math.random()*500;
					p.y = Math.random()*500;
				}
				self.toRemove = true;
			}
		}
	}

	self.getInitPack = function() {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
		}
	}

	self.getUpdatePack = function(){
		return {
			id:self.id,
			x:self.x,
			y:self.y,
		}
	}

	initPack.bullet.push(self.getInitPack());
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
			removePack.bullet.push(bullet.id);
			delete Bullet.list[i];
		} else {
			pack.push(bullet.getUpdatePack());
		}
	}
	return pack;
}

Bullet.getAllInitPack = function() {
	var bullets = [];
	for (var i in Bullet.list) 
		bullets.push(Bullet.list[i].getInitPack())
	return bullets
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

var initPack = {player:[],bullet:[]};
var removePack = {player:[],bullet:[]};

//=================== SERVER LOOP ==============
setInterval(function(){
	var pack = {
		player:Player.update(),
		bullet:Bullet.update()
	}
	
	for(var i  in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.emit('init',initPack);
		socket.emit('update',pack);
		socket.emit('remove',removePack);
	}

	initPack.player = [];
	initPack.bullet = [];

	removePack.player = [];
	removePack.bullet = [];


},20);