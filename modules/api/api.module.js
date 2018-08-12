const logger = require('log4js').getLogger('api.module.js');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo')(session);
const mongoose = require('mongoose');

import config from 'config';
import { init as initAuth } from 'controllers/auth';

export let app = null;
export let server = null;

/** @typedef {('json','file')} ResType */
/** @typedef {('get','post','patch')} Method */



const traceRequest = (req, form) => {
	const traceForm = { ...form };
	['password'].forEach((hiddableField) => {
		if (form[hiddableField]) {
			traceForm[hiddableField] = form[hiddableField].replace(/./ig, '*');
		}
	});
	logger.trace(`${req.method.toUpperCase()} Request ${req.originalUrl}`, JSON.stringify(traceForm));
};

/**
 * @param {Method} method
 * @param {ResType?} responseType
 * @param {String} route
 * @param args
 */
const addRestHandler = (method, responseType, route, ...args) => {
	if (!['json', 'file'].includes(responseType)) {
		args.unshift(route);
		route = responseType;
		responseType = 'json';
	}
	const action = args.pop();
	app[method](route, async (req, res) => {
		try {
			args.forEach((handler) => handler()(req, res));
			traceRequest(req, req.form);
			const result = await action({ form: req.form, user: req.user, req });
			switch (responseType) {
				case 'json':
					return res.status(200).json({
						result: result || null,
						status: 200,
					});
				case 'file':
					return res.send(result);
				default:
					throw new Error('Unknown error');
			}
		} catch (error) {
			let restError = error;
			if (!error.status) {
				logger.error(error);
				restError = { status: 500, message: 'server side error' };
			}
			return res.status(restError.status).json({
				error: restError.details || restError.message,
				status: restError.status,
			});
		}
	});
};

const initRestRoutes = async () => {
	[
		initAuth,
	].forEach(init => { init.bind(null, addRestHandler); });
};

export const close = () => server.close();

/**
 * Start HTTP server listener
 * @return {Promise<void>}
 */
export const initModule = () => new Promise((resolve) => {
	logger.trace('Start HTTP server initialization');

	const sessionStore = new MongoStore({ mongooseConnection: mongoose.connection });

	app = express();
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.json());
	app.use(express.static(path.resolve('public')));

	if (config.cors) {
		const corsOptions = {
			origin: (origin, callback) => {
				callback(null, true);
			},
			credentials: true,
			methods: ['GET', 'PUT', 'POST', 'OPTIONS', 'DELETE', 'PATCH'],
			headers: ['x-user', 'X-Signature', 'accept', 'content-type'],
		};

		app.use(cors(corsOptions));
		app.options('*', cors());
	}

	app.use(session({
		name: 'crypto.sid',
		secret: config.session_secret,
		cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
		resave: false,
		saveUninitialized: false,
		rolling: true,
		store: sessionStore,
	}));
	app.use(passport.initialize());
	app.use(passport.session());

	app.use(express.static('templates/assets'));

	passport.serializeUser((user, done) => done(null, user));
	passport.deserializeUser((user, done) => done(null, user));

	server = app.listen(config.port, () => {
		logger.info(`API APP REST listen ${config.port} Port`);
		initRestRoutes().then(() => resolve());
	});
});