# Calibre-Serve

A [Calibre](https://calibre-ebook.com/) API manager and server.

Opens the Calibre library as read-only; this is a module for *reading* the library only, the purpose being to serve a or several libraries from a directory that is synced with a local copy of Calibre.

Has an integrated epub reader thanks to [epub.js](https://github.com/futurepress/epub.js/)

## Stand-Alone Usage:

If you want to use it as a stand-alone server:

```sh
npm install -g calibre-serve
```

Then:
```
calibre-serve /path/to/calibre/database
```

the path should be **one directory above** your actual database directory. That is, if `metadata.db` is situated at `/path/to/calibre/database/metadata.db`, then you should use `/path/to/calibre`. Calibre-server will take care of reading sub-directories and adding all the ones that have a `metadata.db`.

You can use `calibre-serve -h` for help about using options such as port or setting the server's title.


this is how the default templates look:

![preview](preview.png?raw=true)

----

## Node API

To use it in another module:

```sh
npm install --save calibre-serve
```
Then:

```js
const calibreAPI = require('calibre-serve');
const path = 'path/to/calibre'
const databases = ['database'];

calibreAPI(path,databases,function(err,LIB){
	if(err){throw err;}
	const defaultLogger = makeManager.defaultLogger; // or anything that has `log` and `error`
	LIB.debug(true); //to get debug output
	LIB.logger(defaultLogger) // to set the logger. DefaultLogger is console.
	//then:
	LIB.getBook('database',8).then(rows=>console.log(rows))
	LIB.getSeries('database',1).then(rows=>console.log(rows))
	LIB.getAuthor('database',9).then(rows=>console.log(rows))
	LIB.getTag('database',33).then(rows=>console.log(rows))
})

```

## Methods:


### calibreAPI

```js
calibreAPI(path:string,databases:string[],nodeBack:(err?:Error,LIB:Manager))=>void
```

returns a manager. A manager has four main methods: `getBook`, `getSeries`, `getAuthor`, and `getTag`. All methods work the same:

`method(databaseName[,locator]) => Promise`

 - `databaseName` is one of the databases passed as a second argument.
 - `locator` is either a numeric id (exact match), a string (will try to match with `LIKE %locator%`), or nothing (all results will be returned)


### calibreAPI.makeServer

```js
calibreAPI.makeServer(path:string,databases:string[],nodeBack(err?:Error,LIB:manager))=>void
```

Returns a manager, augmented with an additional method `getRequestHandler` which returns a request handler.

```
const server = calibreAPI.makeServer(/*...*/);
const requestHandler = server.getRequestHandler(options:{});
// requestHandler is a regular connect handler with signature
// (res,req,next)
```

Possible options are:
 - `options.mountPoint`: required,string. The root point for all URLS in templates.
 - `options.static`: required, string. The static path to prepend to image requests.
 - `options.databases`: required, array. An array of database in the form of `{name,path,description}`. The only important value is `path`, and it should match one of the paths in your `directories` array.
 - `options.onErrorNext`:boolean. If true, the server will yield errors to `next()` instead of handling errors itself.
 - `options.asJson`: boolean. If true, no templates will be used and database output will be sent as is.
 - `options.title`: string. The server title.
 - `options.templates`: An object of templates (`{list,book,author,tag,series,error}`). Each template has the signature: `(rows,locator,command,dbName,options)` where:
 	- `rows` is the returned output
 	- `locator` is the locator argument
 	- `command` is one of `book`, `author`, `series`, or `tag`
 	- `dbName` is the name of the currently used database
 	- `options` is the options object

If you use that, you should set a static server to allow the Calibre server to request images. This would go something like:

```js

const calibreAPI = require('calibre-serve');
const makeServer = calibreAPI.makeServer;

const root = '/path/to/calibre';
const directories = ['database'];
const databases = [{name:'My Database',path:'database',description:'a very nice database'}]
const staticPath = '/covers';
const mountPoint = '/calibre/'
const options = {
	, static:staticPath
	, databases:databases
	, mountPoint:mountPoint
	, title:'My Server'
}
makeServer(root,directories,function(err,LIB){
	if(err){throw err;}
	const requestHandler = LIB.getRequestHandler(options);
	app.use(staticPath,express.static(root))
	app.use(mountPoint,requestHandler);
	app.listen(3000,function(){
		console.log(`listening!`);
	})
})
```

### calibreAPI.connect

```
calibreAPI.connect(options)
```

A nicer API for the above `makeServer`;

```js
const calibreAPI = require('calibre-serve');
const connect = calibreAPI.connect;

connect(
	{ root
	, databases
	, static
	, mountPoint
	, title
	}
,	function(err,requestHandler){
		if(err){throw err;}

		app.use(static,express.static(root))
		app.use(requestHandler);
		app.listen(3000,function(){
			console.log(`${title} listening on ${port}`);
		})
	}
)
```

## Tests

None yet. Coming up.

## Contributions

Oh please yes. Just do the classic fork commit pr dance.

## FAQ

### Is it stable?

No. It's very fresh and might change

### Is it reliable?

No. It doesn't have any test

### Is it fast?

No. The SQL requests are absolutely not optimized. This is intended for private usage, like sharing books with family and friends


## LICENSE

The MIT License (MIT)
Copyright (c) 2016 Jad Sarout

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.