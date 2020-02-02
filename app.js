var express = require('express');
var app = express();
var serv = require('http').Server(app);

require('./Entity');
require('./Database');


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
var DEBUG = false;

var USERS = {};
worldsize = 2000;


var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket) { // The first connection to the site
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;
	
	socket.on('disconnect', function(){
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
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
		Database.isUsernameTaken(data,function(resUsername){ // resUsername = true || false
			if(resUsername===false){
				success = false;
				errorMsg = "Username " + data.username + " isn't registered yet";
				socket.emit('signInResponse',{success:success,errorMsg:errorMsg});
			} else {
				Database.isValidPassword(data,function(resPass){
					if(resPass==false){
						success = false;
						errorMsg = "The password is not correct";
						socket.emit('signInResponse',{success:success,errorMsg:errorMsg});
					} else {
						Database.getGlobalScore(data,function(resGlobalScore){
							Player.onConnect(socket,data.username,resGlobalScore);
							success = true;
							socket.emit('signInResponse',{success:success,errorMsg:errorMsg});
						});		
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
		Database.isUsernameTaken(data,function(resUsername){
			if(resUsername==true) {
				success = false;
				errorMsg = "This username's been already used";
				socket.emit('signUpResponse',{success:success,errorMsg:errorMsg});
			} else {
				Database.addUser(data,function(){
					success = true;
					Player.onConnect(socket);
					socket.emit('signUpResponse',{success:success,errorMsg:errorMsg});
				});
			}
		})
		
	});
});

//=================== SERVER LOOP ==============
setInterval(function(){
	var pack = Entity.getFrameUpdateData();
	for(var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.emit('init',pack.initPack);
		socket.emit('update',pack.updatePack);
		socket.emit('remove',pack.removePack);
	}

},40);