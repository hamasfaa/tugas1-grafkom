var canvas;
var gl;

// --- Variabel untuk data model ---
var points = [];
var colors = [];
var numVertices = 0; // Akan dihitung saat model dibuat

var vertexColors = [
    vec4(0.0, 0.0, 0.0, 1.0),  // 0: hitam
    vec4(1.0, 0.0, 0.0, 1.0),  // 1: merah
    vec4(1.0, 1.0, 0.0, 1.0),  // 2: kuning
    vec4(0.0, 1.0, 0.0, 1.0),  // 3: hijau
    vec4(0.0, 0.0, 1.0, 1.0),  // 4: biru
    vec4(1.0, 0.0, 1.0, 1.0),  // 5: magenta
    vec4(0.0, 1.0, 1.0, 1.0),  // 6: cyan
    vec4(1.0, 1.0, 1.0, 1.0)   // 7: putih
];


// --- Variabel untuk Uniform Matriks ---
var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

// --- Variabel untuk Kontrol Interaktif ---
var zoomLevel = 1.0;
var rotationX = 20.0; // Nilai awal agar terlihat 3D
var rotationY = 0.0;
var translationX = 0.0;
var translationY = 0.0;
var autoRotating = false;

// --- Konfigurasi Proyeksi ---
var near = -10;
var far = 10;
var left = -2.0;
var right = 2.0;
var ytop = 2.0;
var bottom = -2.0;


window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext("webgl2") || canvas.getContext("webgl");


    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.9, 0.9, 0.9, 1.0); // Warna background abu-abu muda
    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Membuat model 3D kita secara manual
    createIFModel();

    // Setup VBO untuk Warna
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // Setup VBO untuk Posisi Vertex
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Mendapatkan lokasi uniform
    modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");

    initControls();
    render();
}

/**
 * Fungsi utama untuk membangun keseluruhan model 3D
 * dengan menggabungkan beberapa balok yang ditransformasi.
 */
function createIFModel() {
    // 1. Base Block (alas IF)
    var baseTransform = mult(translate(0.0, -0.5, 0.0), scale(1.2, 0.4, 0.4));
    buildCube(baseTransform);

    // 2. Letter 'I' (batang vertikal)
    var iTransform = mult(translate(-0.35, 0.2, 0.0), scale(0.1, 1.0, 0.1));
    buildCube(iTransform);

    // 3. Letter 'F' - vertical stem
    var fVerticalTransform = mult(translate(0.2, 0.2, 0.0), scale(0.1, 1.0, 0.1));
    buildCube(fVerticalTransform);

    // 4. Letter 'F' - top horizontal bar (lebih pendek dari tengah)
    var fTopTransform = mult(translate(0.35, 0.65, 0.0), scale(0.25, 0.1, 0.1));
    buildCube(fTopTransform);

    // 5. Letter 'F' - middle horizontal bar (lebih panjang dari atas)
    var fMidTransform = mult(translate(0.4, 0.25, 0.0), scale(0.35, 0.1, 0.1));
    buildCube(fMidTransform);

    // Hitung jumlah vertex total
    numVertices = points.length;
}
/**
/**
 * Helper function untuk membangun satu balok (kubus yang ditransformasi).
 * @param {mat4} transform Matriks transformasi (skala, translasi) untuk balok ini.
 * @param {vec4} color Warna solid untuk balok ini.
 */
// Hapus parameter 'color' dari sini
function buildCube(transform) { 
    // ... (definisi baseVertices dan transformedVertices tetap sama) ...
    var baseVertices = [
        vec4(-0.5, -0.5,  0.5, 1.0), // 0
        vec4(-0.5,  0.5,  0.5, 1.0), // 1
        vec4( 0.5,  0.5,  0.5, 1.0), // 2
        vec4( 0.5, -0.5,  0.5, 1.0), // 3
        vec4(-0.5, -0.5, -0.5, 1.0), // 4
        vec4(-0.5,  0.5, -0.5, 1.0), // 5
        vec4( 0.5,  0.5, -0.5, 1.0), // 6
        vec4( 0.5, -0.5, -0.5, 1.0)  // 7
    ];

    var transformedVertices = baseVertices.map(v => multMatVec(transform, v));
    
    // Buat 6 sisi dari kubus, hapus argumen warna dari pemanggilan quad
    quad(transformedVertices, 1, 0, 3, 2); // depan -> pakai warna vertex 1 (merah)
    quad(transformedVertices, 2, 3, 7, 6); // kanan -> pakai warna vertex 2 (kuning)
    quad(transformedVertices, 3, 0, 4, 7); // bawah -> pakai warna vertex 3 (hijau)
    quad(transformedVertices, 6, 5, 1, 2); // atas  -> pakai warna vertex 6 (cyan)
    quad(transformedVertices, 4, 5, 6, 7); // belakang -> pakai warna vertex 4 (biru)
    quad(transformedVertices, 5, 4, 0, 1); // kiri -> pakai warna vertex 5 (magenta)
}
/**
 * Membuat satu sisi (quad) dari dua segitiga.
 */
