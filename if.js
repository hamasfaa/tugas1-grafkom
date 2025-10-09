var canvas;
var gl;

var vertices = [];
var colors = [];
var normals = [];
var indices = [];
var numElements = 0;

var brickWidth = 2;
var brickHeight = 1.0;
var brickDepth = 0.2;
var mortarThickness = 0.02;

var wallWidth = 6.0;
var wallHeight = 3.0;
var wallDepth = 1.0;

var letterHeight = 3.1;
var letterWidth = 1.0;
var letterDepth = 0.5;
var letterSpacing = 0.5;

var near = -20;
var far = 20;

var left = -6.0;
var right = 6.0;
var ytop = 4.0;
var bottom = -4.0;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var aspect = 800 / 600;

var zoomLevel = 1.0;
var rotationX = 0.0;
var rotationY = 0.0;
var rotationZ = 0.0;
var translationX = 0.0;
var translationY = 0.0;
var autoRotating = false;

var vBuffer;
var cBuffer;
var nBuffer;
var iBuffer;

var lightPosition = vec3(5.0, 5.0, 10.0);
var ambientLight = vec3(0.2, 0.2, 0.2);
var diffuseLight = vec3(0.8, 0.8, 0.8);
var specularLight = vec3(1.0, 1.0, 1.0);
var shininess = 32.0;
var enableLighting = true;

var lightPositionLoc, ambientLightLoc, diffuseLightLoc, specularLightLoc;
var shininessLoc, enableLightingLoc, normalMatrixLoc;

var brickColors = [
    vec4(60 / 255, 56 / 255, 47 / 255, 1.0),
    vec4(63 / 255, 59 / 255, 50 / 255, 1.0),
    vec4(77 / 255, 69 / 255, 56 / 255, 1.0),
    vec4(103 / 255, 99 / 255, 88 / 255, 1.0),
    vec4(125 / 255, 113 / 255, 97 / 255, 1.0),
    vec4(128 / 255, 119 / 255, 102 / 255, 1.0),
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

    createScene();

    // --- Setup Buffers ---

    // 1. Color Buffer (VBO untuk warna)
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // 2. Vertex Buffer (VBO untuk posisi)
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.DYNAMIC_DRAW);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // 3. Index Buffer (IBO)
    iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "uNormalMatrix");

    lightPositionLoc = gl.getUniformLocation(program, "uLightPosition");
    ambientLightLoc = gl.getUniformLocation(program, "uAmbientLight");
    diffuseLightLoc = gl.getUniformLocation(program, "uDiffuseLight");
    specularLightLoc = gl.getUniformLocation(program, "uSpecularLight");
    shininessLoc = gl.getUniformLocation(program, "uShininess");
    enableLightingLoc = gl.getUniformLocation(program, "uEnableLighting");

    initControls();
    render();
}

function createScene() {
    vertices = [];
    colors = [];
    indices = [];
    normals = [];
    numElements = 0;

    createBrickWall();
    createLetters();
}

function createLetters() {
    var letterY = wallHeight / 2 - 0.97;
    var totalLetterWidth = 2 * letterWidth + letterSpacing;
    var startX = -totalLetterWidth / 2 - 1.3;
    var letterZ = -wallDepth / 2 + 0.5;

    // Buat huruf "I"
    createLetterI(startX, letterY, letterZ);

    // Buat huruf "F"
    createLetterF(startX + letterWidth + letterSpacing, letterY, letterZ);
}

function quad(a, b, c, d, color) {
    var localVertices = [a, b, c, d];
    var baseIndex = vertices.length;

    // Calculate normal for this quad
    var v1 = subtract3(b, a);
    var v2 = subtract3(c, a);
    var normal = normalize3(cross3(v1, v2));

    for (var i = 0; i < localVertices.length; i++) {
        vertices.push(localVertices[i]);
        colors.push(color);
        normals.push(normal);
    }

    indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
    indices.push(baseIndex, baseIndex + 2, baseIndex + 3);
    numElements += 6;
}

