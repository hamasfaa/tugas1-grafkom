var canvas;
var gl;

var numVertices = 0;
var points = [];
var colors = [];

var brickWidth = 3.0;
var brickHeight = 1.0;
var brickDepth = 0.2;
var mortarThickness = 0.02;

var wallWidth = 6.50;
var wallHeight = 3.0;
var wallDepth = 1.0;

var letterHeight = 3.0;
var letterWidth = 1.0;
var letterDepth = 1.0;
var letterSpacing = 0.5;

var near = -20;
var far = 20;

var left = -6.0;
var right = 6.0;
var ytop = 4.0;
var bottom = -4.0;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var zoomLevel = 1.0;
var rotationX = 0.0;
var rotationY = 0.0;
var rotationZ = 0.0;
var autoRotating = false;

var brickColors = [
    vec4(60 / 255, 56 / 255, 47 / 255, 1.0),     // rgba(60,56,47)
    vec4(63 / 255, 59 / 255, 50 / 255, 1.0),    // rgba(63,59,50)
    vec4(77 / 255, 69 / 255, 56 / 255, 1.0),    // rgba(77,69,56)
    vec4(103 / 255, 99 / 255, 88 / 255, 1.0),   // rgba(103,99,88)
    vec4(125 / 255, 113 / 255, 97 / 255, 1.0),  // rgba(125,113,97)
    vec4(128 / 255, 119 / 255, 102 / 255, 1.0), // rgba(128,119,102)
];

var mortarColor = vec4(0.8, 0.8, 0.75, 1.0);
var letterColor = vec4(26 / 255, 65 / 255, 132 / 255, 1.0);
var letterBackColor = vec4(68 / 255, 75 / 255, 68 / 255, 1.0);


window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    createBrickWall();
    createLetters();

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");

    initControls();

    render();
}

function createLetters() {
    var letterY = wallHeight / 2 - 0.97;
    var totalLetterWidth = 2 * letterWidth + letterSpacing;
    var startX = -totalLetterWidth / 2 - 1;
    var letterZ = -wallDepth / 2;

    // Buat huruf "I"
    createLetterI(startX, letterY, letterZ);

    // Buat huruf "F"
    createLetterF(startX + letterWidth + letterSpacing, letterY, letterZ);
}

function createLetterI(x, y, z) {
    var thickness = 0.3;

    createLetterBlock(x + letterWidth / 2 - thickness / 2, y, z, thickness, letterHeight, letterDepth);
}

function createLetterF(x, y, z) {
    var thickness = 0.3;

    // Garis vertikal kiri huruf F
    createLetterBlock(x, y, z, thickness, letterHeight, letterDepth);

    // Garis horizontal atas
    createLetterBlock(x, y + letterHeight - thickness, z, letterWidth * 1.5, thickness, letterDepth);

    // Garis horizontal tengah
    createLetterBlock(x, y + letterHeight / 2 - thickness / 2, z, letterWidth * 2.75, thickness, letterDepth);
}

function createLetterBlock(x, y, z, width, height, depth) {
    var vertices = [
        // Front face
        vec4(x, y, z + wallDepth, 1.0),
        vec4(x + width, y, z + wallDepth, 1.0),
        vec4(x + width, y + height, z + wallDepth, 1.0),
        vec4(x, y + height, z + wallDepth, 1.0),

        // Back face
        vec4(x, y, z, 1.0),
        vec4(x, y + height, z, 1.0),
        vec4(x + width, y + height, z, 1.0),
        vec4(x + width, y, z, 1.0)
    ];

    cubeFace(vertices[1], vertices[0], vertices[3], vertices[2], letterColor); // front
    cubeFace(vertices[2], vertices[3], vertices[5], vertices[6], letterColor); // right  
    cubeFace(vertices[3], vertices[0], vertices[4], vertices[5], letterColor); // top
    cubeFace(vertices[6], vertices[5], vertices[4], vertices[7], letterBackColor); // back
    cubeFace(vertices[4], vertices[0], vertices[1], vertices[7], letterColor); // left
    cubeFace(vertices[7], vertices[1], vertices[2], vertices[6], letterColor); // bottom
}

function createBrickWall() {
    points = [];
    colors = [];
    numVertices = 0;

    var startX = -wallWidth / 2;
    var startY = -wallHeight / 2;
    var startZ = -wallDepth / 2;

    createMortarBase(startX, startY, startZ);

    var rowsCount = Math.floor(wallHeight / (brickHeight + mortarThickness));

    for (var row = 0; row < rowsCount; row++) {
        var y = startY + row * (brickHeight + mortarThickness);
        createBrickRow(startX, y, startZ, row);

        if (row < rowsCount - 1) {
            createMortarHorizontal(startX, y + brickHeight, startZ);
        }
    }
}

