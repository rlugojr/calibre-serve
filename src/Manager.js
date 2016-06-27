const path = require('path');
const Promise = require('bluebird');
const DB = require('./DB');
const commandsMap = require('./commandsMap');


class Manager{
	constructor(root,directories,onReady){
		this._root = root || __dirname;
		this._dbs = {};
		this._ready = false;
		const self = this;
		if(directories && directories.length){
			this.setMultiple(directories)
				.then(function(self){
					if(onReady){onReady(null,self);}
					return self;
				}).catch(function(err){
					if(onReady){return onReady(err);}
					throw err;
				})
		}
	}
	set(dbName,setReady){
		const _path = path.join(this._root,dbName,'metadata.db');
		const self = this;
		return DB(dbName,_path).then(LIB=>{
			self._dbs[dbName] = LIB;
			if(setReady){self._ready = true;}
			return self;
		}).catch(function(err){
			return err;
		});
	}
	setMultiple(dbNames){
		const self = this;
		this._ready = false;
		const {length} = dbNames;
		let i = 0;

		let _resolve,_reject;

		const promise = new Promise(function(resolve,reject){
			_resolve = resolve;
			_reject = reject;
		});

		function next(){
			if(i>=length){
				self._ready = true;
				return _resolve(self);
			}
			const dbName = dbNames[i++];
			console.log('parsing:',dbName);
			self.set(dbName).then(next).catch(_reject);
			return true;
		}
		next();

		return promise;
	}
	all(fn){
		const dbs = this._dbs;
		const names = Object.keys(dbs);
		const promises = names.map(dbName=>fn(dbs[dbName],dbName))
		return Promise.all(promises);
	}
	debug(doDebug){
		return this.all(function(db){
			db.debug(doDebug);
			return Promise.resolve(true);
		});
	}
	logger(logger){
		return this.all(function(db){
			db.logger(logger);
			return Promise.resolve(true);
		});
	}
	isValidCommand(command){
		if(!command || !(command in commandsMap)){return false;}
		return true;
	}
	isValidDatabase(dbName){
		if(!this._dbs[dbName]){
			return false;
		}
		return true;
	}
	db(dbName){
		if(!this.isValidDatabase(dbName)){
			throw new Error(`database \`${dbName}\` does not exist`);
		}
		return this._dbs[dbName];
	}
	getBook(dbName,id){
		return this.db(dbName).getBook(id);
	}
	getTag(dbName,id){
		return this.db(dbName).getTag(id);
	}
	getSeries(dbName,id){
		return this.db(dbName).getSeries(id);
	}
	getAuthor(dbName,id){
		return this.db(dbName).getAuthor(id);
	}
	get(handle){
		if(!handle){return Promise.reject(new Error('no path provided'))};
		const [dbName,command,...args] = handle.split('/');
		if(!this.isValidCommand(command)){
			return Promise.reject(new Error(`\`${command}\` is not a valid command`));
		}
		const method = commandsMap[command];
		const argument = args.join('/');
		return this[method](dbName,argument);
	}
	getList(dbName){
		if(dbName){
			if(!this.isValidDatabase(dbName)){
				return Promise.reject(new Error(`${dbName} is not a valid database`));
			}
			const endPoints = this.db(dbName).getList();
			return Promise.resolve(endPoints);
		}
		const self = this;
		const databases = Object.keys(this._dbs).map(function(name){
			return self.db(name).getList();
		});
		return Promise.resolve({
			type:'manager'
		,	databases
		});
	}
}

function makeManager(root,directories,onReady){
	const manager = new Manager(root,directories,onReady);
	return manager;
}

makeManager.Manager = Manager;

module.exports = makeManager;