const passport = require('passport');

/**
 * A namespace.
 * @namespace api
 * @class PassportHelper
 */
class PassportHelper {

	/**
	 *
	 * @param {UserRepository} userRepository
	 */
	constructor({ userRepository }) {
		this.userRepository = userRepository;
		this.initialize();
	}

	initialize() {
		passport.serializeUser((user, done) => {
			done(null, user._id);
		});

		passport.deserializeUser((id, done) => {
			this.userRepository.findById(id, '-password', (err, user) => {
				done(err, user);
			});
		});
	}

}

module.exports = PassportHelper;
