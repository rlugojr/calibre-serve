const makeManager = require('./src')

makeManager('/files/LIB/Cloud/mega/read',['books'],function(err,LIB){
	if(err){throw err;}
	//console.log(LIB)
	const defaultLogger = makeManager.defaultLogger;
	//LIB.debug(true);
	//
	//LIB.getListOPDS('books').then(a=>console.log(a))
	//LIB.logger(defaultLogger)
	//LIB.getBookOPDS('books',8).then(rows=>console.log(rows))
	LIB.getSeriesOPDS('books',1).then(rows=>console.log(rows))
	//LIB.getAuthorOPDS('books',9).then(rows=>console.log(rows))
	//LIB.getTag('booksTemp',33).then(rows=>console.log(rows))
})
