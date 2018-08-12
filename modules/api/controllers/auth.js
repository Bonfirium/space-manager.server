import { closeSession } from '../../../connections/io';

export const init = (addHandler) => {
	// todo add route
	console.log('init');
};

	/**
	 * @param {{email, password}} form
	 * @param req
	 * @param cb
	 */
const login = ({ form, req }, cb) => {
	// this.userRepository.findByEmailAndPassword(form.email, form.password, (findError, User) => {
	// 	if (findError) {
	// 		return cb({
	// 			email: ['Invalid email or password'],
	// 		}, 405);
	// 	}
	// 	return req.logIn(User, (loginErr) => {
	// 		if (loginErr) {
	// 			return cb(loginErr);
	// 		}
	// 		return User.clearObject((err, user) => cb(err, user));
	// 	});
	// });
};

/**
 * @param {{req}} params
 */
const logout = async ({ req }) => {
	closeSession(req.sessionID);
	req.logOut();
};
