const mongoose = require('mongoose');

/**
 * @typedef {object} UserModel
 * @property {String} _id
 * @property {String} name
 * @property {String} password
 */

const UserSchema = new mongoose.Schema({
	name: String,
	password: String,
}, {
	timestamps: true,
});

UserSchema.methods.clearObject = function clearObject() {
	const user = this.toJSON();
	delete user.password;
	user.id = user._id.toString();
	delete user._id;
	delete user.__v;
	delete user.updatedAt;
	delete user.createdAt;
	return user;
};

export default mongoose.model('user', UserSchema);
