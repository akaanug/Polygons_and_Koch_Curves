/*

For each model in your scene:
    1- Convert your OBJ model data into appropriate arrays for rendering.
    2- Create a buffer object in the GPU’s memory.
    3- Copy your model data into the buffer object.

*/


/*

Shaders:
    - A vertex shader transforms each vertex of a model to its correct location for the current scene.
    - A fragment shader assigns a color to each fragment (pixel) that composed a point, line, or triangle.

*/

var program;
var canvas;
var gl;

//polygon variables
var bufferId;
var vPos;
var cBufferId;
var vColor;

var vColors = []; //stores color of the vertices
var vertices = []; //stores vertices
var verticeIndex = 0; //stores amount of vertices
var t; //current coordinates of the cursor
var lastClickedCoor; //last clicked point
var polygonExists = false; //to avoid drawing polygons without sufficient vertices
var allLineVertices = []; //vertices of the polygon
var fillPolygon = false; //flag to fill/unfill polygon
var polygonIsFormed = false; //used in the render function to determine when to draw polygon
var generateKochCurve = false; //used in the render function to determine when to draw koch curve
var currentColor = flatten( vec4(0, 0, 0, 1) );
var kochIteration = 0;
var currentBackground = flatten( vec4(0.8, 0.8, 0.8, 1) );
var load = false; //load from JSON file if true
var JSONkochIteration = 0; //koch iteration amt gotten from loaded JSON file


/**
 * Save the current canvas data into a JSON file.
 * @param {string} fileName Name of the file to save into
 * @param {string} contentType text/plain
 */