function createCube(transformMatrix, color, backColor) {
    var baseVertices = [
        vec4(-0.5, -0.5, 0.5, 1.0),
        vec4(-0.5, 0.5, 0.5, 1.0),
        vec4(0.5, 0.5, 0.5, 1.0),
        vec4(0.5, -0.5, 0.5, 1.0),
        vec4(-0.5, -0.5, -0.5, 1.0),
        vec4(-0.5, 0.5, -0.5, 1.0),
        vec4(0.5, 0.5, -0.5, 1.0),
        vec4(0.5, -0.5, -0.5, 1.0)
    ];

    var transformedVertices = [];
    for (var i = 0; i < baseVertices.length; i++) {
        var temp = vec4();
        for (var j = 0; j < 4; j++) {
            temp[j] =
                transformMatrix[j][0] * baseVertices[i][0] +
                transformMatrix[j][1] * baseVertices[i][1] +
                transformMatrix[j][2] * baseVertices[i][2] +
                transformMatrix[j][3] * baseVertices[i][3];
        }
        transformedVertices.push(temp);
    }

    var baseIndex = vertices.length;

    var faces = [
        { indices: [1, 0, 3, 2], normal: vec3(0, 0, 1) },   // Front
        { indices: [2, 3, 7, 6], normal: vec3(1, 0, 0) },   // Right
        { indices: [3, 0, 4, 7], normal: vec3(0, -1, 0) },  // Bottom
        { indices: [6, 5, 1, 2], normal: vec3(0, 1, 0) },   // Top
        { indices: [4, 5, 6, 7], normal: vec3(0, 0, -1) },  // Back
        { indices: [5, 4, 0, 1], normal: vec3(-1, 0, 0) }   // Left
    ];

    for (var f = 0; f < faces.length; f++) {
        var face = faces[f];
        var faceColor = (f === 4 && backColor) ? backColor : color;

        for (var i = 0; i < 4; i++) {
            vertices.push(transformedVertices[face.indices[i]]);
            colors.push(faceColor);
            normals.push(face.normal);
        }

        var idx = baseIndex + f * 4;
        indices.push(idx, idx + 1, idx + 2);
        indices.push(idx, idx + 2, idx + 3);
        numElements += 6;
    }
}


function createLetterI(x, y, z) {
    var thickness = 0.5;
    var transform = mult(translate(x + letterWidth / 2, y + letterHeight / 2, z), scale(thickness, letterHeight, letterDepth));
    createCube(transform, letterColor, letterBackColor);
}

function createLetterF(x, y, z) {
    var thickness = 0.5;

    // Batang Vertikal 
    var transform1 = mult(translate(x + thickness / 2, y + letterHeight / 2, z), scale(thickness, letterHeight, letterDepth));
    createCube(transform1, letterColor, letterBackColor);

    // Batang Horizontal Atas 
    var topBarWidth = letterWidth * 1.8;
    var transform2 = mult(translate(x + topBarWidth / 2, y + letterHeight - thickness / 2, z), scale(topBarWidth, thickness, letterDepth));
    createCube(transform2, letterColor, letterBackColor);

    var middleBarWidth = letterWidth * 3;

    var transform3 = mult(translate(x + middleBarWidth / 2, y + letterHeight / 2, z), scale(middleBarWidth, thickness, letterDepth));
    createCube(transform3, letterColor, letterBackColor);
}

