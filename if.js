var canvas;
var gl;

var numVertices = 36;
var points = [];
var colors = [];

var vertices = [
    vec4(-0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, 0.5, 0.5, 1.0),
    vec4(0.5, 0.5, 0.5, 1.0),
    vec4(0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, -0.5, -0.5, 1.0),
    vec4(-0.5, 0.5, -0.5, 1.0),
    vec4(0.5, 0.5, -0.5, 1.0),
    vec4(0.5, -0.5, -0.5, 1.0)
];

var vertexColors = [
    vec4(0.0, 0.0, 0.0, 1.0),
    vec4(1.0, 0.0, 0.0, 1.0),
    vec4(1.0, 1.0, 0.0, 1.0),
    vec4(0.0, 1.0, 0.0, 1.0),
    vec4(0.0, 0.0, 1.0, 1.0),
    vec4(1.0, 0.0, 1.0, 1.0),
    vec4(0.0, 1.0, 1.0, 1.0),
    vec4(1.0, 1.0, 1.0, 1.0)
];

var near = -10;
var far = 10;
var radius = 6.0;
var theta = 0.0;
var phi = 0.0;
var dr = 5.0 * Math.PI / 180.0;

var left = -3.0;
var right = 3.0;
var ytop = 3.0;
var bottom = -3.0;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

// Control variables
var zoomLevel = 1.0;
var rotationX = 0.0;
var rotationY = 0.0;
var rotationZ = 0.0;
var autoRotating = false;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    colorCube();

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

function colorCube() {
    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(6, 5, 1, 2);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1);
}

function quad(a, b, c, d) {
    points.push(vertices[a]);
    colors.push(vertexColors[a]);
    points.push(vertices[b]);
    colors.push(vertexColors[a]);
    points.push(vertices[c]);
    colors.push(vertexColors[a]);
    points.push(vertices[a]);
    colors.push(vertexColors[a]);
    points.push(vertices[c]);
    colors.push(vertexColors[a]);
    points.push(vertices[d]);
    colors.push(vertexColors[a]);
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
    var rotateYValue = document.getElementById("rotateYValue");
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
    rotationY = 0.0;
    rotationZ = 0.0;
    autoRotating = false;

    document.getElementById("zoom").value = 1.0;
    document.getElementById("zoomValue").innerHTML = "1.0";
    document.getElementById("rotateX").value = 0;
    document.getElementById("rotateXValue").innerHTML = "0°";
    document.getElementById("rotateY").value = 0;
    document.getElementById("rotateYValue").innerHTML = "0°";
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
        rotationY += 1.0;
        if (rotationY >= 360) rotationY = 0;
        document.getElementById("rotateY").value = rotationY;
        document.getElementById("rotateYValue").innerHTML = rotationY + "°";
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