var canvas;
var gl;
var program; // Make program a global variable

var vertices = [];
var colors = [];
var normals = [];
var texCoords = [];
var indices = [];
var numElements = 0;

// ... (all other global variables remain the same)
var brickWidth=2,brickHeight=1,brickDepth=.2,mortarThickness=.02,wallWidth=6,wallHeight=3,wallDepth=1,letterHeight=3.1,letterWidth=1,letterDepth=.5,letterSpacing=.5,near=-20,far=20,left=-6,right=6,ytop=4,bottom=-4,modelViewMatrix,projectionMatrix,modelViewMatrixLoc,projectionMatrixLoc,aspect=800/600,zoomLevel=1,rotationX=0,rotationY=0,rotationZ=0,translationX=0,translationY=0,autoRotating=!1,vBuffer,cBuffer,nBuffer,tBuffer,iBuffer,lightPosition=[5,5,10],ambientLight=[.2,.2,.2],diffuseLight=[.8,.8,.8],specularLight=[1,1,1],shininess=32,enableLighting=!0,lightPositionLoc,ambientLightLoc,diffuseLightLoc,specularLightLoc,shininessLoc,enableLightingLoc,normalMatrixLoc;


var checkerboardTexture, imageTexture; // Separate texture objects
var uUseTextureLoc;

var brickColors = [
    vec4(60 / 255, 56 / 255, 47 / 255, 1.0), vec4(63 / 255, 59 / 255, 50 / 255, 1.0),
    vec4(77 / 255, 69 / 255, 56 / 255, 1.0), vec4(103 / 255, 99 / 255, 88 / 255, 1.0),
    vec4(125 / 255, 113 / 255, 97 / 255, 1.0), vec4(128 / 255, 119 / 255, 102 / 255, 1.0),
];
var mortarColor = vec4(0.8, 0.8, 0.75, 1.0);
var letterColor = vec4(26 / 255, 65 / 255, 132 / 255, 1.0);
var letterBackColor = vec4(68 / 255, 75 / 255, 68 / 255, 1.0);

// Creates and returns a checkerboard texture object
function createCheckerboardTexture() {
    var texSize = 64;
    var numChecks = 8;
    var image = new Uint8Array(4 * texSize * texSize);
    for (var i = 0; i < texSize; i++) {
        for (var j = 0; j < texSize; j++) {
            var patchx = Math.floor(i / (texSize / numChecks));
            var patchy = Math.floor(j / (texSize / numChecks));
            var c = (patchx % 2 ^ patchy % 2) ? 255 : 0;
            var idx = 4 * (i * texSize + j);
            image[idx] = c; image[idx + 1] = c; image[idx + 2] = c; image[idx + 3] = 255;
        }
    }
    
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return texture;
}

// Loads an image and creates a texture, calling a callback when done
function loadImageTexture(url, callback) {
    var texture = gl.createTexture();
    var image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        callback(); // Signal that the texture is ready
    };
    image.src = url;
    return texture;
}


window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    createScene();
    setupBuffers();

    uUseTextureLoc = gl.getUniformLocation(program, "uUseTexture");

    // --- Texture Initialization ---
    checkerboardTexture = createCheckerboardTexture();
    imageTexture = loadImageTexture("cat.jpg", function() {
        // This callback ensures rendering starts after the image is loaded
        setActiveTexture('checkerboard'); // Set default texture
        render();
    });
    
    gl.uniform1i(gl.getUniformLocation(program, "uTexture"), 0);

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
}

function setupBuffers() {
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

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

    tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);
    var aTexCoord = gl.getAttribLocation(program, "aTexCoord");
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aTexCoord);

    iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
}

function setActiveTexture(textureType) {
    gl.activeTexture(gl.TEXTURE0);
    if (textureType === 'checkerboard') {
        gl.bindTexture(gl.TEXTURE_2D, checkerboardTexture);
        gl.uniform1i(uUseTextureLoc, 1); // 1 for true
    } else if (textureType === 'image') {
        gl.bindTexture(gl.TEXTURE_2D, imageTexture);
        gl.uniform1i(uUseTextureLoc, 1); // 1 for true
    } else { // 'none'
        gl.uniform1i(uUseTextureLoc, 0); // 0 for false
    }
}


function createScene() {
    vertices = []; colors = []; indices = []; normals = []; texCoords = []; numElements = 0;
    createBrickWall(); createLetters();
}