function createBrickWall() {
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
    var offsetX = (rowIndex % 2 === 1) ? brickWidth / 2 : 0;

    for (var currentX = startX - offsetX; currentX < startX + wallWidth;) {
        var brickColor = brickColors[Math.floor(Math.random() * brickColors.length)];
        var currentBrickWidth = brickWidth;

        // Handle bata yang terpotong di sisi kiri
        if (currentX < startX) {
            currentBrickWidth = brickWidth - (startX - currentX);
            if (currentBrickWidth > 0) {
                createCustomBrick(startX, y, startZ, currentBrickWidth, brickColor);
                var mortarX = startX + currentBrickWidth;
                if (mortarX < startX + wallWidth) {
                    createCustomBrick(mortarX, y, startZ, mortarThickness, mortarColor, brickHeight);
                }
            }
            currentX = startX + currentBrickWidth + mortarThickness;
            continue;
        }

        // Handle bata yang terpotong di sisi kanan
        if (currentX + brickWidth > startX + wallWidth) {
            currentBrickWidth = startX + wallWidth - currentX;
            if (currentBrickWidth > 0) {
                createCustomBrick(currentX, y, startZ, currentBrickWidth, brickColor);
            }
            break;
        }

        // Buat bata normal
        createCustomBrick(currentX, y, startZ, currentBrickWidth, brickColor);

        var mortarX = currentX + currentBrickWidth;
        if (mortarX < startX + wallWidth) {
            createCustomBrick(mortarX, y, startZ, mortarThickness, mortarColor, brickHeight);
            currentX = mortarX + mortarThickness;
        } else {
            break;
        }
    }
}


function createCustomBrick(x, y, z, width, color, height) {
    height = height || brickHeight;
    var transform = mult(translate(x + width / 2, y + height / 2, z + wallDepth / 2), scale(width, height, wallDepth));
    createCube(transform, color);
}


function createMortarBase(x, y, z) {
    createCustomBrick(x, y - mortarThickness, z, wallWidth, mortarColor, mortarThickness);
}

function createMortarHorizontal(x, y, z) {
    createCustomBrick(x, y, z, wallWidth, mortarColor, mortarThickness);
}

function initControls() {
    var zoomSlider = document.getElementById("zoom");
    zoomSlider.oninput = function () { zoomLevel = parseFloat(this.value); document.getElementById("zoomValue").innerHTML = zoomLevel.toFixed(1); };
    var rotateXSlider = document.getElementById("rotateX");
    rotateXSlider.oninput = function () { rotationX = parseFloat(this.value); document.getElementById("rotateXValue").innerHTML = rotationX + "°"; };
    var rotateYSlider = document.getElementById("rotateY");
    rotateYSlider.oninput = function () { rotationY = parseFloat(this.value); document.getElementById("rotateYValue").innerHTML = rotationY + "°"; };
    var rotateZSlider = document.getElementById("rotateZ");
    rotateZSlider.oninput = function () { rotationZ = parseFloat(this.value); document.getElementById("rotateZValue").innerHTML = rotationZ + "°"; };
    var translateXSlider = document.getElementById("translateX");
    translateXSlider.oninput = function () { translationX = parseFloat(this.value); document.getElementById("translateXValue").innerHTML = translationX.toFixed(1); };
    var translateYSlider = document.getElementById("translateY");
    translateYSlider.oninput = function () { translationY = parseFloat(this.value); document.getElementById("translateYValue").innerHTML = translationY.toFixed(1); };

    // Lighting controls
    var lightPosXSlider = document.getElementById("lightPosX");
    lightPosXSlider.oninput = function () { lightPosition[0] = parseFloat(this.value); document.getElementById("lightPosXValue").innerHTML = this.value; };
    var lightPosYSlider = document.getElementById("lightPosY");
    lightPosYSlider.oninput = function () { lightPosition[1] = parseFloat(this.value); document.getElementById("lightPosYValue").innerHTML = this.value; };
    var lightPosZSlider = document.getElementById("lightPosZ");
    lightPosZSlider.oninput = function () { lightPosition[2] = parseFloat(this.value); document.getElementById("lightPosZValue").innerHTML = this.value; };

    // Ambient
    document.getElementById("ambientR").oninput = function () { ambientLight[0] = parseFloat(this.value); document.getElementById("ambientRValue").innerHTML = this.value; };
    document.getElementById("ambientG").oninput = function () { ambientLight[1] = parseFloat(this.value); document.getElementById("ambientGValue").innerHTML = this.value; };
    document.getElementById("ambientB").oninput = function () { ambientLight[2] = parseFloat(this.value); document.getElementById("ambientBValue").innerHTML = this.value; };

    // Diffuse
    document.getElementById("diffuseR").oninput = function () { diffuseLight[0] = parseFloat(this.value); document.getElementById("diffuseRValue").innerHTML = this.value; };
    document.getElementById("diffuseG").oninput = function () { diffuseLight[1] = parseFloat(this.value); document.getElementById("diffuseGValue").innerHTML = this.value; };
    document.getElementById("diffuseB").oninput = function () { diffuseLight[2] = parseFloat(this.value); document.getElementById("diffuseBValue").innerHTML = this.value; };

    // Specular
    document.getElementById("specularR").oninput = function () { specularLight[0] = parseFloat(this.value); document.getElementById("specularRValue").innerHTML = this.value; };
    document.getElementById("specularG").oninput = function () { specularLight[1] = parseFloat(this.value); document.getElementById("specularGValue").innerHTML = this.value; };
    document.getElementById("specularB").oninput = function () { specularLight[2] = parseFloat(this.value); document.getElementById("specularBValue").innerHTML = this.value; };

    // Shininess
    document.getElementById("shininess").oninput = function () { shininess = parseFloat(this.value); document.getElementById("shininessValue").innerHTML = this.value; };
}

