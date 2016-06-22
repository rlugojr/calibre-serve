const defaultLogger = require('./utils/defaultLogger');
const makeManager = require('./Manager');
const makeServer = require('./Server');
const Server = makeServer.Server;
const connect = makeServer.connect;

makeManager.makeServer = makeServer;
makeManager.Server = Server;
makeManager.defaultLogger = defaultLogger
makeManager.connect = connect;

module.exports = makeManager;