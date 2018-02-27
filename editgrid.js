"use strict";
const _debug = false;

// get self on page
var arrScripts = document.getElementsByTagName('script');
var strScriptTagId = arrScripts[arrScripts.length - 1];
//debugger;
//console.log( "HELLO! I have Context?", strScriptTagId )

var origin;
if( strScriptTagId.origin )  {
	console.log( "had a origin from external:", strScriptTagId.origin );
	var origin = strScriptTagId.origin || location.origin;
} else {
	// get relative origin to next thing....
	console.log( "Have to figure it out from src?", strScriptTagId.src );
	var filename = strScriptTagId.src.lastIndexOf( "/" );
	var origin = strScriptTagId.src.substr( 0, filename );
}

var ws = null;
if( "ws" in strScriptTagId ) {
	var handleMessageExport = null
	function handleMessages( ws, msg, _msg ) {
		handleMessageExport(ws,msg,_msg);
	}
	( ws = strScriptTagId.ws ).extraHandler = handleMessages;
	strScriptTagId.ws.send( '{"op":"sync"}' );
}

//var origin_addr = "http://localhost:45200/editgrid.js";
//var origin_addr = "https://localhost:45201/editgrid.js";
var origin_addr = origin.replace( "wss:", "https:" ).replace( "ws:", "http:" ) + "/editgrid.js";

console.log( "Browser Origin:", origin, origin_addr );
//document.body.addEventListener("load", ()=> {

setupGrid();
//---------------------------------------------------------------------------
// The remainider of this script is all within this function as a context.
//---------------------------------------------------------------------------


