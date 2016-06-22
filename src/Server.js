const makeManager = require('./Manager');
const commandsMap = require('./commandsMap');
const defaultTemplates = require('./templates');

const Manager = makeManager.Manager;


function statusFromErr(err){
	const message = err.message;
	const status = (message == 'no rows' || message == 'wrong url') ? 404 : 500;
	return status;
}

class Server extends Manager{
	constructor(root,directories,onReady){
		super(root,directories,onReady)
	}
	getTemplate(templates,name){
		return templates[name] || templates.default;
	}
	render(res,templates,dbName,command,argument,rows,options){
		const template = this.getTemplate(templates,command);
		const text = template(rows,argument,command,dbName,options);
		res.status(200).send(text);
	}
	error(res,templates,dbName,command,argument,err,options){
		const status = statusFromErr(err);
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

		return function requestHandler(req,res,next){		

			if(!self._ready){
				throw new Error('calling a request handler before the server is ready');
			}

			const url = req.url.replace(/^\/+|\/+$/,'');
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
				return self.error(res,templates,dbName,command,argument,new Error(`wrong url`),options);
			}

			const method = commandsMap[command];

			return self[method](dbName,argument)
				.then(function(rows){
					if(asJson){
						res.status(200).send(rows);
					}else{
						self.render(res,templates,dbName,command,argument,rows,options);
					}
					return rows

				}).catch(function(err){
					if(onErrorNext){ next(err) }
					else if(asJson){
						const message = err.message;
						const error = {error:true,message:message};
						const status = statusFromErr(err);
						res.status(status).send(error);
					}
					else{ self.error(res,templates,dbName,command,argument,err,options); }

					return err;
				})
		}
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