function saveData(fileName, contentType) {
    var a = document.createElement("a");
    var polygon = { vertexAmt: verticeIndex, coordinates: vertices,
         colors: vColors, kochIterationAmt: kochIteration, background: currentBackground };
    var jsonData = JSON.stringify(polygon, null, "\t");
    var file = new Blob([jsonData], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

/**
 * Load the JSON file into the canvas.
 * @param {string} jsonObject Parsed JSON file.
 */
function loadData( jsonObject ) {
    var vertexAmt = jsonObject.vertexAmt;
    JSONkochIteration = jsonObject.kochIterationAmt;
    var coordinates = jsonObject.coordinates;
    var colors = jsonObject.colors;
    var bg = jsonObject.background;

    //first clear the current Canvas
    clearPolygon();
    render();


    if( JSONkochIteration == 0 ) { //there is no koch curve
        generateKochCurve = false;
    } else {
        load = true;
        kochIteration = JSONkochIteration;
        generateKochCurve = true;
    }

    if( vertexAmt > 2 ) { //there is a polygon
        load = true;
        verticeIndex = vertexAmt;
        for( var i = 0; i < vertexAmt; i++ ) {
            //convert
            vertices.push( flatten( vec2(coordinates[i][0], coordinates[i][1] )) );
            allLineVertices.push( flatten( vec2(coordinates[i][0], coordinates[i][1] )) );
            vColors.push( flatten( vec4(colors[i][0], colors[i][1],
            colors[i][2], colors[i][3] )) );
        }

        //create polygon
        polygonIsFormed = true;
        polygonExists = true;
    }

    //load the background color
    gl.clearColor( bg[0], bg[1], bg[2], bg[3] );

    render();
}

/**
* This function draws or loads a koch curve
*/
function drawKochCurve() {
    if(load) { //load the iteration amount parsed from JSON file
        kochIteration = JSONkochIteration;
    } else {
        //get value of input field and convert it to int from string
        kochIteration = parseInt( document.getElementById( "quantity" ).value );
    }


    var n = initKochCurveBuffers( kochIteration );
    if ( n < 0 ) {
        console.log( 'Failed to set the positions of the vertices' );
        return;
    }
    gl.drawArrays( gl.LINE_STRIP, 0, n );
}

/**
* This function initializes koch curve buffers. Calls getNewIteration function iteration times.
* @param {int} iteration iteration amount of the koch curve
* @returns {int} amount of lines
*/
function initKochCurveBuffers( iteration ) {
    var lineVertices = vec4( -1, 0, 1, 0 ); //starting line
    var allLineVertices = [];
    var lineLength = 2; //length of the line is 2 at the beginning ( x = -1 to x = 1 )
    var lineAmount = Math.pow( 2, 3 * (iteration - 1) );

    //set the line length based on the iteration amount
    //lineLength = lineLength / Math.pow(4, iteration - 1);

    var startPt = vec2(-1,0);
    var endPt = vec2(1,0);

    allLineVertices.push(startPt);
    allLineVertices.push(endPt);

    for( var i = 1; i < iteration; i++ ) {
        allLineVertices = getNewIteration( allLineVertices, lineLength );
        lineLength = lineLength / 4;
    }

    var amtOfVertices = allLineVertices.length;

    var kochCurveBuffer = gl.createBuffer();
    if ( !kochCurveBuffer ) {
        console.log( 'Failed to create the buffer object' );
        return -1;
    }

    gl.bindBuffer( gl.ARRAY_BUFFER, kochCurveBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, amtOfVertices * 8, gl.STATIC_DRAW );

    for( var i = 0; i < amtOfVertices; i++ ) {
        gl.bufferSubData( gl.ARRAY_BUFFER, 8 * i, flatten( allLineVertices[i] ) );
    }

    var aPosition = gl.getAttribLocation( program, 'vPosition' );
    if ( aPosition < 0 ) {
        console.log( 'Failed to get the storage location of vPosition' );
        return -1;
    }

    gl.vertexAttribPointer( aPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( aPosition );

    //for colors
    var kochColorBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, kochColorBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, 16 * amtOfVertices, gl.STATIC_DRAW );

    var kochColor = vec4(0, 0, 0, 1)

    for( var i = 0; i < amtOfVertices; i++ ) {
        gl.bufferSubData( gl.ARRAY_BUFFER, 16 * i, flatten(kochColor) );
    }

    vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    return allLineVertices.length;
}



/**
* This function generates new iteration of koch curve based on the given vertices and length
* @param {int} lineLength current length of each of the lines of the koch curve
* @returns {Array<vec2>} returns all of the lines that the next iteration(now current) contains
*/
function getNewIteration(kochVertices, lineLength) {

    var newKochIteration = [];
    var newLineLength = lineLength / 4;

    for( var i = 0; i < kochVertices.length - 1; i++ ) {
        var startPt = kochVertices[i];
        var endPt = kochVertices[i + 1];

        var newKochCurve = getSingleKochCurve( startPt, endPt, newLineLength );
        newKochIteration = newKochIteration.concat(newKochCurve);
    }

    return newKochIteration;
}


/**
*      ____
*     |   |
* ____|   |    _____
*         |    |
*         |____|
*
* Calculate the direction of the line(Right, Left, Up, Down) and
* draw 8 smaller lines instead of one single line (a koch curve) accordingly.
* @param {vec2} startPt starting point of the line
* @param {vec2} endPt end point of the line
* @param {int} lineLength length of each small line
* @returns {Array<vec2>} each of the 8 lines
*/
function getSingleKochCurve( startPt, endPt, lineLength ) {

    var direction;
    var lines = [];

    if( (endPt[0] > startPt[0]) && (endPt[1] == startPt[1]) ) { //direction = right(0)
        direction = 0;
    } else if( (endPt[0] == startPt[0]) && (endPt[1] > startPt[1]) ) { //direction = up(1)
        direction = 1;
    } else if( (endPt[0] == startPt[0]) && (endPt[1] < startPt[1]) ) { //direction = down(-1)
        direction = -1;
    } else if( (endPt[0] < startPt[0]) && (endPt[1] == startPt[1]) ) { //direction = left(2)
        direction = 2;
    }

    if( direction == 0 ) { //right
        var pt0 = startPt; //first point
        var pt1 = vec2( startPt[0] + lineLength, startPt[1] );
        var pt2 = vec2( pt1[0], pt1[1] + lineLength );
        var pt3 = vec2( pt2[0] + lineLength, pt2[1] );
        var pt4 = vec2( pt3[0], pt3[1] - lineLength );
        var pt5 = vec2( pt4[0], pt4[1] - lineLength );
        var pt6 = vec2( pt5[0] + lineLength, pt5[1] );
        var pt7 = vec2( pt6[0], pt6[1] + lineLength );
        var pt8 = endPt; //last point
    } else if( direction == 2 ) { //left
        var pt0 = startPt; //first point
        var pt1 = vec2( startPt[0] - lineLength, startPt[1] );
        var pt2 = vec2( pt1[0], pt1[1] - lineLength );
        var pt3 = vec2( pt2[0] - lineLength, pt2[1] );
        var pt4 = vec2( pt3[0], pt3[1] + lineLength );
        var pt5 = vec2( pt4[0], pt4[1] + lineLength );
        var pt6 = vec2( pt5[0] - lineLength, pt5[1] );
        var pt7 = vec2( pt6[0], pt6[1] - lineLength );
        var pt8 = endPt; //last point
    } else { //up or down
        var change = lineLength * direction;
        var pt0 = startPt; //first point
        var pt1 = vec2( startPt[0], startPt[1] + change );
        var pt2 = vec2( pt1[0] - change, pt1[1] );
        var pt3 = vec2( pt2[0], pt2[1] + change );
        var pt4 = vec2( pt3[0] + change, pt3[1] );
        var pt5 = vec2( pt4[0] + change, pt4[1] );
        var pt6 = vec2( pt5[0], pt5[1] + change );
        var pt7 = vec2( pt6[0] - change, pt6[1] );
        var pt8 = endPt; //last point
    }

    lines.push( pt0 );
    lines.push( pt1 );
    lines.push( pt2 );
    lines.push( pt3 );
    lines.push( pt4 );
    lines.push( pt5 );
    lines.push( pt6 );
    lines.push( pt7 );
    lines.push( pt8 );

    return lines;
}

/**
* Draws the edges of the formed/unformed polygon.
*/
function drawAllLines() {

    //if there are LTE 1 vertices(not enough to create a line)
    if( verticeIndex <= 1 ) {
        return;
    }

    var allLinesBuffer = gl.createBuffer();
    if ( !allLinesBuffer ) {
        console.log( 'Failed to create the buffer object' );
        return -1;
    }

    gl.bindBuffer( gl.ARRAY_BUFFER, allLinesBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, verticeIndex * 8, gl.STATIC_DRAW );

    for( var i = 0; i < verticeIndex; i++ ) {
        gl.bufferSubData( gl.ARRAY_BUFFER, 8 * i, allLineVertices[i] );
    }

    var aPosition = gl.getAttribLocation( program, 'vPosition' );
    if ( aPosition < 0 ) {
        console.log( 'Failed to get the storage location of vPosition' );
        return -1;
    }

    gl.vertexAttribPointer( aPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( aPosition );

    //for colors
    var colorBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, colorBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, 16 * verticeIndex, gl.STATIC_DRAW );

    for( var i = 0; i < verticeIndex; i++ ) {
        gl.bufferSubData( gl.ARRAY_BUFFER, 16 * i, vColors[i] );
    }

    vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    gl.drawArrays( gl.LINE_STRIP, 0, verticeIndex );


    if( !load ) { //if the polygon/lines is NOT loaded from parsing JSON file
        //detect whether the polygon is formed by checking the first
        //and the last vertices
        var firstPolyPt = vertices[0];
        if( calculateDistance(lastClickedCoor, firstPolyPt) && (verticeIndex > 2) ) {
            polygonIsFormed = true;
        } else if( polygonIsFormed ) {
            //clear the polygon edges if a point other than the last vertex is clicked
            polygonIsFormed = false;
            clearPolygon();
            render();
        }
    }

    return;
}

/**
* Draws a line that has a fixed point a which is the last clicked
* coordinates and a point b that traces the cursor.
*/
function drawLine() {
    var n = initLineBuffers();
    if ( n < 0 ) {
        console.log( 'Failed to set the positions of the vertices' );
        return;
    }
    gl.drawArrays( gl.LINES, 0, n );
}

/**
* Initializes line buffers.
*/
function initLineBuffers() {
    var vertices = vec4( lastClickedCoor[0], lastClickedCoor[1], t );
    vertices = flatten(vertices);
    var n = 2;

    var vertexBuffer = gl.createBuffer();
    if ( !vertexBuffer ) {
        console.log( 'Failed to create the buffer object' );
        return -1;
    }

    gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW );

    var aPosition = gl.getAttribLocation( program, 'vPosition' );
    if ( aPosition < 0 ) {
        console.log( 'Failed to get the storage location of vPosition' );
        return -1;
    }


    gl.vertexAttribPointer( aPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( aPosition );

    //for colors
    var lineColorBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, lineColorBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, 32, gl.STATIC_DRAW );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, vColors[vColors.length - 1] );
    gl.bufferSubData( gl.ARRAY_BUFFER, 16, flatten(currentColor) );

    vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    return n;
}