function setupGrid() {

window.addEventListener( "resize", handleResize );

function handleResize() {
	if( editmesh )
		for( var a = 0; a < 1; a++ ) {
			var meshrect = editmesh.getBoundingClientRect();
		        editmesh.width = meshrect.right - meshrect.left;
		        editmesh.height = meshrect.bottom - meshrect.top;
		        //console.log( "First Init", meshrect );
		}
	if( editmesh )
		drawNodes();

}


const rel_ = Gun.val.rel._;  // '#'
const val_ = Gun.obj.has._;  // '.'
const node_ = Gun.node._;  // '_'
const state_ = Gun.state._;// '>';

var rootGun = null;
var roots = [];
var graphs = [];

var nodemap = new Map();

if( Gun ) {
	Gun.on( 'opt', function(ctx) {
		var gun = ctx.gun;
		var parent = null;
		graphs.push( gun );
		var selector = addGraphSelector( gun );
		gun.on( "get", function(at){ 
			var lex = at.get, u;
			var soul = lex[rel_];
			var field = lex[val_];
			var thing = nodemap.get( soul );
			if( !thing ) {
				nodemap.set( soul, thing = { parent : parent } );
				if( !thing.parent ) {
					roots.push( { name: soul, thing: thing } );
					selector.add( roots[roots.length-1] );
					console.log( new Date(), "doing get...for soul:", soul, "field:",field );
				}
			} else {
				console.log( "Had thing already..." );
			}
			var priorParent = parent;
			parent = thing;
			this.to.next(at);
			parent = priorParent;
		} );
	} );
}





var offsetX = 500;
var offsetY = 500;
var root = document.documentElement;
//console.log( root );


var gameContainer;
var editmesh;
var visible = true;
var ctx;  // this is what to draw on...

var selectorBox = document.createElement( "DIV");
var Selectors = [];

var mouse_drag;
var mouse_size;
var mouse_over;
var selected_control;

var rootNode = null;

var nodeWidth = 120;
var nodeHeight = 22;
var nodeYScale = nodeWidth / nodeHeight ;


function makeNode( parent, nodeParent, val,field ) {
	var node = { x:0, y:0, 
		val : val,
		field : field,
		realField : field,
		gun : parent,
		parent : nodeParent,
		generation : nodeParent?nodeParent.generation+1:0,
		children : []
	};
	if( node.field.length === 21 && !node.field.includes( " " ) && node.field.match( /[a-zA-Z0-9]*/ ) )
		node.field = node.field.substr( 15 );
	if( node.parent )
		node.parent.children.push( node );

	
	parent.map().on( mapAll );
	function mapAll(val,field ) {
		var child = node.children.find( child=>child.realField === field );
		if( !child )
			makeNode( parent.get(field), node, val, field );				
		else
			child.val = val;
	}
	
	return node;
}

function addGraphSelector( gun ) {
		var group = document.createElement( "div" );
		var text = document.createElement( "P"  );
		text.id = "graphtext";
		text.style.backgroundColor = "darkslategrey";
		text.style.color = "white";
		text.innerText = "Enter a gun graph root node";
		var input = document.createElement( "INPUT" );
		input.onchange = pickRoot;
		function pickRoot() {
			//clearNodes();
			var db = gun.get( input.value );
			rootGun = db;
			rootNode = makeNode( db, null, input.value, "/" );
		}
		text.appendChild( input );
		group.appendChild( text );
		group.appendChild( document.createElement("BR"));

		selectorBox.appendChild( group );
		var selector
	return {
		add(root) {  /*{ name: soul, thing: thing }*/
			var btn = document.createElement( "BUTTON" );
			btn.innerText = root.name;
			btn.onclick = function(evt) {
				input.value = btn.innerText;
				pickRoot();
				
			}
			group.appendChild( btn );
		},
	}
}


function addEditor() {
	if( !gameContainer ) {
		gameContainer = document.createElement( "div" );
		gameContainer.style.border = 0;
		gameContainer.style.position = "absolute";
		gameContainer.style.left = 0;
		gameContainer.style.top = 0;
		gameContainer.style.width = "100%";
		gameContainer.style.height = "100%";
		gameContainer.style.zIndex = 10000;
	        
		editmesh = document.createElement( "canvas" );
	        
		gameContainer.appendChild( editmesh );
		editmesh.style.objectFit = "cover";
		editmesh.style.width = "100%";
		editmesh.style.height = "100%";
		editmesh.width = 1920;
		editmesh.height = 1080;
		editmesh.style.border = 0;

		ctx=editmesh.getContext("2d");

		editmesh.addEventListener( "mouseup", (event) => {
			if( !visible ) return;
			//console.log( "Mouse Event : ", event );
			event.preventDefault();
			mouse_drag = null;//locateTarget( document.body.childNodes, event );
			mouse_size = null;//locateTarget( document.body.childNodes, event );
		})

		editmesh.addEventListener( "mousedown", (event) => {
			//console.log( "Mouse Event : ", event );
			if( !visible ) return;
			event.preventDefault();
			mouse_drag = { x : event.clientX, y:event.clientY };
		})

		editmesh.addEventListener( "mousemove", (event) => {
			if( !visible ) return;
			//mouse_over = locateTarget( controls, event, 0 );
                        //console.log( "Mouse Move Event : ", (mouse_drag)?"DRAG":"" );
                        if( mouse_drag ) {
				event.preventDefault();

				var deltaX = ( event.clientX - mouse_drag.x );
                        	var deltaY = ( event.clientY - mouse_drag.y );
				
				offsetX += deltaX;
				offsetY += deltaY;

				mouse_drag.x = event.clientX;
				mouse_drag.y = event.clientY;

				// e is readonly...
			//mouse_drag.e.clientX = event.clientX;
			//mouse_drag.e.clientY = event.clientY;

                        }
		      })


		//selectorBox = document.createElement( "DIV") ;
		selectorBox.style.position="absolute";
		selectorBox.style.top="0%";

		gameContainer.appendChild( selectorBox )

		document.body.appendChild( gameContainer );
		handleResize();
		//defaultRefresh();
	}        
	gameContainer.style.visibility = visible?"visible":"hidden";
}

function setupKeyPress( window ) {
	var collect = '';
	var lasttick = Date.now();
	window.addEventListener( "keydown", (key)=>{
		var now;
		if( ( now = Date.now() ) - lasttick > 500 ) 
			collect = '';
		lasttick = now;

		// -----   CTRL+ALT+C and Escape for edit keys
		if( key.key == 'Escape' ) {
			if( visible ) {
				visible = false;
				gameContainer.style.visibility = "hidden"; 
			}
		}

		if( key.ctrlKey && key.altKey ) {
			if( key.key == 'c' || key.key == 'C' )
			{
				collect = ''; 
				gameContainer.style.visibility = "visible"; 
				visible = true;
				drawNodes();
			}
			console.log( "keydown..." );	
		}
	
		if( key.key == 'z' ) {
			if( key.ctrlKey ) {
				Undo();
			}
		}

		// ----- keystrokes 'edit' and 'done' to edit things.
		if( key.key == 'd' || key.key=='D' ) if( collect === '' ) collect += "d";
		if( key.key == 'o' || key.key=='O') if( collect === 'd' ) collect += "o";
		if( key.key == 'n' || key.key=='N') if( collect === 'do' ) collect += "n";
		if( key.key == 'e' || key.key=='E') {
			if( collect === 'don' ) { 
				visible = false;
				gameContainer.style.visibility = "hidden"; 
			}
		}


		if( key.key == 'e' || key.key=='E' ) if( collect === '' ) collect += "e";
		if( key.key == 'd' || key.key=='D') if( collect === 'e' ) collect += "d";
		if( key.key == 'i' || key.key=='I') if( collect === 'ed' ) collect += "i";
		if( key.key == 't' || key.key=='T') 
			if( collect === 'edi' ) { 
				collect = ''; 
				visible = true;
				addEditor();
				
			}
		
	} );
}

				addEditor();
setupKeyPress( window );

function updateNodes() {
	
	if( rootNode ) {
		updateNode( rootNode );
		rootNode.x = 0;
		rootNode.y = 0;
	}

function repelGenerations( node ) {
	var parent;
	for( parent = node.parent; parent; parent = parent.parent ) {
		var distance = ( ( parent.x - node.x ) * ( parent.x - node.x ) )
			  + ( ( parent.y - node.y ) * ( parent.y - node.y ) * nodeYScale );
		distance = Math.sqrt( distance );
		if( distance < 1 ) {
			// judge it a little in some direction...
			node.x += Math.random();
			node.y += Math.random();
		}
		else if( distance < nodeWidth ) {
			moveNode( node, ( nodeWidth - distance ) * 0.1
				, ( nodeWidth - distance ) / nodeYScale * 0.1 );
		}
		
	}
	
}

function siblings( node ) {
	
	var parent = node.parent;
	if( parent )
	parent.children.forEach( child=>{
		if( child != node ) {
			var distance = ( ( child.x - node.x ) * ( child.x - node.x ) )
				  + ( ( child.y - node.y ) * ( child.y - node.y ) * nodeYScale );
			distance = Math.sqrt( distance );
			if( distance < 1 ) {
				// judge it a little in some direction...
				node.x += Math.random();
				node.y += Math.random();
			}
			else if( distance < nodeWidth * 3 ) {
				moveNode( node,  ((node.x-child.x)/distance) * ( nodeWidth*3 - distance ) * 0.2
						, ((node.y-child.y)/distance) * ( nodeWidth*3 - distance ) / nodeYScale * 0.2 );
			}       	
			
		} 
	} );

}

// move away from everything.
function anything( node, child ) {	
			var distance = ( ( child.x - node.x ) * ( child.x - node.x ) )
				  + ( ( child.y - node.y ) * ( child.y - node.y ) * nodeYScale );
			distance = Math.sqrt( distance );
			if( distance && distance < nodeWidth * 3 ) {
				moveNode( node, ((node.x-child.x)/distance) * ( nodeWidth*3 - distance ) * 0.05
					, ((node.y-child.y)/distance) * ( nodeWidth*3 - distance ) / nodeYScale * 0.05 )
			}       	
			
}


function moveNode( node, x, y ) {
	node.x += x;
	node.y += y;
	//node.children.forEach( child=>{moveNode( child, x, y ) } );
}

function all( root, node ) {
	if( root != node )
		anything( node, root );
	root.children.forEach( child=>all( child, node ) ); 
}

function updateNode(node){
	if( !node ) return;
	if( node.parent )
	{
		var l = Math.sqrt(node.x *node.x+node.y*node.y);
		if(l) {
		 	moveNode( node, node.x * 20 / (l * (10/node.generation)/3),
		 		 ( node.y * 20 / nodeYScale ) / (l * (10/node.generation)/3) );
		}
	}
	if( node.parent ) {
		var distance = ( ( node.parent.x - node.x ) * ( node.parent.x - node.x ) )
			  + ( ( node.parent.y - node.y ) * ( node.parent.y - node.y ) * nodeYScale );
		distance = Math.sqrt( distance );
		if( distance < 1 ) {
			moveNode( node, (Math.random() -0.5) * 3, (Math.random()-0.5) * 3 )
			return updateNode( node );
		}
		if( distance < nodeWidth ) {	
			moveNode( node, ((node.x-node.parent.x)/distance) * ( nodeWidth - distance ) * 0.5,
				 ((node.y-node.parent.y)/distance) * ( nodeWidth - distance ) / nodeYScale * 0.5 );
		}
		else if( distance > ( nodeWidth * 1.5 ) ) {
			moveNode( node, - ((node.x-node.parent.x)/distance) * ( distance - nodeWidth*1.5) * 0.4 
				, - ((node.y-node.parent.y)/distance) * ( distance - nodeWidth*1.5 ) / nodeYScale * 0.4 );
		}

		all( rootNode, node );

		repelGenerations( node );

		siblings( node );
	}	

	node.children.forEach( updateNode );
}

}


function drawNodes() {
	if( !visible ) return;
        updateNodes();
	ctx.clearRect(0, 0, editmesh.width, editmesh.height);

	function forall( root, cb ) {
		for( var a = root; a; a = a.elder) cb( a );
	}

	drawControl( rootNode );


function drawControl(node){
	if( !node ) return;
	//control.rect = control.element.getBoundingClientRect();

	ctx.strokeStyle = "gray";
	ctx.beginPath();
	ctx.ellipse( offsetX + node.x, offsetY + node.y, nodeWidth, nodeHeight, 0, 0, 2*Math.PI, false );
	ctx.stroke();

	if( node.parent ) {
		ctx.strokeStyle = "red";
		ctx.beginPath();
		ctx.moveTo(offsetX + node.x, offsetY+node.y);
		ctx.lineTo(offsetX + node.parent.x, offsetY+node.parent.y);
		ctx.stroke();
	}

	var text = node.field;
	if( !node.parent )
		text = node.val;
	if( !node.children.length )
		text += " = " + node.val;
	else
		text += " .";
	ctx.font = '24px serif';
	ctx.fillStyle = 'white';
	var tm = ctx.measureText(text);
	tm.width /2

	ctx.fillText( text , offsetX + node.x + 2 - tm.width /2, offsetY + node.y + 2);
	ctx.fillStyle = 'black';
	ctx.fillText( text , offsetX + node.x - tm.width /2, offsetY + node.y );
	node.children.forEach( drawControl );
};

}


function redraw() {
	drawNodes();
	setTimeout( redraw, 100 );
}
redraw();



} // setupGrid()

