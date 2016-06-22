const Promise = require('bluebird');
const sqlite3 = require('sqlite3').verbose();
const Statement = require('./Statement');
const makeWhere = require('./utils/makeWhere');
const propertiesCollapser = require('./utils/propertiesCollapser');
const commandsMap = require('./commandsMap');
const defaultLogger = require('./utils/defaultLogger');
const compose = require('./utils/compose');

const endPoints = Object.keys(commandsMap).map(function(url){
	return {
		name:commandsMap[url]
	,	url:`${url}/`
	}
})

class DB{
	constructor(name,path,db){
		this._db = db;
		this._name = name;
		this._path = path;
		this._debug = false;
		this._logger = null;
	}
	debug(doDebug){
		this._debug = doDebug;
	}
	logger(logger){
		this._logger = logger;
	}
	getLogger(){
		return this._logger || defaultLogger
	}
	log(thing){
		if(!this._debug){return;}
		this.getLogger().log(this._name,thing);
	}
	error(thing){
		if(!this._debug){return;}
		this.getLogger().error(this._name,thing);	
	}
	db(){
		return this._db;
	}
	name(){
		return this._name;
	}
	path(){
		return this._path;
	}
	execute(statement){
		const db = this._db;
		const self = this;
		const {text,values} = statement.toParam();
		this.log(statement.toString());
		return new Promise(function(resolve,reject){
			db.all(text,values,function(err,rows){
				if(err){return reject(err);}
				if(!rows.length){
					const err = new Error('no rows');
					self.error(err);
					return reject(err);
				}
				self.log(rows);
				return resolve(rows);
			});
			
		})
	}
	getBook(book){
		const [where,value] = makeWhere('book',book,'title','_');
		const statement = Statement()
			.bookFields()
			.sumAuthor()
			.sumTags()
			.sumSeries()
			.sumData()
			.appendComments()
			.commentTags()
			.query()
				.from('books')
				.group('book_title')
				.where(where,value)
		;
		return this.execute(statement).then(function(books){
			const collapse = compose(
				propertiesCollapser(books,'tags',/^tag_/)
			,	propertiesCollapser(books,'authors',/^author_/)
			,	propertiesCollapser(books,'series',/^series_/)
			,	propertiesCollapser(books,'data',/^data_/)
			);
			return books.map(collapse);
		})
	}
	getTag(tag){
		const [where,value] = makeWhere('tags',tag);
		const statement = Statement()
			.sumBooks('tag')
			.tagFields()
			.appendBookFromTag()
			.query()
				.from('tag_browser_tags','tags')
				.group('tags.name')
				.where(where,value)
		;
		return this.execute(statement).then(function(series){
			const collapse = propertiesCollapser(series,'books',/^book_/);
			return series.map(collapse);
		})
	}
	getSeries(series){
		const [where,value] = makeWhere('series',series);
		const statement = Statement()
			.sumBooks('series')
			.seriesFields()
			.appendBookFromSeries()
			.query()
				.from('series')
				.group('series.name')
				.where(where,value)
		;
		return this.execute(statement).then(function(series){
			const collapse = propertiesCollapser(series,'books',/^book_/);
			return series.map(collapse);
		})
	}
	getAuthor(author){
		const [where,value] = makeWhere('authors',author);
		const statement = Statement()
			//.bookFields()
			.sumBooks()
			.sumSeries()
			.authorBrowserFields()
			.authorFields()
			//.seriesFields()
			//.sumSeries()
			//.appendSeries()
			.appendAuthorBrowser()
			.appendBookFromAuthor()
			.query()
				.from('authors')
				.group('author_name')
				.where(where,value)
			;
		return this.execute(statement).then(function(authors){
			const collapse = compose(
				propertiesCollapser(authors,'books',/^book_/)
			,	propertiesCollapser(authors,'series',/^series_/)
			);
			return authors.map(collapse);
		})
	}
	getList(){
		return {
			name:this._name
		,	type:'database'
		,	endPoints
		};
	}
}




module.exports = function getDB(name,path){
	return new Promise(function(resolve,reject){	
		const db = new sqlite3.Database(path,sqlite3.OPEN_READONLY,function(err){
			if(err){return reject(err);}

			const Query = new DB(name,path,db);
			return resolve(Query);

		});
	})
}