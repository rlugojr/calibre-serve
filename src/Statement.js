const squel = require("squel");

function _concat(t1,t2,link,prop,fields,sep='|'){
	const [f1,f2] = fields;
	const c = `${t1}_${prop}`;
	return `(SELECT GROUP_CONCAT(${c}, '${sep}') FROM (SELECT DISTINCT ${t1}.${prop} ${c} FROM ${link} JOIN ${t1} ON ${link}.${f1} = ${t1}.id WHERE ${link}.${f2} = ${t2}.id))`;
}

function concat_simple(t,t2,f,prop,distinct=true){
	distinct = distinct ? ' DISTINCT' :'';
	const c = `${t}_${f}`;
	return `(SELECT GROUP_CONCAT(${c}, '|') FROM (SELECT${distinct} ${t}.${prop} ${c} FROM ${t} WHERE ${t}.${f} = ${t2}.id))`;
}

function concat(f1,f2,prop,dir=false,sep='|'){
	const t1 = f1.replace(/s$/,'')+'s';
	const t2 = f2.replace(/s$/,'')+'s';
	const link = (dir ? `${t1}_${t2}` : `${t2}_${t1}`) + '_link';
	const fields = [f1,f2];
	return _concat(t1,t2,link,prop,fields,sep);
}

class Statement{
	constructor(){
		this._query = squel.select({ separator: "\n" });
	}

	bookFields(){
		this._query
			.field('books.id','book_id')
			.field('books.title','book_title')
			.field('books.sort','book_sort')
			.field('books.author_sort','author_sort')
			.field('books.has_cover','book_has_cover')
			.field('books.pubdate','book_date')
			.field('books.path','book_path')
			.field('books.isbn','book_isbn')
			.field('books.series_index','book_series_index')
		return this;
	}
	authorBrowserFields(){
		this._query
			.field('tag_browser_authors.count','authors_books_count')
		return this;
	}
	authorFields(){
		this._query
			.field('authors.id','author_id')
			.field('authors.name','author_name')
			.field('authors.sort','author_sort')
		return this;
	}
	tagFields(){
		this._query
			.field('tags.name','tag_name')
			.field('tags.id','tag_id')
			.field('tags.count','tag_books_count')
		return this;
	}
	seriesFields(){
		this._query
			.field('series.id','series_id')
			.field('series.name','series_name')
			.field('series.sort','series_sort')
		return this;
	}
	sumData(){
		this._query
			.field(concat_simple('data','books','book','id'),'data_id')
			.field(concat_simple('data','books','book','format'),'data_format')
			.field(concat_simple('data','books','book','uncompressed_size'),'data_size')
			.field(concat_simple('data','books','book','name',false),'data_name')
			//.field("GROUP_CONCAT(DISTINCT data.format)",'data_format')
			//.field("GROUP_CONCAT(DISTINCT data.uncompressed_size)",'data_size')
			//.join('data')
			//.where('data.book = books.id');
		return this;
	}
	sumBooks(_from='author'){
		this._query
			.field(concat('book',_from,'id',true),'book_id')
			.field(concat('book',_from,'title',true),'book_title')
			.field(concat('book',_from,'sort',true),'book_sort')
			.field(concat('book',_from,'has_cover',true),'book_has_cover')
			.field(concat('book',_from,'pubdate',true),'book_pubdate')
			.field(concat('book',_from,'path',true),'book_path')
			.field(concat('book',_from,'series_index',true),'book_series_index')
			/*
			.field("GROUP_CONCAT(DISTINCT books.id)",'books_id')
			.field("GROUP_CONCAT(DISTINCT books.title)",'books_name')
			.field("GROUP_CONCAT(DISTINCT books.sort)",'books_sort')
			.field("GROUP_CONCAT(DISTINCT books.has_cover)",'books_has_cover')
			.field("GROUP_CONCAT(DISTINCT books.pubdate)",'books_pubdate')
			.field("GROUP_CONCAT(DISTINCT books.path)",'books_path')
			.field("GROUP_CONCAT(DISTINCT books.series_index)",'books_series_index')
			*/
		return this;
	}
	sumSeries(){
		this._query
			.field(concat('series','book','id'),'series_id')
			.field(concat('series','book','name'),'series_name')
			.field(concat('series','book','sort'),'series_sort')
			/*
			.field("GROUP_CONCAT(DISTINCT series.id)",'series_id')
			.field("GROUP_CONCAT(DISTINCT series.name)",'series_name')
			.field("GROUP_CONCAT(DISTINCT series.sort)",'series_sort')
			*/
		return this;
	}
	sumTags(){
		this._query
			//.field('tags.name','tag_names')
			.field(concat('tag','book','id'),'tag_id')
			.field(concat('tag','book','name'),'tag_name')
		return this;
	}
	sumAuthor(){
		this._query
			.field(concat('author','book','id'),'author_id')
			.field(concat('author','book','name'),'author_name')
			.field(concat('author','book','sort'),'author_sort')
		return this;
	}
	commentTags(){
		this._query
			.field('comments.text','comment')
		return this;
	}
	appendComments(){
		this._query
			.left_join('comments',null,'comments.book = books.id')
		return this;
	}
	appendSeries(){	
		this._query
			.join('books_series_link',null,'books_series_link.book = books.id')
			.join('series',null,'series.id = books_series_link.series')
		return this;
	}
	appendBookFromTag(){
		this._query
			.join('books_tags_link',null,'books_tags_link.tag = tags.id')
			.join('books',null,'books.id = books_tags_link.book')
		return this;
	}
	appendBookFromSeries(){
		this._query
			.left_join('books_series_link',null,'books_series_link.series = series.id')
			.left_join('books',null,'books.id = books_series_link.book')
		return this;
	}
	appendBookFromAuthor(){
		this._query
			.join('books_authors_link',null,'books_authors_link.author = authors.id')
			.join('books',null,'books.id = books_authors_link.book')
		return this;
	}
	appendTagFromBook(){
		this._query
			.join('books_tags_link',null,'books_tags_link.book = books.id')
			.join('tags',null,'tags.id = books_tags_link.tag')
		return this;
	}
	appendAuthorFromBook(){
		this._query
		//.left_join('comments',null,'comments.book = books.id')
			.field('authors.name','author_name')
			.join('books_authors_link',null,'books_authors_link.book = books.id')
			.join('authors',null,'authors.id = books_authors_link.author')
		return this;
	}
	appendAuthorBrowser(){
		this._query
			.join('tag_browser_authors',null,'tag_browser_authors.id = authors.id')
		return this;
	}
	toString(){
		return this._query.toString();
	}
	query(){
		return this._query;
	}
}

function makeStatement(){
	return new Statement();
}

makeStatement.Statement = Statement;

module.exports = makeStatement;