/**
* Draws or loads a polygon.
*/
function drawPolygon() {
    var n = initPolygonBuffers();
    if ( n < 0 ) {
        console.log( 'Failed to set the positions of the vertices' );
        return;
    }
    gl.drawArrays( gl.TRIANGLE_FAN, 0, n );

    if( !load ) { //if the polygon is not loaded which means it formed with clicks:
        //clear the polygon data only if a new click is occurred
        //if the first vertex of the polygon and last clicked place are different,
        //clear the polygon to make sure that the arrays are empty and ready to use
        var firstPolyPt = vertices[0];
        if( firstPolyPt != null && !calculateDistance(lastClickedCoor, firstPolyPt) ) {
            clearPolygon();
        }
    }

}


/**
* Clear the polygon and lines(edges) of the polygon.
*/
function clearPolygon() {
    verticeIndex = 0;
    vertices = [];
    vColors = [];
    polygonExists = false;
    allLineVertices = [];
}


/**
* overwrites program, bufferId, vPos, cBufferId and vColor attributes
* initializes each coordinate of the polygon with the number of vertices
* @return {int} amount of vertices
*/
function initPolygonBuffers() {
    var n = verticeIndex;

    var polygonBuffer = gl.createBuffer();
    if ( !polygonBuffer ) {
        console.log( 'Failed to create the buffer object' );
        return -1;
    }

    //select buffer
    gl.bindBuffer( gl.ARRAY_BUFFER, polygonBuffer );

    //specify the memory allocation in the buffer
    gl.bufferData( gl.ARRAY_BUFFER, 8 * n, gl.STATIC_DRAW );

    //coordinates of the lines: (v0,v1)(v1,v2)(v2,v3)(v3,v4)... [LINE_STRIP]
    for( var i = 0; i < verticeIndex; i++ ) {
        gl.bufferSubData( gl.ARRAY_BUFFER, 8 * i, vertices[i] );
    }

    var aPosition = gl.getAttribLocation( program, 'vPosition' );
    if ( aPosition < 0 ) {
        console.log( 'Failed to get the storage location of vPosition' );
        return -1;
    }

    gl.vertexAttribPointer( aPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( aPosition );

    //for colors
    var colorBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, colorBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, 16 * n, gl.STATIC_DRAW );

    for( var i = 0; i < verticeIndex; i++ ) {
        gl.bufferSubData( gl.ARRAY_BUFFER, 16 * i, vColors[i] );
    }

    vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    return n;

}


