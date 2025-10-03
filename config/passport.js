const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcrypt');

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  'secretOrKey': 'mySuperSecretKey123',
  'refreshTokenSecret': 'REFRESH_TOKEN_SECRET'
};

passport.serializeUser(function (user, cb) {
	cb(null, user.id);
});

passport.deserializeUser(function (id, cb) {
	User.findOne({ id }, function (err, users) {
		cb(err, users);
	});
});

passport.use(new LocalStrategy({
	usernameField: 'email',
	passwordField: 'password'
}, function (email, password, cb) {
	AdminUser.findOne({ email: email }, function (err, user) {
		if (err) return cb(err);
		if (!user) return cb(null, false, { message: 'Email address not found' });
		bcrypt.compare(password, user.password, function (err, res) {
			if (!res) return cb(null, false, { message: 'Invalid Password' });
			return cb(null, user, { message: 'Login Succesful' });
		});
	});
}));

passport.use(new JwtStrategy(jwtOptions, function (jwtPayload, done) {
	AdminUser.findOne({ id: jwtPayload.userId }, function (err, user) {
		if (err) {
			return done(err, false);
		}
		if (user) {
			return done(null, user);
		} else {
			return done(null, false);
		}
	});
}));

passport.use('jwt-mobile', new JwtStrategy(jwtOptions, function (jwtPayload, done) {
	User.findOne({ userId: jwtPayload.userId }, function (err, user) {
		if (err) {
			return done(err, false);
		}
		if (user) {
			return done(null, user);
		} else {
			return done(null, false);
		}
	});
}));

module.exports.jwtOptions = jwtOptions;
module.exports.jwt = passport.authenticate('jwt', { session: false });