function createBrickRow(startX, y, startZ, rowIndex) {
    var offsetX = (rowIndex % 2) * (brickWidth / 2);
    var currentX = startX + offsetX;
    var availableWidth = wallWidth - offsetX;

    var fullBricksCount = Math.floor(availableWidth / (brickWidth + mortarThickness));
    var usedWidth = fullBricksCount * (brickWidth + mortarThickness);
    var remainingWidth = availableWidth - usedWidth;

    if (remainingWidth > mortarThickness * 2) {
        var sideWidth = (remainingWidth - mortarThickness) / 2;

        if (offsetX > 0 && sideWidth > mortarThickness) {
            var leftBrickWidth = Math.min(sideWidth, offsetX - mortarThickness);
            if (leftBrickWidth > mortarThickness) {
                var brickColor = brickColors[Math.floor(Math.random() * brickColors.length)];
                createCustomBrick(startX, y, startZ, leftBrickWidth, brickColor);
                createMortarVertical(startX + leftBrickWidth, y, startZ);
                currentX = startX + leftBrickWidth + mortarThickness;
            }
        }

        for (var i = 0; i < fullBricksCount; i++) {
            var brickColor = brickColors[Math.floor(Math.random() * brickColors.length)];
            createBrick(currentX, y, startZ, brickColor);
            currentX += brickWidth;

            if (i < fullBricksCount - 1) {
                createMortarVertical(currentX, y, startZ);
                currentX += mortarThickness;
            }
        }

        var rightRemainingWidth = startX + wallWidth - currentX;

        if (rightRemainingWidth > mortarThickness * 2) {
            var rightBrickWidth = rightRemainingWidth - mortarThickness;
            if (rightBrickWidth > mortarThickness) {
                createMortarVertical(currentX, y, startZ);
                currentX += mortarThickness;
                var brickColor = brickColors[Math.floor(Math.random() * brickColors.length)];
                createCustomBrick(currentX, y, startZ, rightBrickWidth, brickColor);
            }
        }
    } else {
        for (var i = 0; i < fullBricksCount; i++) {
            var brickColor = brickColors[Math.floor(Math.random() * brickColors.length)];
            createBrick(currentX, y, startZ, brickColor);
            currentX += brickWidth;

            if (i < fullBricksCount - 1) {
                createMortarVertical(currentX, y, startZ);
                currentX += mortarThickness;
            }
        }
    }
}

function createBrick(x, y, z, color) {
    createCustomBrick(x, y, z, brickWidth, color);
}

function createCustomBrick(x, y, z, width, color) {
    var vertices = [
        vec4(x, y, z + wallDepth, 1.0),
        vec4(x + width, y, z + wallDepth, 1.0),
        vec4(x + width, y + brickHeight, z + wallDepth, 1.0),
        vec4(x, y + brickHeight, z + wallDepth, 1.0),

        vec4(x, y, z, 1.0),
        vec4(x, y + brickHeight, z, 1.0),
        vec4(x + width, y + brickHeight, z, 1.0),
        vec4(x + width, y, z, 1.0)
    ];

    cubeFace(vertices[1], vertices[0], vertices[3], vertices[2], color); // front
    cubeFace(vertices[2], vertices[3], vertices[5], vertices[6], color); // right  
    cubeFace(vertices[3], vertices[0], vertices[4], vertices[5], color); // top
    cubeFace(vertices[6], vertices[5], vertices[4], vertices[7], color); // back
    cubeFace(vertices[4], vertices[0], vertices[1], vertices[7], color); // left
    cubeFace(vertices[7], vertices[1], vertices[2], vertices[6], color); // bottom
}

function createMortarBase(x, y, z) {
    var vertices = [
        vec4(x, y - mortarThickness, z + wallDepth, 1.0),
        vec4(x + wallWidth, y - mortarThickness, z + wallDepth, 1.0),
        vec4(x + wallWidth, y, z + wallDepth, 1.0),
        vec4(x, y, z + wallDepth, 1.0),

        vec4(x, y - mortarThickness, z, 1.0),
        vec4(x, y, z, 1.0),
        vec4(x + wallWidth, y, z, 1.0),
        vec4(x + wallWidth, y - mortarThickness, z, 1.0)
    ];

    cubeFace(vertices[1], vertices[0], vertices[3], vertices[2], mortarColor); // front
    cubeFace(vertices[2], vertices[3], vertices[5], vertices[6], mortarColor); // right  
    cubeFace(vertices[3], vertices[0], vertices[4], vertices[5], mortarColor); // top
    cubeFace(vertices[6], vertices[5], vertices[4], vertices[7], mortarColor); // back
    cubeFace(vertices[4], vertices[0], vertices[1], vertices[7], mortarColor); // left
    cubeFace(vertices[7], vertices[1], vertices[2], vertices[6], mortarColor); // bottom
}