function createLetters() {
    var letterY = wallHeight / 2 - 0.97;
    var totalLetterWidth = 2 * letterWidth + letterSpacing;
    var startX = -totalLetterWidth / 2 - 1.3;
    var letterZ = -wallDepth / 2 + 0.5;
    createLetterI(startX, letterY, letterZ);
    createLetterF(startX + letterWidth + letterSpacing, letterY, letterZ);
}

function createCube(transformMatrix, color, backColor) {
    var baseVertices=[vec4(-.5,-.5,.5,1),vec4(-.5,.5,.5,1),vec4(.5,.5,.5,1),vec4(.5,-.5,.5,1),vec4(-.5,-.5,-.5,1),vec4(-.5,.5,-.5,1),vec4(.5,.5,-.5,1),vec4(.5,-.5,-.5,1)];
    var transformedVertices=[];
    for(var i=0;i<baseVertices.length;i++){
        var temp=vec4();
        for(var j=0;j<4;j++)temp[j]=transformMatrix[j][0]*baseVertices[i][0]+transformMatrix[j][1]*baseVertices[i][1]+transformMatrix[j][2]*baseVertices[i][2]+transformMatrix[j][3]*baseVertices[i][3];
        transformedVertices.push(temp)
    }
    var baseTexCoords=[vec2(0,0),vec2(0,1),vec2(1,1),vec2(1,0)];
    var baseIndex=vertices.length;
    var faces=[{indices:[1,0,3,2],normal:vec3(0,0,1)},{indices:[2,3,7,6],normal:vec3(1,0,0)},{indices:[3,0,4,7],normal:vec3(0,-1,0)},{indices:[6,5,1,2],normal:vec3(0,1,0)},{indices:[4,5,6,7],normal:vec3(0,0,-1)},{indices:[5,4,0,1],normal:vec3(-1,0,0)}];
    for(var f=0;f<faces.length;f++){
        var face=faces[f];
        var faceColor=backColor?4===f?backColor:color:color;
        var isLetter=void 0!==backColor;
        for(var i=0;i<4;i++)vertices.push(transformedVertices[face.indices[i]]),colors.push(faceColor),normals.push(face.normal),isLetter?texCoords.push(baseTexCoords[i]):texCoords.push(vec2(0,0));
        var idx=baseIndex+4*f;
        indices.push(idx,idx+1,idx+2),indices.push(idx,idx+2,idx+3),numElements+=6
    }
}

function createLetterI(x, y, z) {
    var thickness = 0.5;
    var transform = mult(translate(x + letterWidth / 2, y + letterHeight / 2, z), scale(thickness, letterHeight, letterDepth));
    createCube(transform, letterColor, letterBackColor);
}

function createLetterF(x, y, z) {
    var thickness = 0.5;
    var transform1 = mult(translate(x + thickness / 2, y + letterHeight / 2, z), scale(thickness, letterHeight, letterDepth));
    createCube(transform1, letterColor, letterBackColor);
    var topBarWidth = letterWidth * 1.8;
    var transform2 = mult(translate(x + topBarWidth / 2, y + letterHeight - thickness / 2, z), scale(topBarWidth, thickness, letterDepth));
    createCube(transform2, letterColor, letterBackColor);
    var middleBarWidth = letterWidth * 3;
    var transform3 = mult(translate(x + middleBarWidth / 2, y + letterHeight / 2, z), scale(middleBarWidth, thickness, letterDepth));
    createCube(transform3, letterColor, letterBackColor);
}

function createBrickWall() {
    var startX = -wallWidth / 2, startY = -wallHeight / 2, startZ = -wallDepth / 2;
    createMortarBase(startX, startY, startZ);
    for (var rowsCount = Math.floor(wallHeight / (brickHeight + mortarThickness)), row = 0; row < rowsCount; row++) {
        var y = startY + row * (brickHeight + mortarThickness);
        createBrickRow(startX, y, startZ, row);
        row < rowsCount - 1 && createMortarHorizontal(startX, y + brickHeight, startZ);
    }
}

