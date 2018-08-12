import * as socketIO from 'socket.io';
import * as passportSocketIo from 'passport.socketio';
import * as mongoose from 'mongoose';
import * as session from 'express-session';
import * as connectMongo from 'connect-mongo';
import { getLogger } from 'log4js';

const MongoStore = connectMongo(session);
const userLogger = getLogger('USER');
const sessionLogger = getLogger('SESSION');
const socketLogger = getLogger('SOCKET');

let io = null;
const userConnectionHandlers = new Set();
const userDisconnectionHandlers = new Set();
const socketConnectionHandlers = new Set();
const socketDisconnectionHandlers = new Set();
const connectionsCount = {
	byUser: {},
	bySession: {},
};
const userIdBySession = {};
const sessionSockets = {};

const _openSocket = (socket, sessionId) => {
	socketLogger.trace(`opened ${socket.id}`);
	const userId = userIdBySession[sessionId];
	if (!connectionsCount.byUser[userId]) {
		userLogger.trace(`connected ${userId}`);
		userConnectionHandlers.forEach((handler) => handler(userId));
		connectionsCount.byUser[userId] = 0;
	}
	connectionsCount.byUser[userId] += 1;
	if (!connectionsCount.bySession[sessionId]) {
		sessionLogger.trace(`created ${sessionId}`);
		connectionsCount.bySession[sessionId] = 0;
		userIdBySession[sessionId] = userId;
	}
	if (!sessionSockets[sessionId]) {
		sessionSockets[sessionId] = {};
	}
	sessionSockets[sessionId][socket.id] = socket;
	connectionsCount.bySession[sessionId] += 1;
	socketConnectionHandlers.forEach((handler) => handler(socket, userId));
};

const _closeSocket = (sessionId, socketId) => {
	socketLogger.trace(`closed ${socketId}`);
	const userId = userIdBySession[sessionId];
	delete sessionSockets[sessionId][socketId];
	connectionsCount.bySession[sessionId] -= 1;
	connectionsCount.byUser[userId] -= 1;
	if (!connectionsCount.bySession[sessionId]) {
		closeSession(sessionId);
	}
	socketDisconnectionHandlers.forEach((handler) => handler(userId));
};

export const openChannel = (server) => {
	const sessionStore = new MongoStore({ mongooseConnection: mongoose.connection });
	io = socketIO(server, { transports: ['websocket', 'polling'] });
	io.use(passportSocketIo.authorize({
		key: 'crypto.sid',
		secret: config.session_secret,
		cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
		resave: false,
		saveUninitialized: false,
		rolling: true,
		store: sessionStore,
		success: (data, next) => {
			userIdBySession[data.sessionID] = data.user._id;
			next();
		},
		fail: (data, message, error, accept) => {
			accept();
		},
	}));
	io.on('connection', (socket) => {
		const sessionId = socket.client.request.sessionID;
		_openSocket(socket, sessionId);
		socket.on('disconnect', () => _closeSocket(sessionId, socket.id));
	});
};

export const sendToUser = (id, message, data) => {
	passportSocketIo
		.filterSocketsByUser(io, (user) =>
			user._id !== undefined
			&& user._id.toString() === id.toString())
		.forEach((socket) => {
			socket.emit(message, data);
		});
};

export const closeSession = (sessionId) => {
	if (!Number.isSafeInteger(connectionsCount.bySession[sessionId])) return;
	const userId = userIdBySession[sessionId];
	if (!connectionsCount.bySession[sessionId]) {
		sessionLogger.trace(`broken ${sessionId}`);
		delete connectionsCount.bySession[sessionId];
	}
	if (connectionsCount.byUser[userId] === 0) {
		userLogger.trace(`disconnected ${userId}`);
		delete connectionsCount.byUser[userId];
		userDisconnectionHandlers.forEach((handler) => handler(userId));
	}
	Object.keys(sessionSockets[sessionId]).forEach((socketId) => {
		sessionSockets[sessionId][socketId].disconnect();
	});
	delete sessionSockets[sessionId];
};

export const onUserConnect = (func) => {
	userConnectionHandlers.add(func);
};

export const onUserDisconnect = (func) => {
	userDisconnectionHandlers.add(func);
};

export const onSocketConnect = (func) => {
	socketConnectionHandlers.add(func);
};

export const onSocketDisconnect = (func) => {
	socketDisconnectionHandlers.add(func);
};
