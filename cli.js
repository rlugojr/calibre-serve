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
		fs.readdirSync(arg);
		return true;
	}catch(e){
		return false;
	}
	return false;
}

if(!args.length){
	logAndExit(1,`${name} requires a path argument: \`${name} /path/to/libraries\``);
}

const [arg,...rest] = args;

if(testArg('h','help',arg)){
	printHelp();
}

if(testArg('v','version',arg)){
	printVersion()
}

const valid = testDir(arg);

const databases = valid && readDatabasesFromDisk(arg);

let port = 3000;
let title = 'Calibre Server';
let i = 0;
let testing = false;
const {length} = rest;
let tokens;

while(i<length){

	const a = rest[i++];

	if(testArg('p','port',a)){
		port = args[++i];
		continue;
	}


	if(testArg('t','title',a)){
		title = args[++i];
		continue;
	}


	if(testArg('o','tokens',a)){
		tokens = args[++i];
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
		console.log('\n testing:')
		if(!valid){
			console.log(` \`${arg}\` is not a valid directory\n`)
			console.log(' status: INVALID\n');
			process.exit(0);
		}
		if(!databases || !databases.length){
			console.log(` couldn't find a single directory containing \`metadata.db\` in \`${arg}\``)
			console.log(' status: INVALID\n');
			process.exit(0);
		}
		testing = true;
	}

}

if(tokens){
	tokens = tokens.split(',').map(token=>token.trim())
}

function details(){
	console.log(' status: VALID\n');
	console.log(` \`${title}\` server will run on port \`${port}\``)
	console.log(` and will read databases from \`${databases.map(d=>d.path).join(',')}\`\n`)
	console.log(tokens ? ` authentication tokens are \`[${tokens && tokens.join(',')}]\`\n` : ' no authentication tokens set\n')
}

if(testing){
	details();
	process.exit(0);
}

if(!valid){
	logAndExit(1,`\`${arg}\` is not a valid directory\n`);
}

if(!databases || !databases.length){
	logAndExit(1,`
 couldn't find a single directory containing \`metadata.db\` in \`${arg}\`
 maybe you meant ${path.dirname(arg)}
`)
}

details();

require('./server')(arg,title,port,tokens);