function resetView() {
    zoomLevel = 1.0; rotationX = 0.0; rotationY = 0.0; rotationZ = 0.0; translationX = 0.0; translationY = 0.0; autoRotating = false;
    document.getElementById("zoom").value = 1.0; document.getElementById("zoomValue").innerHTML = "1.0";
    document.getElementById("rotateX").value = 0; document.getElementById("rotateXValue").innerHTML = "0°";
    document.getElementById("rotateY").value = 0; document.getElementById("rotateYValue").innerHTML = "0°";
    document.getElementById("rotateZ").value = 0; document.getElementById("rotateZValue").innerHTML = "0°";
    document.getElementById("translateX").value = 0; document.getElementById("translateXValue").innerHTML = "0.0";
    document.getElementById("translateY").value = 0; document.getElementById("translateYValue").innerHTML = "0.0";
}

function resetLighting() {
    lightPosition = vec3(5.0, 5.0, 10.0);
    ambientLight = vec3(0.2, 0.2, 0.2);
    diffuseLight = vec3(0.8, 0.8, 0.8);
    specularLight = vec3(1.0, 1.0, 1.0);
    shininess = 32.0;
    enableLighting = true;

    document.getElementById("lightPosX").value = 5.0; document.getElementById("lightPosXValue").innerHTML = "5.0";
    document.getElementById("lightPosY").value = 5.0; document.getElementById("lightPosYValue").innerHTML = "5.0";
    document.getElementById("lightPosZ").value = 10.0; document.getElementById("lightPosZValue").innerHTML = "10.0";

    document.getElementById("ambientR").value = 0.2; document.getElementById("ambientRValue").innerHTML = "0.2";
    document.getElementById("ambientG").value = 0.2; document.getElementById("ambientGValue").innerHTML = "0.2";
    document.getElementById("ambientB").value = 0.2; document.getElementById("ambientBValue").innerHTML = "0.2";

    document.getElementById("diffuseR").value = 0.8; document.getElementById("diffuseRValue").innerHTML = "0.8";
    document.getElementById("diffuseG").value = 0.8; document.getElementById("diffuseGValue").innerHTML = "0.8";
    document.getElementById("diffuseB").value = 0.8; document.getElementById("diffuseBValue").innerHTML = "0.8";

    document.getElementById("specularR").value = 1.0; document.getElementById("specularRValue").innerHTML = "1.0";
    document.getElementById("specularG").value = 1.0; document.getElementById("specularGValue").innerHTML = "1.0";
    document.getElementById("specularB").value = 1.0; document.getElementById("specularBValue").innerHTML = "1.0";

    document.getElementById("shininess").value = 32; document.getElementById("shininessValue").innerHTML = "32";
    document.getElementById("enableLighting").checked = true;
}

