const commandsMap = require('./commandsMap');
const moment = require('moment');
const commands = Object.keys(commandsMap).filter(c=>c!=='list');
const path = require('path');

function renderTagLink(tag,root){
	const {tag_name,tag_id} = tag;
	return `<span class="tagLink"><a href="${root}tag/${tag_id}">${tag_name}</a></span>`
}

function renderTagsLinks(tags,root){
	return `${tags.map(tag=>renderTagLink(tag,root)).join('')}`;
}

function renderProp(name,value,className){
	className = className || name.replace(/\s+/g,'_').replace(/:/g,'').toLowerCase();
	const propertyTitle = name ? `<span class="propertyTitle">${name}</span> ` : '';
	return `<div class="property ${className}">${propertyTitle}<span class="propertyValue">${value}</span></div>`
}

function renderAuthorLink(author,root){
	const {author_id,author_name} = author;
	return `<span class="authorLink"><a href="${root}author/${author_id}">${author_name}</a></span>`;
}

function renderAuthorsLinks(authors,root){
	return `<span class="authorLinks">${authors.map(author=>renderAuthorLink(author,root)).join('')}</span>`;
}

function renderSeriesLink(series,root){
	const {series_id,series_name} = series;
	return `<span class="seriesLink"><a href="${root}series/${series_id}">${series_name}</a></span>`
}

function renderSeriesLinks(series,root){
	if(!series.length){return '';}
	return `<span class="seriesLinks">Part of: ${series.map(series=>renderSeriesLink(series,root)).join('')}</span>`;	
}

function renderDate(date){
	const _date = date ? moment(date).format("MMMM YYYY") : '';
	return `<span class="date">${_date}</span>`
}

function getFileLink(path,book_path,book_id,dbName,options){
	const static = options.static || ''
	return `${static}/${dbName}/${book_path}/${path.replace(/'/g,'\\\'')}`
}

function renderFileLink(file,book_path,book_id,dbName,options){
	const {data_id,data_format,data_size,data_name} = file;
	const extension = data_format.toLowerCase();
	const fileName = `${data_name}.${extension}`;
	const filePath = getFileLink(fileName,book_path,book_id,dbName,options)
	const readOnline = (extension == 'epub') ? `<span class="downloadLink readOnlineLink"><a onClick="openBook('${filePath}')"> & read online</a></span>` : '';
	return `<span class="downloadLink"><a href="${filePath}">as ${data_format}</a></span>${readOnline}`;
}

function renderFiles(files,book_path,book_id,dbName,options){
	if(!files.length){return '';}
	const links = files.map(file=>renderFileLink(file,book_path,book_id,dbName,options)).join('')
	return `<div class="downloads">${links}</div>`;
}

function renderBook(book,summary=true,dbName,options,level=3){
	const mountPoint = (options.mountPoint || '/')+`${dbName}/`;
	const 
		{ book_title
		, book_id
		, book_path
		, book_has_cover
		, book_date
		, authors
		, tags
		, series
		, comment
		, data
	} = book;
	
	const url = `${mountPoint}book/${book_id}`;

	const _authors = authors && renderAuthorsLinks(authors,mountPoint);
	const _tags = tags && renderTagsLinks(tags,mountPoint);
	const _series = series && renderSeriesLinks(series,mountPoint);
	const authorsProp = _authors && renderProp('by',_authors,'author');
	const dateProp = book_date && renderProp('Published on',renderDate(book_date),'date');
	const tagsProp = _tags && renderProp('',_tags,'tags');
	const _data = !summary && renderFiles(data,book_path,book_id,dbName,options);
	//<pre>${JSON.stringify(book,null,' ')}</pre>
	return `<div class="container book ${summary?'book_summary':'book_full'}"><h${level} class="titleLink"><a href="${url}">${book_title}</a></h${level}>
	${authorsProp || ''}
	${_series || ''}
	${dateProp || ''}
	<a class="coverLink" href="${url}">${getCover(book_path,dbName,options,book_title)}</a>
	${_data || ''}
	${comment && renderComment(comment,summary) || ''}
	${tagsProp || ''}
	</div>`

}

