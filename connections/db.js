import { getLogger } from 'log4js';
import mongoose from 'mongoose';
/** @type {AppConfig} config */
import * as config from 'config';

const logger = getLogger('db.connection');

/**
 * A namespace.
 * @namespace connections
 * @class DbConnection
 */

let url = null;

export const connect = () => {
	logger.trace('Start connect to db');
	const userUrl = (config.db.user) ? (`${config.db.user}:${config.db.password}@`) : '';
	url = `mongodb://${userUrl}${config.db.host}:${config.db.port}/${config.db.database}`;
	mongoose.Promise = global.Promise;
	return mongoose.connect(url, { useMongoClient: true }).then(result => {
		logger.info('DB is connected');
		return result;
	});
};

export const disconnect = () => mongoose.connection.close();