function quad(verts, a, b, c, d) {
    // Ambil warna untuk sisi ini dari palet global
    var faceColor = vertexColors[a];

    var indices = [ a, b, c, a, c, d ];
    for (var i = 0; i < indices.length; ++i) {
        points.push(verts[indices[i]]);
        // Gunakan warna yang sudah diambil untuk semua vertex di sisi ini
        colors.push(faceColor); 
    }
}

function initControls() {
    document.getElementById("zoom").oninput = function () {
        zoomLevel = parseFloat(this.value);
        document.getElementById("zoomValue").innerHTML = zoomLevel.toFixed(1);
    };
    document.getElementById("rotateX").oninput = function () {
        rotationX = parseFloat(this.value);
        document.getElementById("rotateXValue").innerHTML = rotationX.toFixed(0) + "°";
    };
    document.getElementById("rotateY").oninput = function () {
        rotationY = parseFloat(this.value);
        document.getElementById("rotateYValue").innerHTML = rotationY.toFixed(0) + "°";
    };
    document.getElementById("translateX").oninput = function () {
        translationX = parseFloat(this.value);
        document.getElementById("translateXValue").innerHTML = translationX.toFixed(2);
    };
    document.getElementById("translateY").oninput = function () {
        translationY = parseFloat(this.value);
        document.getElementById("translateYValue").innerHTML = translationY.toFixed(2);
    };
}

function resetView() {
    zoomLevel = 1.0;
    rotationX = 20.0;
    rotationY = 0.0;
    translationX = 0.0;
    translationY = 0.0;
    autoRotating = false;

    document.getElementById("zoom").value = zoomLevel;
    document.getElementById("rotateX").value = rotationX;
    document.getElementById("rotateY").value = rotationY;
    document.getElementById("translateX").value = translationX;
    document.getElementById("translateY").value = translationY;
    
    document.getElementById("zoomValue").innerHTML = zoomLevel.toFixed(1);
    document.getElementById("rotateXValue").innerHTML = rotationX.toFixed(0) + "°";
    document.getElementById("rotateYValue").innerHTML = rotationY.toFixed(0) + "°";
    document.getElementById("translateXValue").innerHTML = translationX.toFixed(2);
    document.getElementById("translateYValue").innerHTML = translationY.toFixed(2);
}

function toggleAutoRotate() {
    autoRotating = !autoRotating;
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (autoRotating) {
        rotationY = (rotationY + 0.5) % 360;
        document.getElementById("rotateY").value = rotationY;
        document.getElementById("rotateYValue").innerHTML = rotationY.toFixed(0) + "°";
    }

    // --- Setup Proyeksi (Zoom) ---
    var scaledLeft = left / zoomLevel;
    var scaledRight = right / zoomLevel;
    var scaledTop = ytop / zoomLevel;
    var scaledBottom = bottom / zoomLevel;
    projectionMatrix = ortho(scaledLeft, scaledRight, scaledBottom, scaledTop, near, far);

    // --- Setup ModelView (Rotasi dan Translasi Global) ---
    modelViewMatrix = mat4(); // Mulai dengan matriks identitas
    modelViewMatrix = mult(modelViewMatrix, translate(translationX, translationY, 0));
    modelViewMatrix = mult(modelViewMatrix, rotate(rotationX, [1, 0, 0]));
    modelViewMatrix = mult(modelViewMatrix, rotate(rotationY, [0, 1, 0]));

    // --- Kirim Matriks ke Shader ---
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    // --- Gambar Objek ---
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    requestAnimationFrame(render);
}