function renderComment(comment,summary){
	return `<div class="comment ${summary ? 'summary':''}"><div class="comment-inside">${comment}</div></div>`
}

function getCover(path,dbName,options,alt=''){
	if(!path){
		return `<span class="cover no_cover"></span>`
	}
	const src = getImageLink(path,dbName,options);
	return `<span class="cover has_cover" style="background-image:url('${src}');"><img src="${src}" alt="'${alt}' cover"/></span>`
}

function getImageLink(path,dbName,options){
	const static = options.static || ''
	return `${static}/${dbName}/${path.replace(/'/g,'\\\'')}/cover.jpg`
}

function renderBooks(books,dbName,options){
	return `<div>
		<h1>Books</h1>
		${books.map(book=>renderBook(book,true,dbName,options,2)).join('')}
	</div>`
}

function bookPage(rows,argument,command,dbName,options){
	const text = 'BOOK'+JSON.stringify(rows)+'::::'+argument+'::::'+command;
	if(/\d+/.test(argument)){
		return renderBook(rows[0],false,dbName,options,1);
	}
	return renderBooks(rows,dbName,options);
	return text;
}

function renderBookSummary(book,mountPoint,dbName,options){
	const {book_id,book_title,book_has_cover,book_path} = book;
	const cover = getCover(book_path,dbName,options,book_title)
	return `<div class="bookSummary"><a class="bookSummary-inside" href="${mountPoint}book/${book_id}">${cover}<span class="book_title">${book_title}</span></a></div>`
}

function renderTag(row,mountPoint,dbName,options){
	const {tag_name,tag_id,tag_books_count,books} = row;
	const _books = books.map((book)=>`${renderBook(book,true,dbName,options,3)}`).join('');
	return `<div class="tag"><h2>Tag: <a href="${mountPoint}tag/${tag_id}">${tag_name}</a></h2><div class="tag_books">${_books}</div></div>`
}

function renderTags(rows,dbName,options){
	const mountPoint = (options.mountPoint || '/')+dbName+'/';
	const tags = rows.map(row=>renderTag(row,mountPoint,dbName,options)).join('');
	return tags;
}

function renderTagsCloud(rows,dbName,options){
	const mountPoint = (options.mountPoint || '/')+dbName+'/';
	const tags = rows.map(({tag_name,tag_id,tag_books_count})=>
		`<span class="tagLink"><a href="${mountPoint}tag/${tag_id}">${tag_name}<span class="tag_books_count">${tag_books_count}</span></a></span>`
	).join('');
	return tags;
}

function tagPage(rows,argument,command,dbName,options){
	const content = (!argument) ? 
		renderTagsCloud(rows,dbName,options):
		renderTags(rows,dbName,options)
	;
	return `<div class="tagsPage"><h1>Tags</h1>${content}</div>`
}

function renderSerie(row,mountPoint,dbName,options){
	const {series_name,series_id,books} = row;
	const _books = books.map((book)=>`${renderBook(book,true,dbName,options,3)}`).join('');
	return `<div class="series"><h2>Series: <a href="${mountPoint}tag/${series_id}">${series_name}</a></h2><div class="series_books">${_books}</div></div>`
}

function renderSeries(rows,dbName,options){
	const mountPoint = (options.mountPoint || '/')+dbName+'/';
	const series = rows.map(row=>renderSerie(row,mountPoint,dbName,options)).join('');
	return series;
}

function renderSeriesSummary(series,mountPoint,dbName,options){
	const {series_name,series_id,books} = series
	const images = books.slice(0,4).map(book=>renderBookSummary(book,mountPoint,dbName,options)).join('')
	return `<div class="container seriesLink"><h3><a href="${mountPoint}series/${series_id}">${series_name}</a></h3><div class="books">${images}</div></div>`
}

