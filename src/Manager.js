const path = require('path');
const Promise = require('bluebird');
const DB = require('./DB');
const commandsMap = require('./commandsMap');
const opds = require('opds');
const opdsMap = require('./opdsMap');

class Manager{
	constructor(root,directories,onReady,opts){
		opts = opts || {};
		this._root = root || __dirname;
		this._dbs = {};
		this._ready = false;
		this._url_base = opts.root || '/';
		this._title = opts.title || 'catalog';
		this._author = opts.author || 'anonymous';
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
			throw err;
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
	toOPDS(dbName,id,type,results){
		const {_url_base,_title,_author} = this;
		const transformed = results.map(item=>opdsMap.series(_url_base,dbName,item));
		const xml = typeof id !== 'undefined' && transformed.length == 1 ? 
			opdsMap.page(dbName,_author,transformed[0]) :
			opdsMap.page(dbName,_author,{books:transformed});
		return opds.create(xml);
	}
	getBook(dbName,id){
		return this.db(dbName).getBook(id);
	}
	getBookOPDS(dbName,id){
		const {_url_base,_title,_author} = this;
		return this.db(dbName).getBook(id).then(function(books){
			books = books.map(book=>opdsMap.book(_url_base,dbName,book));
			return opds.create(
				opdsMap.page(_title,_author,{books})
			)
		});
	}
	getTag(dbName,id){
		return this.db(dbName).getTag(id);
	}
	getSeries(dbName,id){
		return this.db(dbName).getSeries(id);
	}
	getSeriesOPDS(dbName,id){
		return this.getSeries(dbName,id)
			.then(results=>this.toOPDS(dbName,id,'series',results))
	}
	getAuthor(dbName,id){
		return this.db(dbName).getAuthor(id);
	}
	getAuthorOPDS(dbName,id){
		const {_url_base,_title,_author} = this;
		return this.getAuthor(dbName,id).then(function(authors){
			authors = authors.map(a=>opdsMap.author(_url_base,dbName,a))
			return opds.create(
				opdsMap.page(_title,_author,{authors})
			);
		});
	}
	get(handle,opds=false){
		if(!handle){return Promise.reject(new Error('no path provided'))};
		const [dbName,command,...args] = handle.split('/');
		if(!this.isValidCommand(command)){
			return Promise.reject(new Error(`\`${command}\` is not a valid command`));
		}
		const commandName = opds ? `${command}OPDS` : command; 
		const method = commandsMap[commandName];
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
	getListOPDS(dbName){
		const {_url_base,_title,_author} = this;
		return this.getList(dbName).then(function(db){
			return opds.create(
				opdsMap.page(_title,_author,opdsMap.root(_url_base,db))
			); 
		})
	}
}

function makeManager(root,directories,onReady){
	const manager = new Manager(root,directories,onReady);
	return manager;
}

makeManager.Manager = Manager;

module.exports = makeManager;