/**
* calculate the distance between two vec2's
* and check if the distance is small enough
* @return {boolean} return true if the distance is small enough
*/
function calculateDistance( a, b ) {
    deltax = a[0] - b[0];
    deltay = a[1] - b[1];

    distance = Math.sqrt( Math.pow(deltax, 2) + Math.pow(deltay, 2) );

    if( distance < 0.05 ) {
        return true;
    } else {
        return false;
    }
}

window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas, { preserveDrawingBuffer: true } );
    if ( !gl ) {
        alert( "WebGL isn't available" );
    }

    //constructor
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    //end of constructor


    //Changes background color whenever changeBg button is clicked.
    document.getElementById("changeBg").addEventListener("click", function() {
        gl.clearColor( r.value/255, g.value/255, b.value/255, 1 );
        currentBackground = flatten( vec4( r.value/255, g.value/255, b.value/255, 1 ) );
        render();
    });

    //Draws koch curve whenever drawKoch button is clicked.
    document.getElementById("drawKoch").addEventListener("click", function() {
        generateKochCurve = true;
        load = false;
        render();
    });

    //Clear koch curve whenever clearKoch button is clicked.
    document.getElementById("clearKoch").addEventListener("click", function() {
        generateKochCurve = false;
        render();
    });

    //Saves the canvas whenever saveCanvas button is clicked.
    document.getElementById("saveCanvas").addEventListener("click", function() {
        saveData('jsonData.json', 'text/plain');
    });

    //reads the contents of the JSON file.
    document.querySelector("#read-button").addEventListener('click', function() {
		let file = document.querySelector("#file-input").files[0];
		let reader = new FileReader();
		reader.addEventListener('load', function(e) {
	    		let jsonObject = JSON.parse(e.target.result);
                loadData( jsonObject );
		});
		reader.readAsText(file);
	});


    canvas.addEventListener( "mousedown", function( event ) {
        //to make sure that the polygon and koch curve loaded from
        //JSON file disappears after clicking:
        if(load) {
            clearPolygon(); //clear polygon
            generateKochCurve = false; //clear koch curve
            load = false; //not loaded anymore
            polygonIsFormed = false;
        }

        // t = current point of the cursor
        t = vec2( 2 * event.clientX / canvas.width - 1,
            2 * ( canvas.height - event.clientY ) / canvas.height - 1 );
        vertices.push( flatten(t) );

        //save every vertice to draw lines of the polygon
        allLineVertices.push( flatten(t) );

        lastClickedCoor = flatten(t);

        var color = vec4( r.value/255, g.value/255, b.value/255, 1 );
        vColors.push( flatten(color) );
        verticeIndex++;

        //render if there are enough vertices and the last clicked point is
        //near the first vertex
        if( verticeIndex > 3 &&
            calculateDistance( allLineVertices[0], lastClickedCoor) ) {
                //connect last point with first point
                allLineVertices.pop();
                vertices.pop();

                //push first point as last point
                allLineVertices.push( allLineVertices[0] );
                vertices.push( allLineVertices[0] );

                polygonExists = true;
                render();
        }

    } );


    canvas.addEventListener( "mousemove", function (event) {
        // t = current point of the cursor
        t = vec2( 2 * event.clientX / canvas.width - 1,
            2 * ( canvas.height - event.clientY ) / canvas.height - 1 );

        currentColor = vec4( r.value/255, g.value/255, b.value/255, 1 );

        //if clicked at least once
        if( lastClickedCoor != null ) {
            render();
        }


    } );

    document.addEventListener("keydown", event => {
        if ( event.keyCode === 70 ) { //f key pressed
            //fill/unfill polygon
            fillPolygon = !fillPolygon;
            render();
            return;
        }
    } );

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.8, 0.8, 0.8, 1.0 );
    gl.clear( gl.COLOR_BUFFER_BIT );

}

/**
* Renders all of the components.
*/
function render() {

    gl.clear( gl.COLOR_BUFFER_BIT );

    if( generateKochCurve ) {
        drawKochCurve(load, JSONkochIteration );
    }

    drawAllLines();

    if( polygonExists && fillPolygon ) {
        drawPolygon();
    }

    //if polygon does not exist, draw the lines
    if( (verticeIndex > 0) && (!polygonExists) ) {
        drawLine();
    }

}