function renderSeriesCloud(rows,dbName,options){
	const mountPoint = (options.mountPoint || '/')+dbName+'/';
	const tags = rows.map((series)=>renderSeriesSummary(series,mountPoint,dbName,options)).join('');
	return tags;
}

function seriesPage(rows,argument,command,dbName,options){
	const content = (!argument) ? 
		renderSeriesCloud(rows,dbName,options):
		renderSeries(rows,dbName,options)
	;
	return `<div class="seriesPage"><h1>Series</h1>${content}</div>`	
}


function renderAuthor(row,mountPoint,dbName,options){
	const {author_name,author_id,books} = row;
	const _books = books.map((book)=>`${renderBook(book,true,dbName,options,3)}`).join('');
	return `<div class="authors"><h2>Authors: <a href="${mountPoint}tag/${author_id}">${author_name}</a></h2><div class="authors_books">${_books}</div></div>`
}

function renderAuthors(rows,dbName,options){
	const mountPoint = (options.mountPoint || '/')+dbName+'/';
	const authors = rows.map(row=>renderAuthor(row,mountPoint,dbName,options)).join('');
	return authors;
}

function renderAuthorsSummary(authors,mountPoint,dbName,options){
	const {author_name,author_id,authors_books_count,books} = authors
	const images = books.slice(0,4).map(book=>renderBookSummary(book,mountPoint,dbName,options)).join('')
	return `<div class="container authorsLink"><h3><a href="${mountPoint}author/${author_id}">${author_name}</a></h3><div class="books">${images}</div></div>`
}

function renderAuthorsCloud(rows,dbName,options){
	const mountPoint = (options.mountPoint || '/')+dbName+'/';
	const tags = rows.map((authors)=>renderAuthorsSummary(authors,mountPoint,dbName,options)).join('');
	return tags;
}

function authorsPage(rows,argument,command,dbName,options){
	const content = (!argument) ? 
		renderAuthorsCloud(rows,dbName,options):
		renderAuthors(rows,dbName,options)
	;
	return `<div class="authorsPage"><h1>Authors</h1>${content}</div>`	
}

function defaultTemplate(rows,argument,command,dbName,options){
	const text = JSON.stringify(rows)+'::::'+argument+'::::'+command;
	return text;
}

function renderEndPointLink({name,url},mountPoint){
	return `<a href="${mountPoint}${url}">${name.replace(/^get|s$/g,'')}s</a>`;
}

function renderEndPointLinks(endPoints,mountPoint){
	return `<ul>${endPoints.map((endPoint)=>`<li>${renderEndPointLink(endPoint,mountPoint)}</li>`).join('')}</ul>`
}

function renderDatabase(db,options,dbName,level=1,summary){
	const mountPoint = options.mountPoint || '/';
	const {name,endPoints} = db;
	const opts = options.databases.find(db=>db.path == name);
	const _endPoints = summary ? '' : renderEndPointLinks(endPoints,mountPoint+dbName+'/');
	return `<div>
		<h${level}><a href="${mountPoint}${name}">${opts.name}</a></h${level}>
		<div>${opts.description}</div>
		${_endPoints}
	</div>`
}

function renderDatabases(databases,options,summary){
	return databases.map(db=>renderDatabase(db,options,db.name,2,summary)).join('')
}

function renderManager(manager,options){
	const title = options.title || 'SERVER';
	return `<div><h1>${title}</h1>${renderDatabases(manager.databases,options,true)}</div>`
}

function listPage(rows,argument,command,dbName,options){
	if(rows.type == 'manager'){
		return renderManager(rows,options);
	}
	else{
		return renderDatabase(rows,options,dbName,1);
	}
}

function renderError(title,text){
	return `<h1 class="error-title">${title}</h1><div class="error">${text}</div>`
}

