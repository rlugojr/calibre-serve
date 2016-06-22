const makeManager = require('./src')

makeManager('/files/LIB/',['booksTemp'],function(err,LIB){
	if(err){throw err;}
	const defaultLogger = makeManager.defaultLogger;
	LIB.debug(true);
	//
	//LIB.logger(defaultLogger)
	LIB.getBook('booksTemp',8).then(rows=>console.log(rows))
	//LIB.getSeries('booksTemp',1).then(rows=>console.log(rows))
	//LIB.getAuthor('booksTemp',9).then(rows=>console.log(rows))
	//LIB.getTag('booksTemp',33).then(rows=>console.log(rows))
})