function createBrickRow(startX, y, startZ, rowIndex) {
    for (var offsetX = rowIndex % 2 == 1 ? brickWidth / 2 : 0, currentX = startX - offsetX; currentX < startX + wallWidth; ) {
        var brickColor = brickColors[Math.floor(Math.random() * brickColors.length)], currentBrickWidth = brickWidth;
        if (currentX < startX) {
            (currentBrickWidth = brickWidth - (startX - currentX)) > 0 && (createCustomBrick(startX, y, startZ, currentBrickWidth, brickColor), (mortarX = startX + currentBrickWidth) < startX + wallWidth && createCustomBrick(mortarX, y, startZ, mortarThickness, mortarColor, brickHeight));
            currentX = startX + currentBrickWidth + mortarThickness;
            continue;
        }
        if (currentX + brickWidth > startX + wallWidth) {
            (currentBrickWidth = startX + wallWidth - currentX) > 0 && createCustomBrick(currentX, y, startZ, currentBrickWidth, brickColor);
            break;
        }
        createCustomBrick(currentX, y, startZ, currentBrickWidth, brickColor);
        var mortarX = currentX + currentBrickWidth;
        if (mortarX < startX + wallWidth) {
            createCustomBrick(mortarX, y, startZ, mortarThickness, mortarColor, brickHeight);
            currentX = mortarX + mortarThickness;
        } else break;
    }
}

function createCustomBrick(x, y, z, width, color, height) {
    height = height || brickHeight;
    var transform = mult(translate(x + width / 2, y + height / 2, z + wallDepth / 2), scale(width, height, wallDepth));
    createCube(transform, color);
}

function createMortarBase(x, y, z) { createCustomBrick(x, y - mortarThickness, z, wallWidth, mortarColor, mortarThickness); }
function createMortarHorizontal(x, y, z) { createCustomBrick(x, y, z, wallWidth, mortarColor, mortarThickness); }

function initControls() {
    // Event listener for the new texture dropdown
    document.getElementById("textureSelect").onchange = function(event) {
        setActiveTexture(event.target.value);
    };

    // ... (all other control initializations remain the same)
    document.getElementById("zoom").oninput=function(){zoomLevel=parseFloat(this.value),document.getElementById("zoomValue").innerHTML=zoomLevel.toFixed(1)},document.getElementById("rotateX").oninput=function(){rotationX=parseFloat(this.value),document.getElementById("rotateXValue").innerHTML=rotationX+"°"},document.getElementById("rotateY").oninput=function(){rotationY=parseFloat(this.value),document.getElementById("rotateYValue").innerHTML=rotationY+"°"},document.getElementById("rotateZ").oninput=function(){rotationZ=parseFloat(this.value),document.getElementById("rotateZValue").innerHTML=rotationZ+"°"},document.getElementById("translateX").oninput=function(){translationX=parseFloat(this.value),document.getElementById("translateXValue").innerHTML=translationX.toFixed(1)},document.getElementById("translateY").oninput=function(){translationY=parseFloat(this.value),document.getElementById("translateYValue").innerHTML=translationY.toFixed(1)},document.getElementById("lightPosX").oninput=function(){lightPosition[0]=parseFloat(this.value),document.getElementById("lightPosXValue").innerHTML=this.value},document.getElementById("lightPosY").oninput=function(){lightPosition[1]=parseFloat(this.value),document.getElementById("lightPosYValue").innerHTML=this.value},document.getElementById("lightPosZ").oninput=function(){lightPosition[2]=parseFloat(this.value),document.getElementById("lightPosZValue").innerHTML=this.value},document.getElementById("ambientR").oninput=function(){ambientLight[0]=parseFloat(this.value),document.getElementById("ambientRValue").innerHTML=this.value},document.getElementById("ambientG").oninput=function(){ambientLight[1]=parseFloat(this.value),document.getElementById("ambientGValue").innerHTML=this.value},document.getElementById("ambientB").oninput=function(){ambientLight[2]=parseFloat(this.value),document.getElementById("ambientBValue").innerHTML=this.value},document.getElementById("diffuseR").oninput=function(){diffuseLight[0]=parseFloat(this.value),document.getElementById("diffuseRValue").innerHTML=this.value},document.getElementById("diffuseG").oninput=function(){diffuseLight[1]=parseFloat(this.value),document.getElementById("diffuseGValue").innerHTML=this.value},document.getElementById("diffuseB").oninput=function(){diffuseLight[2]=parseFloat(this.value),document.getElementById("diffuseBValue").innerHTML=this.value},document.getElementById("specularR").oninput=function(){specularLight[0]=parseFloat(this.value),document.getElementById("specularRValue").innerHTML=this.value},document.getElementById("specularG").oninput=function(){specularLight[1]=parseFloat(this.value),document.getElementById("specularGValue").innerHTML=this.value},document.getElementById("specularB").oninput=function(){specularLight[2]=parseFloat(this.value),document.getElementById("specularBValue").innerHTML=this.value},document.getElementById("shininess").oninput=function(){shininess=parseFloat(this.value),document.getElementById("shininessValue").innerHTML=this.value};
}