function error(error,status,url,dbName,options){
	const message = error.message;
	const isFile = dbName=='covers';
	if(message == 'no rows'){
		const [thing,search] = url
		const forSearch = search ? ` that matches \`${search}\``:'';
		return renderError('No Results',`<h3>Oops!</h3><p>couldn't find any ${thing}${forSearch}.</div><div>Maybe try something else?</p>`)
	}
	if(status == 404){
		url=url.join('/');
		if(isFile){
			const filename = path.basename(url);
			return renderError('OMG Error 404',`it seems the file <pre>\`${filename}\`<pre> doesn't exist.`)
		}
		return renderError('OMG Error 404',`it seems the url <pre>\`/${dbName}/${url}\`<pre> is not valid.`)
	}
	if(status == 403){
		return renderError('Forbidden Acces (Error 403)',`You are not allowed to access this ${isFile ? 'file':'page'}`)
	}
	return renderError('Internal Server Error',`${message}<br><pre>${error.stack}</pre><br>What happened? It's a mystery. Contact the website author please.`);
}

function renderFooter(options){
	const footer = options.footer;
	if(!footer){return '';}
	return `<div class="Footer"><span>${footer}</span></div>`
}

function page(fn){
	return function render(rows,argument,command,dbName,options){
		const title = options && options.title || 'Calibre Server';
		const menu = menuBar(dbName,command,argument,options)
		const footer = renderFooter(options); 
		return `<!DOCTYPE html>
<html class="nojs"><head><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
<title>${title}</title>${style()}
<meta name="viewport" content="width=device-width">
<meta name="apple-mobile-web-app-capable" content="yes">
</head><body>
<div class="Wrapper">${menu}<div class="content">${fn(rows,argument,command,dbName,options)}</div></div>
${footer}
<div id="BookContainer">
	<div id="Book" style="top:-100%">
		<div id="prev" class="arrow" onclick="prevPage();">‹</div>
		<div id="Area"></div>
		<div id="next" class="arrow" onclick="nextPage();">›</div>
		<div id="close" class="arrow" onClick="hideBook()">×</div>
		<div id="loader"><img src="/vendor/epub/loader.gif"></div>
	</div>
</div>
<script src="/vendor/epub/epub.min.js"></script>
<script src="/vendor/epub/zip.min.js"></script>
<script>
	var Book; 
	var Container = document.getElementById('Book');
	var Spinner = document.getElementById("loader");
	var last;  
	function hideBook(){
		Container.style.top = '-100%';
	}
	function nextPage(){Book && Book.nextPage();}
	function prevPage(){Book && Book.prevPage();}
	function openBook(url){
		Container.style.top=0;
		if(url == last){return;}
		last = url;
		console.log("getting",url);
		Spinner.style.display = "block";;
		Book = ePub(url);
		Book.ready.all.then(function(){
			Spinner.style.display = "none";
		});
		Book.renderTo("Area");
	};
	document.getElementByTagName('html')[0].className = '';
</script>
</body></html>`;
	}
}

function renderOption(opt,selected){
	let text,value;
	if(typeof opt == 'string'){
		text = value = opt;
	}else{
		[text,value] = opt;
	}
	selected = selected ? ' selected="selected"':'';
	return `<option value="${value}" ${selected}>${text}</option>`
}

function renderOptions(options,selected){
	return options.map((opt,i)=>renderOption(opt,i==selected)).join('')
}

function renderSelect(name,options,selected){
	const _options = renderOptions(options,selected)
	return `<select name="${name}">${_options}</select>`;
}

function renderInput(type,name,value){
	return `<input type="${type}" name="${name}" value="${value||''}"/>`
}

function renderTextInput(name,value){
	return renderInput('text',name,value);
}

function renderHiddenInput(name,value){
	return renderInput('hidden',name,value);
}

function searchBar(dbName,command,argument,options){
	const selected_command = commands.findIndex((c)=>(c==command));
	const types = renderSelect('command',commands,selected_command);
	const dbs = options.databases.map(({name,path})=>([name,path]));
	const selected_db = options.databases.findIndex(db=>(db.path == dbName))
	const databases = (dbs.length>1) ? renderSelect('dbName',dbs,selected_db) : renderHiddenInput('dbName',dbs[0][1])
	const searchValue = argument && !/\d+/.test(argument) ? argument : ''
	return `<div class="search nav-inside">
	<form><span class="title">Search</span> ${databases}${types}${renderTextInput('search',searchValue)}${renderInput('submit','submit','ok')}</form>
</div>`
}

