var express = require('express');
var bcrypt = require('bcryptjs');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var csrf = require('csurf');
var sessions = require('client-sessions');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

//connect to mongo
mongoose.connect('mongodb://localhost/newauth');

var User = mongoose.model('User', new Schema({
	id: ObjectId,
	firstName: String,
	lastName: String,
	email: { type: String, unique: true },
	password: String
}));

var app = express();
app.set('view engine', 'jade');
app.locals.pretty = true;

//Middleware
app.use(bodyParser.urlencoded({extended: true}));
app.use(sessions({
	cookieName: 'session',
	secret: 'fsdfauoijldfgf8sakdjakskgfumzph322',
	duration: 30 * 60 * 1000,
	activeDuration: 5 * 60 * 1000,
	httpOnly: true // Don't let browser javascript access cookies ever
	secure: true // Only use cookies over https
	ephemeral: true // delete this cookie when the browser is closed
}));

app.use(function(req, res, next){
	if(req.session && req.session.user){
		User.findOne({email: req.session.user.email}, function(err, user){
			if(user){
				req.user = user;
				delete req.user.password;
				req.session.user = user;
				res.locals.user = user
			}
			next(); 
		});
	} else {
		next();
	}
});

app.use(csrf());

function requireLogin(req, res, next){
	if(!req.user){
		res.redirect('login');
	} else {
		next();
	}
}

app.get('/', function(req, res){
	res.render('index.jade');
});

app.get('/register', function(req, res){
	res.render('register.jade', {csrfToken: req.csrfToken()});
});

app.post('/register', function(req, res){
	var hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(18));
	var user = new User({
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		email: req.body.email,
		password: hash
	});

	user.save(function(err){
		if(err){
			var error = 'Something bad happened';

			if(err.code == 11000){
				error = 'That email is already registered, try another one';
			}
			
			res.render('register.jade', {error: error});
		} else{
			res.redirect('/dashboard');
		}
	});
});

app.get('/login', function(req, res){
	res.render('login.jade', {csrfToken: req.csrfToken()});
});

app.post('/login', function(req, res){
	User.findOne({ email: req.body.email}, function(err, user){
		if(!user){
			res.render('login.jade', {error: 'Invalid email or password'});
		}else{
			if(bcrypt.compareSync(req.body.password, user.password)){
				req.session.user = user;
				res.redirect('/dashboard');
			}else{
				res.render('login.jade', {error: 'Invalid email or password'});	
			}
		}
	});
});

app.get('/dashboard', requireLogin, function(req, res){
	res.render('dashboard.jade');
});

app.get('/logout', function(req, res){
	req.session.reset();
	res.redirect('/');
});

app.listen(3000);