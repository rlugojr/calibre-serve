const express = require('express');
const path = require('path');
const makeManager = require('./src')
const connect = makeManager.connect;
const app = express();
const readDatabasesFromDisk = require('./src/utils/readDatabasesFromDisk');
const favicon = require('serve-favicon');
const localStatic = path.resolve(__dirname,'src/vendor');
const authentication = require('./src/authentication');
const URL = require('url');
const moment = require('moment');

function formatLog(req,url){
	const ip = req.ip || req.header('x-forwarded-for') || req.connection.remoteAddress;
	const time = moment().format("Do MMM YY HH:mm:ss");
	return `${ip} | ${time} | ${url}`;
}

function log(req,res,next){
	const url = URL.parse(req.url).pathname;
	if(/\.(jpe?g|ico|png|gif|js|css)$/.test(url)){return next();}
	console.log(formatLog(req,url));
	return next();
}

function errorLog(err,req,res,next){
	const url = URL.parse(req.url).pathname;
	console.error(formatLog(req,url)+`\nERROR: ${err.message}`);
	return next(err);
}

function startServer(root,title='Calibre Server',port=3000,tokens=false,footer='',ga=null,verbose=true){

	if(!root){throw new Error('root is not defined');}

	const static = '/covers';

	const databases = readDatabasesFromDisk(root);

	const doAuthenticate = !!tokens;

	const auth = (doAuthenticate) && authentication
		( app
		, tokens
		, /\.jpe?g$/
		)
		
	connect(
		{ root
		, databases
		, static:static
		, mountPoint:'/'
		, title
		, footer
		, ga
		}
	,	function(err,requestHandler){
			if(err){throw err;}

			app.set('trust proxy', 1);

			app.use(function(req,res,next){
				req.url = decodeURIComponent(req.url).replace(/\/'/,"'")
				return next();
			})
			app.use(favicon(`${localStatic}/favicon.png`));
			app.use('/vendor',express.static(localStatic));
			verbose && app.use(log);
			if(doAuthenticate){
				app.use(`${static}`,auth.verify,express.static(root))
				app.use(auth.login,requestHandler);
			}else{
				app.use(`${static}`,express.static(root))
				app.use(requestHandler);
			}
			app.use(errorLog);
			app.use(requestHandler.errorHandler);
			app.listen(3000,function(){
				verbose && console.log(`${title} listening on ${port}`);
			})
		}
	)
}

module.exports = startServer;

if(!module.parent){
	startServer(__dirname);
}
