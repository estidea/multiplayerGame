var mongoose = require("mongoose");
var bcrypt = require('bcryptjs');
require('dotenv').config();

var salt = bcrypt.genSaltSync(10);

mongoose.set('useFindAndModify', false);

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

userSchema = new mongoose.Schema({
	username: String,
	password: String,
	globalScore: Number
});

userSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

User = mongoose.model("User", userSchema);

Database = {};

Database.isValidPassword = function(data,callback) {
	User.find({username:data.username},function(error,res){
		res[0].comparePassword(data.password, function(err, isMatch) {
	    if (err) throw err;
	    callback(isMatch);
		});
});
}

Database.isUsernameTaken = function(data,callback) {
	User.find({username:data.username},function(error,res){
		if(res.length>0){
			callback(true);
		} else {
			callback(false);
		}
	});
}

Database.addUser = function(data,callback) {
	var passToSave = bcrypt.hashSync(data.password, salt);
	User.create({
		username:data.username,
		password:passToSave,
		globalScore:0
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

Database.getGlobalScore = function(data,callback) {
	User.find({username:data.username},function(error,res){
		if(res.length>0){
			callback(res[0].globalScore);
		} else {
			callback(null);
		}
	});
}

Database.setGlobalScore = function(data,callback) {
	if(!data)
		return;
	User.findOneAndUpdate({username:data.username}, {globalScore:data.globalScore+data.score}, function(error,res){
		if(error){
			callback();
		} else {
			callback();
		}
	});
}