// NOTE: Pastikan file MVnew.js Anda memiliki fungsi `translate` dan `scale`.
// Jika tidak, Anda bisa menambahkan fungsi-fungsi helper ini di if.js
// atau di MVnew.js

/*
// --- Tambahkan fungsi ini jika tidak ada di MVnew.js ---

function translate(x, y, z) {
    var result = mat4();
    result[0][3] = x;
    result[1][3] = y;
    result[2][3] = z;
    return result;
}

function scale(x, y, z) {
    var result = mat4();
    result[0][0] = x;
    result[1][1] = y;
    result[2][2] = z;
    return result;
}

// Fungsi rotate generik (jika MVnew.js hanya punya rotateX/Y/Z)
function rotate(angle, axis) {
    var v = normalize(axis);
    var x = v[0], y = v[1], z = v[2];
    var c = Math.cos(radians(angle));
    var s = Math.sin(radians(angle));
    var omc = 1.0 - c;

    var result = mat4();
    result[0][0] = x*x*omc + c;
    result[0][1] = y*x*omc - z*s;
    result[0][2] = z*x*omc + y*s;
    result[1][0] = x*y*omc + z*s;
    result[1][1] = y*y*omc + c;
    result[1][2] = z*y*omc - x*s;
    result[2][0] = x*z*omc - y*s;
    result[2][1] = y*z*omc + x*s;
    result[2][2] = z*z*omc + c;
    return result;
}
*/

// =================================================================
// FUNGSI-FUNGSI HELPER MATRIKS (DIJAMIN BENAR)
// Tempelkan blok ini di bagian bawah if.js
// =================================================================

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

function radians(degrees) {
    return degrees * Math.PI / 180.0;
}

function vec4(x, y, z, w) {
    return [x, y, z, w];
}

function mat4() {
    var v = [];
    for (let i = 0; i < 4; ++i) {
        v.push([]);
        for (let j = 0; j < 4; ++j) {
            v[i].push((i === j) ? 1.0 : 0.0);
        }
    }
    return v;
}

function mult(u, v) {
    var result = mat4();
    for (var i = 0; i < 4; ++i) {
        for (var j = 0; j < 4; ++j) {
            result[i][j] = 0.0;
            for (var k = 0; k < 4; ++k) {
                result[i][j] += u[i][k] * v[k][j];
            }
        }
    }
    return result;
}

function multMatVec(m, v) {
    var result = [];
    for (var i = 0; i < 4; i++) {
        result.push(
            m[i][0] * v[0] +
            m[i][1] * v[1] +
            m[i][2] * v[2] +
            m[i][3] * v[3]
        );
    }
    return result;
}


function translate(x, y, z) {
    var result = mat4();
    result[0][3] = x;
    result[1][3] = y;
    result[2][3] = z;
    return result;
}

function scale(x, y, z) {
    var result = mat4();
    result[0][0] = x;
    result[1][1] = y;
    result[2][2] = z;
    return result;
}

function rotate(angle, axis) {
    var d = Math.sqrt(axis[0]*axis[0] + axis[1]*axis[1] + axis[2]*axis[2]);
    if (d === 0) return mat4(); // Return identity if axis is zero vector

    var x = axis[0]/d, y = axis[1]/d, z = axis[2]/d;
    var c = Math.cos(radians(angle));
    var s = Math.sin(radians(angle));
    var omc = 1.0 - c;

    var result = mat4();
    result[0][0] = x*x*omc + c;
    result[0][1] = y*x*omc - z*s;
    result[0][2] = z*x*omc + y*s;
    result[1][0] = x*y*omc + z*s;
    result[1][1] = y*y*omc + c;
    result[1][2] = z*y*omc - x*s;
    result[2][0] = x*z*omc - y*s;
    result[2][1] = y*z*omc + x*s;
    result[2][2] = z*z*omc + c;
    return result;
}

function ortho(left, right, bottom, top, near, far) {
    var result = mat4();
    result[0][0] = 2.0 / (right - left);
    result[1][1] = 2.0 / (top - bottom);
    result[2][2] = -2.0 / (far - near);
    result[0][3] = -(right + left) / (right - left);
    result[1][3] = -(top + bottom) / (top - bottom);
    result[2][3] = -(far + near) / (far - near);
    return result;
}