function menuBar(dbName,command,argument,options){
	const mountPoint = options.mountPoint || '/';
	const dbsLinks = options.databases.length ? options.databases.map(({name,path})=>`<a class="dbLink ${dbName==path?'selected':''}" href="${mountPoint}${path}"><span>${name}</span></a>`).join('') : '';
	const dbsMenu = dbsLinks ? `<div class="nav-inside nav-dbs"><a class="dbLink Home ${!dbName ? 'selected':''}" href="${mountPoint}"><span>Home</span></a>${dbsLinks}</div>` : ''
	const commandsLinks = dbName ? commands.map((name)=>`<a class="commandLink ${name==command?'selected':''}" href="${mountPoint}${dbName}/${name}"><span>${name.replace(/s$/,'')}s</span></a>`).join('') : '';
	const commandsMenu = commandsLinks ? `<div class="nav-inside nav-commands">${commandsLinks}</div>` : '';
	const search = searchBar(dbName,command,argument,options);
	return `<div class="nav">${dbsMenu}${commandsMenu}${search}</div>`;	
}

function hexToRgb(hex) {
	const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const r = result ? parseInt(result[1], 16) : 0;
	const g = result ? parseInt(result[2], 16) : 0;
	const b = result ? parseInt(result[3], 16) : 0;
	return [r,g,b];
}

