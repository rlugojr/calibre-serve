const express = require('express');
const path = require('path');
const makeManager = require('./src')
const connect = makeManager.connect;
const app = express();
const readDatabasesFromDisk = require('./src/utils/readDatabasesFromDisk');
const favicon = require('serve-favicon');
const localStatic = path.resolve(__dirname,'src/vendor');

function startServer(root,title='Calibre Server',port=3000){

	if(!root){throw new Error('root is not defined');}

	const static = '/covers';

	const databases = readDatabasesFromDisk(root);

	connect(
		{ root
		, databases
		, static:static
		, mountPoint:'/'
		, title
		}
	,	function(err,requestHandler){
			if(err){throw err;}
			app.use(function(req,res,next){
				req.url = decodeURIComponent(req.url).replace(/\/'/,"'")
				return next();
			})
			app.use(favicon(`${localStatic}/favicon.png`));
			app.use(static,express.static(root))
			app.use('/vendor',express.static(localStatic));
			app.use(requestHandler);
			app.listen(3000,function(){
				console.log(`${title} listening on ${port}`);
			})
		}
	)
}

module.exports = startServer;

if(!module.parent){
	startServer(__dirname);
}
