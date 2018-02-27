
const vfs = require( 'sack.vfs');
const vol = vfs.Volume();
const path = require( 'path' );


const _debug = true;

module.exports = exports = function( req, res ) {
	_debug && console.log( "URL:", req.url );

	var filePath = __dirname + req.url;
		var filePath = '.' + unescape(req.url);
						if( filePath === "./" ) {
							filePath = "./index.html";
						}
				
	_debug && console.log( "Request is from:", req.connection.remoteAddress );
				// req.connection.remotePort
				// req.headers.origin?  // not impelmented yet for sure in request
	var extname = path.extname(filePath);
	var contentType = 'text/html';
	switch (extname) {
		  case '.js':
			  contentType = 'text/javascript';
			  break;
		  case '.css':
			  contentType = 'text/css';
			  break;
		  case '.json':
			  contentType = 'application/json';
			  break;
		  case '.png':
			  contentType = 'image/png';
			  break;
		  case '.jpg':
			  contentType = 'image/jpg';
			  break;
		  case '.wav':
			  contentType = 'audio/wav';
			  break;
	}
		
		
	_debug && console.log( "serving a relative...", req.url, filePath );
	if( vol.exists( filePath  ) ) {
		var content;
		if( filePath.endsWith( ".js.html" ) )
			content = process( vol.read( filePath ).toString() );
		else {
			var tmp = vol.read( filePath );
			if( tmp )
				content = tmp;//.toString();
			else {
				res.writeHead(404);
				res.end('<HTML><head><script src="userAuth/unauthorized.js"></script></head></HTML>');
										return;
			}
		}
                console.log( "send buffer...", content );
		res.writeHead(200, { 'Content-Type': contentType });
		res.end(content);
		_debug && console.log( "serve.js:ending with success...", content.length, content.byteLength );
	}
	else{
		_debug && console.log( "exists on", filePath, "is false.")
		res.writeHead(404);
		res.end('<HTML><head><script src="userAuth/unauthorized.js"></script></head></HTML>');
	}
}

function process( HTML ) {
	var page = eval("`"+HTML+"`");
	return page;
}
