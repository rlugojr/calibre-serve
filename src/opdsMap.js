const author = (static,dbName,{author_name,author_id,books})=>(
	{ name:author_name
	, uri:`${static}${dbName}/author/${author_id}`
	, books:books && books.map(b=>book(static,dbName,b))
	}
)

const links = (static,dbName,{book_path},{data_format,data_name})=>(
	{ rel:'acquisition'
	, href:`${static}${dbName}/${book_path}/${data_name}.${data_format.toLowerCase()}`
	, type:`application/${data_format.toLowerCase()}+zip`
	}
)

const cover = (static,dbName,{book_path}) => (
	{ rel:'image'
	, href:`${static}${dbName}/${book_path}/cover.jpg`
	, type:'image/jpeg'
	}
)

const book_link = (static,dbName,{book_id,book_title}) =>(
	{ href:`${static}${dbName}/books/${book_id}`
	, type:'application/atom+xml;type=entry;profile=opds-catalog'
	, title:book_title
	})

const book = (static,dbName,{book_id,book_title,comment,book_path,authors,data})=>(
		{ title:book_title
		, content: comment ? 
			{ type:'raw'
			, value:`<![CDATA[${comment}]]>`
			} : null
		, authors:authors && authors.map(a=>author(static,dbName,a))		
		, links:data && data
			.map(link=>links(static,dbName,{book_path},link))
			.concat(
				[ cover(static,dbName,{book_path})
				, book_link(static,dbName,{book_id,book_title})
				]
			)
		}
	)


const rootLink = (static,rel) => (
	{ rel
	, href:`${static}`
	, type:"application/atom+xml;profile=opds-catalog;kind=navigation"
	}
)

const navigationLink = (static,dbName,type) => (
	{ rel:'subsection'
	, href:`${static}${dbName}/${type}`
	, type:'application/atom+xml;profile=opds-catalog;kind=acquisition'
	}
)

const navigation = (static,dbName,type,title,label='view all ') => (
	{ title
	, links:[ navigationLink(static,dbName,type) ]
	, content:`${label}${title}`
	}
)

const manager = (static,{databases}) => (
	{ links:[rootLink(static,'self'),rootLink(static,'start')]
	, books:databases
		.map(db=>databaseChunk(static,db))
	}	
) 

const series = (static,dbName,{series_name,series_id,books}) => (
	{ title:series_name
	, books:books && books.map(b=>book(static,dbName,b))
	, authors:books && books[0].authors
	, uri:`${static}${dbName}/series/${series_id}`
	}
)

const databaseLinks = (static,{name:dbName}) => 
	[ navigation(static,dbName,'book','Books')
	, navigation(static,dbName,'author','Authors')
	, navigation(static,dbName,'tag','Tags')
	, navigation(static,dbName,'series','series')
	];

const databaseChunk = (static,{name:dbName}) =>(
	{ links:[ navigationLink(static,dbName,'') ]
	, content:`view the ${dbName} catalog`
	}
);

const database = (static,db) =>(
	Object.assign
		( databaseChunk(static,db)
		, { books:databaseLinks(static, db) }
		)
);

const page = (title,author,obj) => {
	const newObj = Object.assign({},obj);
	if(!newObj.authors){newObj.authors = [author];}
	if(!newObj.title){newObj.title = title;}
	return newObj;
}

const root = (static,obj) => (
	obj.type == 'manager' ? 
		manager(static,obj) :
		database(static,obj)
)

module.exports = 
	{ author
	, book
	, cover
	, links
	, manager
	, database
	, root
	, page
	, series
	}