function style(){
	const bg = '#E1EAED';
	const _bg = hexToRgb(bg);
	return `<style>
	body{
		font-family:sans-serif;
		height 100%
		width 100%
	}
	.Wrapper{
		max-width:1024px;
		margin: 0 auto;
		min-height: 800px;
	}
	.Footer{
		clear:both;
		width:100%;
		text-align:center;
		font-size:.7em;
		margin-top:10em;
	}
	.content{
		margin-top:1em;
	}
	a{
		text-decoration:none;
		color:#7CB2C4;
		display:inline-block;
	}
	.authorLink a, .titleLink a{
		border-bottom:1px solid transparent;
	}
	a:hover{
		border-bottom-color:#7CA7C4
	}
	a.coverLink:hover{
		border-bottom:none;
	}
	.downloadLink a{
		background:#b778a0;
		padding:.3em;
		color:white;
		margin:.2em;
		border-radius:.3em;
	}
	.downloadLink a:before{
		content:"download ";
	}
	.readOnlineLink{f(options && options.json){
			res.status(200).send(rows);
			return;
		}
		const template = this.getTemplate(templates,command);
		const text = template(rows,argument,command,dbName,options);
		r
		float:right;
		cursor:pointer
	}
	.readOnlineLink a{
		background:#b387d2;
	}
	.nojs readOnlineLink a{
		display none;
	}
	.nav{
		background:#7CA7C4;
		padding:1em 0 0;
	}
	.nav a{
		color:#fff;
	}
	.nav-inside{
		padding:.3em 1em;
	}
	.nav-commands{
		background:#7DB6C9;
	}#loader {
  position: absolute;
  z-index: 10;
  left: 50%;
  top: 50%;
  margin: -33px 0 0 -33px;
}
	.search{
		background:#90C3D4;
	}
	.nav a{
		margin:0 .3em;
		padding:.3em;
	}
	.nav a.selected{
		background:#fcfcfc;
		color:#7CA7C4;
	}
	.container{
		float:left;
		padding:2em;
		background-color:${bg};
		box-sizing:border-box;
		margin:1em 0;
		width:100%;
	}
	.container.book.book_summary{
		overflow:hidden;
		box-sizing:border-box;
	}
	.cover{
		width:20em;
		height:20em;
		background-repeat:no-repeat;
		background-size:contain;
		position:relative;
		float:left;
		margin:1em 0 0;
		display:inline-block;
	}
	.cover img{
		position:absolute;
		top:0;
		left:0;
		display:none;
		height:100%;
	}
	.bookSummary{
		margin:1em 0 0;
		float:left;
		width:7em;
	}
	.bookSummary-inside{
		width:100%;
		height:100%;
		display:block;
		margin:0 auto;
	}
	.bookSummary .cover{
		margin:0 auto;
		width:7em;
		height:7em;
		background-position:center;
	}
	.bookSummary .book_title{
		display:inline-block;
		float:left;
		width:100%;
		text-align:center;
		clear:both;
	}
	.property.tags{
		clear:both;
		width:100%;
		margin-top:.3em;
	}
	.property.tags .propertyValue span{
		font-size:.8em;
	}
	.authorLink{
		padding 0 .3em;
	}
	.authorLink:after{
		content:" & "
	}
	.authorLink:last-child:after{
		content:""
	}
	.tagLink{
		padding:0 .3em .15em .3em;
		display:inline-block;
	}
	.tagLink a{
		text-decoration:none;
		padding:.3em;
		border-radius:.3em;
		color:white;
		background-color:#7CB2C4;
		border-bottom:none;
	}
	.tagLink a:hover{
		background:#7CA7C4;
	}
	.tag_books_count{
		font-size:.9em;
		line-height:.2em;
		position:relative;
		top:-.2em;
	}
	.tag_books_count:before{
		content:" ("
	}
	.tag_books_count:after{
		content:")"
	}
	.comment{
		margin-top:1em;
		clear:both;
	}
	.comment.summary{
		height:3.2em;
		overflow:hidden;
	}
	.comment.summary .comment-inside{
		position:relative;
		height:3.6em;
	}
	.comment.summary .comment-inside:after {
		content: "";
		text-align: right;
		position: absolute;
		bottom: 0;
		right: 0;
		width: 70%;
		height: 1.2em;
		background: linear-gradient(to right, rgba(${_bg.join(',')}, 0), rgba(${_bg.join(',')}, 1) 50%);
	}
	#Book {
		position: absolute;
		top:0;
		left:0;
		right:0;
		height:100%;
		background:#fdfdfd;
		-webkit-box-shadow: inset 0px 0px 59px -1px rgba(0,0,0,0.13);
		-moz-box-shadow: inset 0px 0px 59px -1px rgba(0,0,0,0.13);
		box-shadow: inset 0px 0px 59px -1px rgba(0,0,0,0.13);
		-webkit-transition: all 3s ease-in;
		-moz-transition: all .3s ease-in;
		-ms-transition: all .3s ease-in;
		-o-transition: all .3s ease-in;
		transition: all .3s ease-in;
	}
	#Area {
		width: 80%;
		height: 80%;
		margin: 5% auto;
		max-width: 1250px;
	}
	#Area iframe {
		border: none;
	}
	#prev {
		left: 40px;
	}
	#next {
		right: 40px;
	}
	.arrow {
		position: absolute;
		top: 50%;
		margin-top: -32px;
		font-size: 64px;
		color: #E2E2E2;
		font-family: arial, sans-serif;
		font-weight: bold;
		cursor: pointer;
		-webkit-user-select: none;
		-moz-user-select: none;
		user-select: none;
	}
	.arrow:hover {
		color: #777;
	}
	.arrow:active {
		color: #000;
	}
	#close{
		top:.3em;
		right:.3em;
		width:1em;
		height:1em;
	}
	#loader {
		position: absolute;
		z-index: 10;
		left: 50%;
		top: 50%;
		margin: -33px 0 0 -33px;
	}
</style>`
}

module.exports = 
	{ default:page(defaultTemplate)
	, list:page(listPage)
	, book:page(bookPage)
	, author:page(authorsPage)
	, tag:page(tagPage)
	, series:page(seriesPage)
	, error:page(error)
	};