function toggleLighting() {
    enableLighting = document.getElementById("enableLighting").checked;
}

function autoRotate() {
    autoRotating = !autoRotating;
}

function viewFront() {
    rotationX = 0;
    rotationY = 0;
    rotationZ = 0;
    updateControls();
}

function viewBack() {
    rotationX = 0;
    rotationY = 180;
    rotationZ = 0;
    updateControls();
}

function viewTop() {
    rotationX = 90;
    rotationY = 0;
    rotationZ = 0;
    updateControls();
}

function viewBottom() {
    rotationX = -90;
    rotationY = 0;
    rotationZ = 0;
    updateControls();
}

function updateControls() {
    document.getElementById("rotateX").value = rotationX;
    document.getElementById("rotateXValue").innerHTML = rotationX + "°";
    document.getElementById("rotateY").value = rotationY;
    document.getElementById("rotateYValue").innerHTML = rotationY + "°";
    document.getElementById("rotateZ").value = rotationZ;
    document.getElementById("rotateZValue").innerHTML = rotationZ + "°";
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

    var translatedVertices = [];
    for (var i = 0; i < vertices.length; i++) {
        var p = vertices[i];
        translatedVertices.push(vec4(p[0] + translationX, p[1] + translationY, p[2], p[3]));
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(translatedVertices));

    var scaledLeft = left / zoomLevel;
    var scaledRight = right / zoomLevel;
    var scaledTop = ytop / zoomLevel;
    var scaledBottom = bottom / zoomLevel;
    projectionMatrix = ortho(scaledLeft, scaledRight, scaledBottom, scaledTop, near, far);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    modelViewMatrix = mat4();
    modelViewMatrix = mult(modelViewMatrix, rotateX(radians(rotationX)));
    modelViewMatrix = mult(modelViewMatrix, rotateY(radians(rotationY)));
    modelViewMatrix = mult(modelViewMatrix, rotateZ(radians(rotationZ)));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    // Calculate and set normal matrix
    var normalMatrix = mat3FromMat4(modelViewMatrix);
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten3(normalMatrix));

    // Set lighting uniforms
    gl.uniform3fv(lightPositionLoc, lightPosition);
    gl.uniform3fv(ambientLightLoc, ambientLight);
    gl.uniform3fv(diffuseLightLoc, diffuseLight);
    gl.uniform3fv(specularLightLoc, specularLight);
    gl.uniform1f(shininessLoc, shininess);
    gl.uniform1i(enableLightingLoc, enableLighting);

    gl.drawElements(gl.TRIANGLES, numElements, gl.UNSIGNED_SHORT, 0);

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
    } else {
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

function radians(degrees) {
    return degrees * Math.PI / 180.0;
}

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

function vec3(x, y, z) {
    return [x, y, z];
}

function subtract3(a, b) {
    return vec3(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function cross3(a, b) {
    return vec3(
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    );
}

function normalize3(v) {
    var len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (len > 0) {
        return vec3(v[0] / len, v[1] / len, v[2] / len);
    }
    return v;
}

function mat3FromMat4(m) {
    var result = [];
    for (var i = 0; i < 3; i++) {
        result[i] = [];
        for (var j = 0; j < 3; j++) {
            result[i][j] = m[i][j];
        }
    }
    return result;
}

function flatten3(m) {
    var floats = new Float32Array(9);
    var idx = 0;
    for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
            floats[idx++] = m[j][i];
        }
    }
    return floats;
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

function translate(x, y, z) {
    var result = mat4();
    result[0][3] = x;
    result[1][3] = y;
    result[2][3] = z;
    return result;
}

function scale(sx, sy, sz) {
    var result = mat4();
    result[0][0] = sx;
    result[1][1] = sy;
    result[2][2] = sz;
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