import * as Logger from 'log4js';

// connections
import { connect as connectDb } from './connections/db';
// import io from 'connections/io';

const logger = Logger.getLogger('default1');
console.log(logger.trace);
['info', 'trace', 'debug', 'error', 'fatal'].forEach(one => logger[one]('tests', one));

const initConnections = async () => {
	logger.info('Init connections');
	await connectDb();
};

[
	initConnections,
].reduce((promise, next) => promise.then(next), Promise.resolve());


/**
 * @typedef {Object} DatabaseConfig
 * @property {String} user
 * @property {String} password
 * @property {String} host
 * @property {String} port
 * @property {String} database
 */