function createMortarVertical(x, y, z) {
    var vertices = [
        vec4(x, y, z + wallDepth, 1.0),
        vec4(x + mortarThickness, y, z + wallDepth, 1.0),
        vec4(x + mortarThickness, y + brickHeight, z + wallDepth, 1.0),
        vec4(x, y + brickHeight, z + wallDepth, 1.0),

        vec4(x, y, z, 1.0),
        vec4(x, y + brickHeight, z, 1.0),
        vec4(x + mortarThickness, y + brickHeight, z, 1.0),
        vec4(x + mortarThickness, y, z, 1.0)
    ];

    cubeFace(vertices[1], vertices[0], vertices[3], vertices[2], mortarColor); // front
    cubeFace(vertices[2], vertices[3], vertices[5], vertices[6], mortarColor); // right  
    cubeFace(vertices[3], vertices[0], vertices[4], vertices[5], mortarColor); // top
    cubeFace(vertices[6], vertices[5], vertices[4], vertices[7], mortarColor); // back
    cubeFace(vertices[4], vertices[0], vertices[1], vertices[7], mortarColor); // left
    cubeFace(vertices[7], vertices[1], vertices[2], vertices[6], mortarColor); // bottom
}

function createMortarHorizontal(x, y, z) {
    var vertices = [
        vec4(x, y, z + wallDepth, 1.0),
        vec4(x + wallWidth, y, z + wallDepth, 1.0),
        vec4(x + wallWidth, y + mortarThickness, z + wallDepth, 1.0),
        vec4(x, y + mortarThickness, z + wallDepth, 1.0),

        vec4(x, y, z, 1.0),
        vec4(x, y + mortarThickness, z, 1.0),
        vec4(x + wallWidth, y + mortarThickness, z, 1.0),
        vec4(x + wallWidth, y, z, 1.0)
    ];

    cubeFace(vertices[1], vertices[0], vertices[3], vertices[2], mortarColor); // front
    cubeFace(vertices[2], vertices[3], vertices[5], vertices[6], mortarColor); // right  
    cubeFace(vertices[3], vertices[0], vertices[4], vertices[5], mortarColor); // top
    cubeFace(vertices[6], vertices[5], vertices[4], vertices[7], mortarColor); // back
    cubeFace(vertices[4], vertices[0], vertices[1], vertices[7], mortarColor); // left
    cubeFace(vertices[7], vertices[1], vertices[2], vertices[6], mortarColor); // bottom
}

function cubeFace(a, b, c, d, color) {
    points.push(a);
    colors.push(color);
    points.push(b);
    colors.push(color);
    points.push(c);
    colors.push(color);

    points.push(a);
    colors.push(color);
    points.push(c);
    colors.push(color);
    points.push(d);
    colors.push(color);

    numVertices += 6;
}

function initControls() {
    // Zoom control
    var zoomSlider = document.getElementById("zoom");
    var zoomValue = document.getElementById("zoomValue");
    zoomSlider.oninput = function () {
        zoomLevel = parseFloat(this.value);
        zoomValue.innerHTML = zoomLevel.toFixed(1);
    };

    // Rotation X control
    var rotateXSlider = document.getElementById("rotateX");
    var rotateXValue = document.getElementById("rotateXValue");
    rotateXSlider.oninput = function () {
        rotationX = parseFloat(this.value);
        rotateXValue.innerHTML = rotationX + "°";
    };

    // Rotation Y control
    var rotateYSlider = document.getElementById("rotateY");
    rotationY = 15;
    var rotateYValue = document.getElementById("rotateYValue");
    rotateYValue.innerHTML = "15°";
    rotateYSlider.oninput = function () {
        rotationY = parseFloat(this.value);
        rotateYValue.innerHTML = rotationY + "°";
    };

    // Rotation Z control
    var rotateZSlider = document.getElementById("rotateZ");
    var rotateZValue = document.getElementById("rotateZValue");
    rotateZSlider.oninput = function () {
        rotationZ = parseFloat(this.value);
        rotateZValue.innerHTML = rotationZ + "°";
    };
}