function resetView(){zoomLevel=1,rotationX=0,rotationY=0,rotationZ=0,translationX=0,translationY=0,autoRotating=!1,document.getElementById("zoom").value=1,document.getElementById("zoomValue").innerHTML="1.0",document.getElementById("rotateX").value=0,document.getElementById("rotateXValue").innerHTML="0°",document.getElementById("rotateY").value=0,document.getElementById("rotateYValue").innerHTML="0°",document.getElementById("rotateZ").value=0,document.getElementById("rotateZValue").innerHTML="0°",document.getElementById("translateX").value=0,document.getElementById("translateXValue").innerHTML="0.0",document.getElementById("translateY").value=0,document.getElementById("translateYValue").innerHTML="0.0"}
function resetLighting(){lightPosition=[5,5,10],ambientLight=[.2,.2,.2],diffuseLight=[.8,.8,.8],specularLight=[1,1,1],shininess=32,enableLighting=!0,document.getElementById("lightPosX").value=5,document.getElementById("lightPosXValue").innerHTML="5.0",document.getElementById("lightPosY").value=5,document.getElementById("lightPosYValue").innerHTML="5.0",document.getElementById("lightPosZ").value=10,document.getElementById("lightPosZValue").innerHTML="10.0",document.getElementById("ambientR").value=.2,document.getElementById("ambientRValue").innerHTML="0.2",document.getElementById("ambientG").value=.2,document.getElementById("ambientGValue").innerHTML="0.2",document.getElementById("ambientB").value=.2,document.getElementById("ambientBValue").innerHTML="0.2",document.getElementById("diffuseR").value=.8,document.getElementById("diffuseRValue").innerHTML="0.8",document.getElementById("diffuseG").value=.8,document.getElementById("diffuseGValue").innerHTML="0.8",document.getElementById("diffuseB").value=.8,document.getElementById("diffuseBValue").innerHTML="0.8",document.getElementById("specularR").value=1,document.getElementById("specularRValue").innerHTML="1.0",document.getElementById("specularG").value=1,document.getElementById("specularGValue").innerHTML="1.0",document.getElementById("specularB").value=1,document.getElementById("specularBValue").innerHTML="1.0",document.getElementById("shininess").value=32,document.getElementById("shininessValue").innerHTML="32",document.getElementById("enableLighting").checked=!0}
function toggleLighting(){enableLighting=document.getElementById("enableLighting").checked}
function autoRotate(){autoRotating=!autoRotating}
function viewFront(){rotationX=0,rotationY=0,rotationZ=0,updateControls()}
function viewBack(){rotationX=0,rotationY=180,rotationZ=0,updateControls()}
function viewTop(){rotationX=90,rotationY=0,rotationZ=0,updateControls()}
function viewBottom(){rotationX=-90,rotationY=0,rotationZ=0,updateControls()}
function updateControls(){document.getElementById("rotateX").value=rotationX,document.getElementById("rotateXValue").innerHTML=rotationX+"°",document.getElementById("rotateY").value=rotationY,document.getElementById("rotateYValue").innerHTML=rotationY+"°",document.getElementById("rotateZ").value=rotationZ,document.getElementById("rotateZValue").innerHTML=rotationZ+"°"}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (autoRotating) {
        rotationY = (rotationY + 0.5) % 360;
        rotationX = (rotationX + 0.5) % 360;
        rotationZ = (rotationZ + 0.5) % 360;
        updateControls();
    }

    var translatedVertices=[];
    for(var i=0;i<vertices.length;i++){var p=vertices[i];translatedVertices.push(vec4(p[0]+translationX,p[1]+translationY,p[2],p[3]))}

    gl.bindBuffer(gl.ARRAY_BUFFER,vBuffer),gl.bufferSubData(gl.ARRAY_BUFFER,0,flatten(translatedVertices));
    var scaledLeft=left/zoomLevel,scaledRight=right/zoomLevel,scaledTop=ytop/zoomLevel,scaledBottom=bottom/zoomLevel;
    projectionMatrix=ortho(scaledLeft,scaledRight,scaledBottom,scaledTop,near,far),gl.uniformMatrix4fv(projectionMatrixLoc,!1,flatten(projectionMatrix)),modelViewMatrix=mat4(),modelViewMatrix=mult(modelViewMatrix,rotateX(radians(rotationX))),modelViewMatrix=mult(modelViewMatrix,rotateY(radians(rotationY))),modelViewMatrix=mult(modelViewMatrix,rotateZ(radians(rotationZ))),gl.uniformMatrix4fv(modelViewMatrixLoc,!1,flatten(modelViewMatrix));
    var normalMatrix=mat3FromMat4(modelViewMatrix);
    gl.uniformMatrix3fv(normalMatrixLoc,!1,flatten3(normalMatrix)),gl.uniform3fv(lightPositionLoc,lightPosition),gl.uniform3fv(ambientLightLoc,ambientLight),gl.uniform3fv(diffuseLightLoc,diffuseLight),gl.uniform3fv(specularLightLoc,specularLight),gl.uniform1f(shininessLoc,shininess),gl.uniform1i(enableLightingLoc,enableLighting),gl.drawElements(gl.TRIANGLES,numElements,gl.UNSIGNED_SHORT,0),requestAnimFrame(render)
}

