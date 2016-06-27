#! /usr/bin/env node

const pkg = require('./package.json');
const {name,version} = pkg;
const args = process.argv.slice(2)
const fs = require('fs');
const path = require('path');
const readDatabasesFromDisk = require('./src/utils/readDatabasesFromDisk');

function logAndExit(exitCode,text){
	if(exitCode==1){
		console.error(`\n ERROR!\n${text}`);
	}else{
		console.log(text);
	}
	process.exit(exitCode)
}

function testArg(short,long,arg){
	const reg = new RegExp(`^-+(${short}|${long})$`);
	return reg.test(arg);
}

function printHelp(additional=''){
		logAndExit(0,` 
 ${name} -- version ${version}

 runs a calibre server at a specified location

 usage:
    ${name} /path/to/directory [options]

 where \`directory\` is one directory ABOVE your calibre directory.
 for example, if your calibre database is located at 
 \`/home/user/calibre/books\`
 that is, \`books\` contains \`metadata.db\`
 then you should use:
    ${name} /home/user/calibre -p 3000
 the server will take care of reading all sub-directories and
 adding the ones that have a \`metadata.db\`

You can add basic auth to the server by making use of 'tokens'
If you set, for example:
 
    ${name} /home/user/calibre -p 3000 -t a,b,c

Then to download a book, a user will have to have accessed the website
once with, for example, "?token=b"

 options:
    -h,--help: this message
    -v,--version: print version and exit
    -p,--port: specify port (defaults to 3000)
    -t,--title: specify server title
	-o,--tokens: a comma-separated list of tokens
	-f,--footer: specify a footer
	-b,--base: the base directory (can also be specified without a switch)
	-g,--google: google analytics code ("ua-xxxxxx")
	-s,--silent: no log output
    --test: verify that the directory is valid
${additional}`);
}

function printVersion(){
	logAndExit(0,`
	 version: ${version}
	`)
}

function testDir(dir){
	try{
		const dirs = fs.readdirSync(dir);
		return true;
	}catch(e){
		return false;
	}
	return false;
}


let dir = null;
let port = 3000;
let title = 'Calibre Server';
let i = 0;
let testing = false;
let footer = '';
let ga='';
let verbose=true;
const {length} = args;
let tokens;

while(i<length){

	const a = args[i++];

	if(testArg('p','port',a)){
		port = args[i++];
		continue;
	}


	if(testArg('t','title',a)){
		title = args[i++];
		continue;
	}


	if(testArg('o','tokens',a)){
		tokens = args[i++];
		continue;
	}

	if(testArg('b','base',a)){
		dir = args[i++];
		continue;
	}

	if(testArg('g','google',a)){
		ga = args[i++];
		continue;
	}

	if(testArg('f','footer',a)){
		footer = args[i++];
		continue;
	}

	if(testArg('h','help',a)){
		printHelp();
		continue;
	}

	if(testArg('v','version',a)){
		printVersion();
		continue;
	}

	if(testArg('te','test',a)){
		testing = true;
		continue;
	}
	if(testArg('s','silent',a)){
		verbose = false;
		continue;
	}
	dir = a;

}

if(tokens){
	tokens = tokens.split(',').map(token=>token.trim())
}

if(!dir){
	dir = path.resolve('.');
}

const valid = testDir(dir);

const databases = valid && readDatabasesFromDisk(dir);

function errorInvalidDirectory(dir){
	return ` \`${dir}\` is not a valid directory\n`;
}

function errorNoMetadata(dir){
		return ` couldn't find a single directory containing \`metadata.db\` in \`${dir}\`
 Did you mean \`${path.dirname(dir)}\`?
`;
}

function details(){
	console.log(` \`${title}\` server will run on port \`${port}\``)
	console.log(` and will read databases from \`${databases && databases.map(d=>d.path).join(',') || 'NONE FOUND'}\`\n`)
	console.log(tokens ? ` authentication tokens are \`[${tokens && tokens.join(',')}]\`\n` : ' no authentication tokens set\n')
	console.log(footer ? ` footer will be set to \`${footer}\`` : ' no footer set')
	console.log(ga? ` Google Analytics code will be set to \`${ga}\`` : ' no Google Analytics code')
	if(!verbose){
		console.log('there will be no log output')
	}
	if(!valid){
		console.log('\n ERROR:')
		console.log(errorInvalidDirectory(dir));
		console.log(' status: INVALID\n');
		process.exit(0);
	}
	if(!databases || !databases.length){
		console.log('\n ERROR:')
		console.log(errorNoMetadata(dir))
		console.log(' status: INVALID\n');
		process.exit(0);
	}
	console.log(' status: VALID\n');
}

if(testing){
	console.log('\n testing:\n');
	details();
	process.exit(0);
}

if(!valid){
	logAndExit(1,errorInvalidDirectory(dir));
}

if(!databases || !databases.length){
	logAndExit(1,errorNoMetadata(dir));
}

details();

require('./server')(dir,title,port,tokens,footer,ga,verbose);