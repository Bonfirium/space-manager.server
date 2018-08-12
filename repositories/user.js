const model = require('../models/user');

export const createUser = (name, password) => model.create({
	name, password,
});
