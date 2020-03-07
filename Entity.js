var initPack = {player:[],bullet:[]};
var removePack = {player:[],bullet:[]};

Entity = function(param) {
	var self = {
		x:0,
		y:0,
		speedX:0,
		speedY:0,
		id:'',
		shape:"circle",
		size:10
	}

	if(param){
		if(param.x)
			self.x = param.x;
		if(param.y)
			self.y = param.y;
		if(param.id)
			self.id = param.id;
		if(param.shape)
			self.shape = param.shape;	
		if(param.size)
			self.size = param.size;
	}

	if(self.shape==="circle") {
		self.body = Bodies.circle(self.x,self.y,self.size);
        World.add(world,self.body);
	} else if(self.shape==="rect") {
		self.body = Bodies.rectangle(self.x,self.y,self.size,self.size);
        World.add(world,self.body);
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

Entity.getFrameUpdateData = function() {
	var pack = {
		initPack:{
			player:initPack.player,
			bullet:initPack.bullet
		},
		updatePack:{
			player:Player.update(),
			bullet:Bullet.update()
		},
		removePack:{
			player:removePack.player,
			bullet:removePack.bullet
		},
	}

	initPack.player = [];
	initPack.bullet = [];

	removePack.player = [];
	removePack.bullet = [];

	return pack;
}

Player = function(param) {
	var self = Entity(param);
	self.username = param.username;
	self.socket = param.socket;
	self.globalScore = param.globalScore;
	self.pressingRight=false;
	self.pressingLeft=false;
	self.pressingTop=false;
	self.pressingBottom=false;
	self.pressingAttack=false;
	self.mouseAngle = 0;
	self.touchSpeed = 0.01;
	self.maxSpeed = 10;

	self.canShoot=true;
	self.reloadTime=0;
	self.shootSpeed=10;
	self.hp = 10;
	self.maxHp = 10;
	self.score = 0;

	// var super_update = self.update;
	self.update = function() {
		self.updateSpeed();
		self.updateCoords();
		self.updateReload();
		// super_update();
		self.checkBorders();

		if(self.pressingAttack) {
			self.shootBullet(self.mouseAngle);
		}
	}

	self.checkBorders = function() {
		if(self.x<=0)
			self.body.position.x = 0;
			Body.setVelocity( self.body, {x: 0, y: self.body.velocity.y});
		if(self.x>=worldsize)
			self.body.position.x = worldsize;
			Body.setVelocity( self.body, {x: 0, y: self.body.velocity.y});
		if(self.y<=0)
			self.body.position.y = 0;
			Body.setVelocity( self.body, {x: self.body.velocity.x, y: 0});
		if(self.y>=worldsize)
			self.body.position.y = worldsize;
			Body.setVelocity( self.body, {x: self.body.velocity.x, y: 0});
	}

	self.updateReload = function() {
		if(self.reloadTime<self.shootSpeed) {
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
				y:self.y,
				shape:"bullet"
			});
		}
	}

	self.updateSpeed = function() {
		if (self.pressingTop) {
            if(self.body.velocity.y>=-self.maxSpeed)
                Body.applyForce( self.body, {x: self.body.position.x, y: self.body.position.y}, {x: 0, y: -self.touchSpeed});
        }
        if (self.pressingBottom) {
            if(self.body.velocity.y<=self.maxSpeed)
                Body.applyForce( self.body, {x: self.body.position.x, y: self.body.position.y}, {x: 0, y: self.touchSpeed});
        }
        if (self.pressingLeft) {
            if(self.body.velocity.x>=-self.maxSpeed)
                Body.applyForce( self.body, {x: self.body.position.x, y: self.body.position.y}, {x: -self.touchSpeed, y: 0});
        }
        if (self.pressingRight) {
            if(self.body.velocity.x<=self.maxSpeed)
                Body.applyForce( self.body, {x: self.body.position.x, y: self.body.position.y}, {x: self.touchSpeed, y: 0});
        } 
	}

	self.updateCoords = function() {
		self.x = self.body.position.x;
		self.y = self.body.position.y;
	}

	self.getInitPack = function() {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			username:self.username,
			hp:self.hp,
			maxHp:self.maxHp,
			score:self.score,
			globalScore:self.globalScore
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

Player.onConnect = function(socket,username,globalScore) { // After the successfull auth or guest
	var username = username || "guest";
	var player = Player({
		x:Math.floor(Math.random()*worldsize),
		y:Math.floor(Math.random()*worldsize),
		id:socket.id,
		username:username,
		globalScore:globalScore,
		socket:socket,
		shape:"circle",
		size:14
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

	socket.on('chatMsgToServ', function(data){
		var msg = "<div>[" + username + "]: " + data + "</div>";
		for(var i in Player.list) {
			Player.list[i].socket.emit('chatMsgToClient',msg);
		}
	});

	socket.on('chatPrivateMsgToServ', function(data){
		var recipientSocket = null;
		for(var i in Player.list){
			if(Player.list[i].username===data.username)
				recipientSocket = Player.list[i].socket;
		}
			
		if(recipientSocket===null){
			socket.emit('chatMsgToClient',"<div>There is no player with nickname [" + data.username + "]</div>");
		} else {
			socket.emit('chatMsgToClient',"<div class='private-msg'>To [" + data.username + "]:"+data.message+"</div>");
			recipientSocket.emit('chatMsgToClient',"<div class='private-msg'>From [" + player.username + "]:"+data.message+"</div>");
		}
	});

	socket.emit('init', {
		worldsize:worldsize,
		selfId:socket.id,
		player:Player.getAllInitPack(),
		bullet:Bullet.getAllInitPack()
	})
}
Player.onDisconnect = function(socket) {
	Database.setGlobalScore(Player.list[socket.id],function(){});
	delete Player.list[socket.id];
	removePack.player.push(socket.id);
}

Bullet = function(param) {
	var self = Entity(param);
	self.id = Math.random();
	self.angle = param.angle; 
	self.speedX = Math.cos(param.angle/180*Math.PI) * 20;
	self.speedY = Math.sin(param.angle/180*Math.PI) * 20;
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
					
					p.body.position.x = Math.floor(Math.random()*worldsize);
					p.body.position.y = Math.floor(Math.random()*worldsize);
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