function flatten(v){var n=v.length,elemsAreArrays=!1;Array.isArray(v[0])&&(elemsAreArrays=!0,n*=v[0].length);var floats=new Float32Array(n);if(elemsAreArrays){var idx=0;for(var i=0;i<v.length;++i)for(var j=0;j<v[i].length;++j)floats[idx++]=v[i][j]}else for(var i=0;i<v.length;++i)floats[i]=v[i];return floats}
window.requestAnimFrame=function(){return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(callback,element){window.setTimeout(callback,1e3/60)}}();
function radians(degrees){return degrees*Math.PI/180}
function ortho(left,right,bottom,top,near,far){if(left==right)throw"ortho(): left and right are equal";if(bottom==top)throw"ortho(): bottom and top are equal";if(near==far)throw"ortho(): near and far are equal";var w=right-left,h=top-bottom,d=far-near,result=mat4();return result[0][0]=2/w,result[1][1]=2/h,result[2][2]=-2/d,result[0][3]=-(left+right)/w,result[1][3]=-(top+bottom)/h,result[2][3]=-(near+far)/d,result}
function vec3(x,y,z){return[x,y,z]}
function vec2(x,y){return[x,y]}
function subtract3(a,b){return vec3(a[0]-b[0],a[1]-b[1],a[2]-b[2])}
function cross3(a,b){return vec3(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])}
function normalize3(v){var len=Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);return len>0?vec3(v[0]/len,v[1]/len,v[2]/len):v}
function mat3FromMat4(m){var result=[];for(var i=0;i<3;i++){result[i]=[];for(var j=0;j<3;j++)result[i][j]=m[i][j]}return result}
function flatten3(m){var floats=new Float32Array(9),idx=0;for(var i=0;i<3;i++)for(var j=0;j<3;j++)floats[idx++]=m[j][i];return floats}
function mat4(){var result=[];for(var i=0;i<4;i++){result[i]=[];for(var j=0;j<4;j++)result[i][j]=i==j?1:0}return result.matrix=!0,result.type="mat4",result}
function translate(x,y,z){var result=mat4();return result[0][3]=x,result[1][3]=y,result[2][3]=z,result}
function scale(sx,sy,sz){var result=mat4();return result[0][0]=sx,result[1][1]=sy,result[2][2]=sz,result}
function mult(u,v){var result=mat4();for(var i=0;i<4;i++)for(var j=0;j<4;j++){result[i][j]=0;for(var k=0;k<4;k++)result[i][j]+=u[i][k]*v[k][j]}return result}
function rotateX(theta){var c=Math.cos(theta),s=Math.sin(theta),rx=mat4();return rx[1][1]=c,rx[1][2]=-s,rx[2][1]=s,rx[2][2]=c,rx}
function rotateY(theta){var c=Math.cos(theta),s=Math.sin(theta),ry=mat4();return ry[0][0]=c,ry[0][2]=s,ry[2][0]=-s,ry[2][2]=c,ry}
function rotateZ(theta){var c=Math.cos(theta),s=Math.sin(theta),rz=mat4();return rz[0][0]=c,rz[0][1]=-s,rz[1][0]=s,rz[1][1]=c,rz}