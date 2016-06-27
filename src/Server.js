const makeManager = require('./Manager');
const commandsMap = require('./commandsMap');
const defaultTemplates = require('./templates');
const Manager = makeManager.Manager;
const URL = require('url');

function statusFromErr(err){
	const message = err.message;
	const status = ('status' in err)?
		err.status :
		(message == 'no rows' || message == 'wrong url') ? 404 : 500;
	return status;
}

class Server extends Manager{
	constructor(root,directories,onReady){
		super(root,directories,onReady)
	}
	getTemplate(templates,name){
		return templates[name] || templates.default;
	}
	render(req,res,templates,dbName,command,argument,rows,options){
		if(options && options.json){
			res.status(200).send(rows);
			return;
		}
		if(req.session){
			const authed = {authenticated:!!req.session.token};
			options = Object.assign(authed,options);
		}
		const template = this.getTemplate(templates,command);
		const text = template(rows,argument,command,dbName,options);
		res.status(200).send(text);
	}
	error(req,res,templates,dbName,command,argument,err,options){
		const status = statusFromErr(err);
		if(options && options.json){
			const message = err.message;
			const error = {error:true,message:message};
			res.status(status).send(error);
			return;
		}
		const template = this.getTemplate(templates,'error');
		const text = template(err,status,[command,argument],dbName,options);
		res.status(status).send(text);
	}
	getRequestHandler(options){

		const self = this;
		options = options || {};
		const asJson = !!options.json;
		const templates = Object.assign({},defaultTemplates,options.templates);
		const onErrorNext = options.onErrorNext;
		function errorHandler(err,req,res,next){
			self.error(req,res,templates,null,null,null,err,options);
		}
		function requestHandler(req,res,next){		

			if(!self._ready){
				throw new Error('calling a request handler before the server is ready');
			}
			
			const url = URL.parse(req.url).pathname.replace(/^\/+|\/+$/,'');
			
			let [dbName,command,...args] = url.split('/');
			if(req.query.dbName){dbName = req.query.dbName;}
			if(req.query.command){command = req.query.command;}
			if(req.query.search){args = [req.query.search];}

			command = command || 'list';

			if(dbName == 'list'){
				command = 'list';
				dbName = null;
			}

			const argument = args && args[0] && decodeURIComponent(args.join('/')) || null;

			if(
				!self.isValidCommand(command) ||
				(command !== 'list' && !self.isValidDatabase(dbName))
			){
				if(onErrorNext){return next();}
				return self.error(req,res,templates,dbName,command,argument,new Error(`wrong url`),options);
			}

			const method = commandsMap[command];

			function onError(err){
				if(onErrorNext){ next(err) }
				else{
					self.error(req,res,templates,dbName,command,argument,err,options);
				}
				return err;
			}
			
			function onSuccess(rows){
				self.render(req,res,templates,dbName,command,argument,rows,options);
				return rows;
			}

			return self[method](dbName,argument)
				.then(onSuccess).catch(onError)
		}
		requestHandler.errorHandler = errorHandler;
		return requestHandler;
	}
}

function makeServer(root,directories,onReady){
	const server = new Server(root,directories,onReady);
	return server;
}

function connect(options,onReady){
	const {root} = options;
	const directories = options.databases.map(db=>db.path);
	makeServer(root,directories,function(err,LIB){
		if(err){return onReady(err);}
		const requestHandler = LIB.getRequestHandler(options);
		onReady(null,requestHandler);
	})
}

makeServer.Server = Server;
makeServer.Manager = Manager;
makeServer.connect = connect;
module.exports = makeServer;