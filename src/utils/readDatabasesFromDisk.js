const fs = require('fs');

function toUpper(str){
	return str
		.replace(/_/g,' ')
		.toLowerCase()
		.replace(/([^a-z])([a-z])(?=[a-z]{2})|^([a-z])/g, function(_, g1, g2, g3) {
			return (typeof g1 === 'undefined') ? g3.toUpperCase() : g1 + g2.toUpperCase();
		});
}

module.exports = function readDatabasesFromDisk(root){
	return fs.readdirSync(root).map(function(path){
		const isDir = fs.statSync(`${root}/${path}`).isDirectory();
		if(!isDir){return;}
		try{
			meta = fs.statSync(`${root}/${path}/metadata.db`);
		}catch(e){
			return false;
		}
		let description = '';
		try{
			description = fs.readFileSync(`${root}/${path}.html`,{encoding:'utf8'})
		}catch(e){}
		const name = toUpper(path);
		return {name,path,description};
	}).filter(Boolean);
}