function resetView() {
    zoomLevel = 1.0;
    rotationX = 0.0;
    rotationY = 15.0;
    rotationZ = 0.0;
    autoRotating = false;

    document.getElementById("zoom").value = 1.0;
    document.getElementById("zoomValue").innerHTML = "1.0";
    document.getElementById("rotateX").value = 0;
    document.getElementById("rotateXValue").innerHTML = "0°";
    document.getElementById("rotateY").value = 15;
    document.getElementById("rotateYValue").innerHTML = "15°";
    document.getElementById("rotateZ").value = 0;
    document.getElementById("rotateZValue").innerHTML = "0°";
}

function autoRotate() {
    autoRotating = !autoRotating;
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Auto rotation
    if (autoRotating) {
        rotationY += 0.5;
        if (rotationY >= 360) rotationY = 0;
        rotationX += 0.5;
        if (rotationX >= 360) rotationX = 0;
        rotationZ += 0.5;
        if (rotationZ >= 360) rotationZ = 0;
        document.getElementById("rotateX").value = rotationX;
        document.getElementById("rotateXValue").innerHTML = Math.round(rotationX) + "°";
        document.getElementById("rotateY").value = rotationY;
        document.getElementById("rotateYValue").innerHTML = Math.round(rotationY) + "°";
        document.getElementById("rotateZ").value = rotationZ;
        document.getElementById("rotateZValue").innerHTML = Math.round(rotationZ) + "°";
    }

    var scaledLeft = left / zoomLevel;
    var scaledRight = right / zoomLevel;
    var scaledTop = ytop / zoomLevel;
    var scaledBottom = bottom / zoomLevel;

    projectionMatrix = ortho(scaledLeft, scaledRight, scaledBottom, scaledTop, near, far);

    modelViewMatrix = mat4();

    modelViewMatrix = mult(modelViewMatrix, rotateX(radians(rotationX)));
    modelViewMatrix = mult(modelViewMatrix, rotateY(radians(rotationY)));
    modelViewMatrix = mult(modelViewMatrix, rotateZ(radians(rotationZ)));

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    requestAnimFrame(render);
}

function flatten(v) {
    var n = v.length;
    var elemsAreArrays = false;

    if (Array.isArray(v[0])) {
        elemsAreArrays = true;
        n *= v[0].length;
    }

    var floats = new Float32Array(n);

    if (elemsAreArrays) {
        var idx = 0;
        for (var i = 0; i < v.length; ++i) {
            for (var j = 0; j < v[i].length; ++j) {
                floats[idx++] = v[i][j];
            }
        }
    }
    else {
        for (var i = 0; i < v.length; ++i) {
            floats[i] = v[i];
        }
    }

    return floats;
}

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback, element) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

function ortho(left, right, bottom, top, near, far) {
    if (left == right) { throw "ortho(): left and right are equal"; }
    if (bottom == top) { throw "ortho(): bottom and top are equal"; }
    if (near == far) { throw "ortho(): near and far are equal"; }

    var w = right - left;
    var h = top - bottom;
    var d = far - near;

    var result = mat4();
    result[0][0] = 2.0 / w;
    result[1][1] = 2.0 / h;
    result[2][2] = -2.0 / d;
    result[0][3] = -(left + right) / w;
    result[1][3] = -(top + bottom) / h;
    result[2][3] = -(near + far) / d;

    return result;
}

function mat4() {
    var result = [];
    for (var i = 0; i < 4; i++) {
        result[i] = [];
        for (var j = 0; j < 4; j++) {
            result[i][j] = (i == j) ? 1.0 : 0.0;
        }
    }
    result.matrix = true;
    result.type = 'mat4';
    return result;
}

function mult(u, v) {
    var result = mat4();

    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
            result[i][j] = 0.0;
            for (var k = 0; k < 4; k++) {
                result[i][j] += u[i][k] * v[k][j];
            }
        }
    }

    return result;
}

function rotateX(theta) {
    var c = Math.cos(theta);
    var s = Math.sin(theta);
    var rx = mat4();

    rx[1][1] = c;
    rx[1][2] = -s;
    rx[2][1] = s;
    rx[2][2] = c;

    return rx;
}

function rotateY(theta) {
    var c = Math.cos(theta);
    var s = Math.sin(theta);
    var ry = mat4();

    ry[0][0] = c;
    ry[0][2] = s;
    ry[2][0] = -s;
    ry[2][2] = c;

    return ry;
}

function rotateZ(theta) {
    var c = Math.cos(theta);
    var s = Math.sin(theta);
    var rz = mat4();

    rz[0][0] = c;
    rz[0][1] = -s;
    rz[1][0] = s;
    rz[1][1] = c;

    return rz;
}