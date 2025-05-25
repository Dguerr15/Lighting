// Vertex shader program
const VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec3 a_Normal;
    varying vec3 v_Normal;
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_GlobalRotateMatrix;
    uniform mat4 u_ProjectionMatrix;

    void main() {
        gl_Position = u_ProjectionMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;

        v_Normal = a_Normal;
    }`;

// Fragment shader program
const FSHADER_SOURCE = `
    precision mediump float;
    varying vec3 v_Normal;
    uniform vec4 u_FragColor;
    uniform int u_UseNormalColors;
    void main() {
        if (u_UseNormalColors == 1) {
            gl_FragColor = vec4((v_Normal + 1.0) / 2.0, 1.0);
        } else{
            gl_FragColor = u_FragColor;
        }
    }`;

// Global variables
let gl;
let canvas;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let g_lastTime = performance.now();
let g_frameCount = 0;
let g_fps = 0;
let g_Normals = false; // Toggle normals display

// UI
var g_globalAngleX = 20; // Camera
var g_globalAngleY = -35; // Camera

var g_body = 0; // Body angle

var g_mouth = 0; // Mouth angle

var g_tail = 0; // Tail angle

var g_FLU = 0; // Front Left Upper Leg
var g_FRU = 0; // Front Right Upper Leg

var g_FLL = 0; // Front Left Lower Leg
var g_FRL = 0; // Front Right Lower Leg

var g_FLP = 0; // Front Left Paw
var g_FRP = 0; // Front Right Paw

var g_BLU = 0; // Back Left Upper Leg
var g_BRU = 0; // Back Right Upper Leg

var g_BLL = 0; // Back Left Lower Leg
var g_BRL = 0; // Back Right Lower Leg

var g_BLP = 0; // Back Left Paw
var g_BRP = 0; // Back Right Paw

// Mouse variables
var g_isDragging = false;
var g_lastX = -1;
var g_lastY = -1;


// Animation
var g_Animation = false;
var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0 - g_startTime;

var g_isPoking = false;
var g_pokeStartTime = 0;
var g_pokeDuration = 3.5; // Duration of the poke animation in seconds
let g_needsRender = true;
let g_isAnimating = false;
let g_lastAnimationTime = 0;


function main() {
    // set up webGL context
    setupWebGL();
    
    connectVariablesToGLSL();

    addActionsForHtmlUI();
    
    setupMouseHandlers();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    requestAnimationFrame(tick);
}

function setupWebGL() {
    // get the canvas element
    canvas = document.getElementById('webgl');
    if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }

    // get the webGL context
    gl = getWebGLContext(canvas, {preserveDrawingBuffer: true});
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return null;
    }

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
}

// connect js variables to glsl
function connectVariablesToGLSL() {
    // initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to initialize shaders.');
        return;
    }

    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return;
    }
    u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
    if (!u_ProjectionMatrix) {
        console.log('Failed to get u_ProjectionMatrix');
        return;
    }


    a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
    if (a_Normal < 0) {
        console.log('Failed to get the storage location of a_Normal');
        return;
    }
    
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }

    u_UseNormalColors = gl.getUniformLocation(gl.program, 'u_UseNormalColors');
    if (!u_UseNormalColors) {
      console.log('Failed to get the storage location of u_UseNormalColors');
      return false;
    }

    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!u_ModelMatrix) {
        console.log('Failed to get u_ModelMatrix');
        return;
    }

    u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
    if (!u_GlobalRotateMatrix) {
        console.log('Failed to get u_GlobalRotateMatrix');
        return;
    }
    

    var identityM = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

// set up event listeners
function addActionsForHtmlUI() {
    document.getElementById("start").onclick = function() {g_Animation = true; g_needsRender = true;};
    document.getElementById("stop").onclick = function() {g_Animation = false; g_needsRender = true;};
    document.getElementById("On").onclick = function() {g_Normals = true, gl.uniform1i(u_UseNormalColors, 1); g_needsRender = true;};
    document.getElementById("Off").onclick = function() {g_Normals = false, gl.uniform1i(u_UseNormalColors, 0); g_needsRender = true;};

    document.getElementById("mouthSlide").addEventListener("mousemove", function() { g_mouth = this.value; renderScene(); g_needsRender = true;});

    document.getElementById("tailSlide").addEventListener("mousemove", function() { g_tail = this.value; renderScene(); g_needsRender = true;});

    document.getElementById("leftFUSlide").addEventListener("mousemove", function() { g_FLU = this.value; renderScene(); g_needsRender = true;});
    document.getElementById("leftFLSlide").addEventListener("mousemove", function() { g_FLL = this.value; renderScene(); g_needsRender = true;});
    document.getElementById("leftFPSlide").addEventListener("mousemove", function() { g_FLP = this.value; renderScene(); g_needsRender = true;});

    document.getElementById("rightFPSlide").addEventListener("mousemove", function() { g_FRP = this.value; renderScene(); g_needsRender = true;});
    document.getElementById("rightFLSlide").addEventListener("mousemove", function() { g_FRL = this.value; renderScene(); g_needsRender = true;});
    document.getElementById("rightFUSlide").addEventListener("mousemove", function() { g_FRU = this.value; renderScene(); g_needsRender = true;});

    document.getElementById("leftBUSlide").addEventListener("mousemove", function() { g_BLU = this.value; renderScene(); g_needsRender = true;});
    document.getElementById("leftBLSlide").addEventListener("mousemove", function() { g_BLL = this.value; renderScene(); g_needsRender = true;});
    document.getElementById("leftBPSlide").addEventListener("mousemove", function() { g_BLP = this.value; renderScene(); g_needsRender = true;});

    document.getElementById("rightBPSlide").addEventListener("mousemove", function() { g_BRP = this.value; renderScene(); g_needsRender = true;});
    document.getElementById("rightBLSlide").addEventListener("mousemove", function() { g_BRL = this.value; renderScene(); g_needsRender = true;});
    document.getElementById("rightBUSlide").addEventListener("mousemove", function() { g_BRU = this.value; renderScene(); g_needsRender = true;});
}

function setupMouseHandlers() {
    canvas.onmousedown = function(ev) {
        var x = ev.clientX;
        var y = ev.clientY;
        
        // Check if shift key is pressed
        if (ev.shiftKey && !g_Animation) {
            // Start the poke animation
            g_isPoking = true;
            g_pokeStartTime = performance.now()/1000.0;
            g_needsRender = true;
            return; // Don't start rotation when poking
        }

        // Start dragging if a mouse is in the canvas
        var rect = ev.target.getBoundingClientRect();
        if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
            g_lastX = x;
            g_lastY = y;
            g_isDragging = true;
        }
    };
    canvas.onmouseup = function(ev) {
        g_isDragging = false;
    }

    canvas.onmouseleave = function(ev) {
        g_isDragging = false; // Also stop dragging if mouse leaves canvas
    }

    canvas.onmousemove = function(ev) {
        if (!g_isDragging) return; // Skip processing if not dragging
        
        var x = ev.clientX;
        var y = ev.clientY;
        
        // Calculate the difference from the last position
        var dx = x - g_lastX;
        var dy = y - g_lastY;
        
        // Only update if there's significant movement
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            // Update the rotation angles
            g_globalAngleY += dx * 0.5;
            g_globalAngleX += dy * 0.5;
            
            // Keep the angles within reasonable ranges
            g_globalAngleY = g_globalAngleY % 360;
            g_globalAngleX = Math.max(Math.min(g_globalAngleX, 90), -90);
            
            // Update the last position
            g_lastX = x;
            g_lastY = y;
            
            // Flag that we need to render
            g_needsRender = true;
        }
    };
}

function tick() {
    const currentTime = performance.now();
    
    // Calculate FPS every second
    g_frameCount++;
    if (currentTime - g_lastTime >= 1000) {
        g_fps = g_frameCount;
        g_frameCount = 0;
        g_lastTime = currentTime;
        document.getElementById("fps").innerText = "FPS: " + g_fps;
    }
    
    g_seconds = currentTime/1000.0 - g_startTime;
    
    // Check if we need to update animation
    const needsAnimation = (g_Animation || g_isPoking);
    const animationTimeElapsed = currentTime - g_lastAnimationTime > 16; // ~60fps for animation
    
    // Only update and render when necessary
    if (needsAnimation && animationTimeElapsed) {
        g_lastAnimationTime = currentTime;
        
        if (g_isPoking) {
            updatePokeAnimation();
            g_needsRender = true;
        } else if (g_Animation) {
            updateRunAnimation();
            g_needsRender = true;
        }
    }
    
    // Only render when something has changed
    if (g_needsRender) {
        renderScene();
        g_needsRender = false; // Reset the flag
    }
    
    requestAnimationFrame(tick);
}

function updateRunAnimation() {
    if (g_Animation) {
        g_FLU = (30 * Math.sin(3 * g_seconds));
        g_FRU = (30 * Math.sin(3 * g_seconds + 10));
        g_BLU = (30 * Math.sin(3 * g_seconds + 10.5));
        g_BRU = (30 * Math.sin(3 * g_seconds+ .5));
        g_tail = (30 * Math.sin(g_seconds * 3));
    }
}

function updatePokeAnimation() {
    var pokeTime = performance.now()/1000.0 - g_pokeStartTime;
    
    if (pokeTime > g_pokeDuration) {
        // Reset after animation completes
        g_isPoking = false;
        g_isDragging = false;
        resetAnimalPose();
        return;
    }
    
    // Calculate animation progress (0 to 1)
    var progress = pokeTime / g_pokeDuration;
    
    // Surprised reaction animation - ears up, mouth open, front paws up
    // Sitting animation
    if (progress < 0.3) {
        // Initial phase - start sitting down
        var sitProgress = progress / 0.3;

        // Bend Body
        g_body = 25 * sitProgress;  // Bend body down
        
        // Back legs bend to sit
        g_BLU = -30 * sitProgress;  // Rotate back upper legs forward
        g_BRU = -30 * sitProgress;
        g_BLL = 15 * sitProgress;  // Bend back lower legs
        g_BRL = 15 * sitProgress;
        
        // Front legs extend slightly
        g_FLU = -15 * sitProgress;  // Extend front upper legs
        g_FRU = -15 * sitProgress;
        
        // Open mouth (bark)
        g_mouth = 12 * sitProgress;
        
        // Wag tail slightly
        g_tail = 15 * sitProgress;
    } 
    else if (progress < 0.7) {
        // Middle of animation - sitting and barking
        var barkPhase = (progress - 0.3) / 0.3;
        
        // Keep legs in sitting position
        g_BLU = -30;
        g_BRU = -30;
        g_BLL = 15;
        g_BRL = 15;
        g_FLU = -15;
        g_FRU = -15;
        
        // Bark - mouth opening and closing
        g_mouth = 12 + 3 * Math.sin(barkPhase * 5);
        
        // Wag tail more vigorously
        g_tail = 15 + 10 * Math.sin(barkPhase * 20);
    } 
    else {
        // End of animation - gradually return to normal
        var recovery = (progress - 0.7) / 0.3;
        
        // Gradually return body to normal position
        g_body = 25 * (1 - recovery);  // Straighten body

        // Gradually return legs to normal position
        g_BLU = -30 * (1 - recovery);
        g_BRU = -30 * (1 - recovery);
        g_BLL = 15 * (1 - recovery);
        g_BRL = 15 * (1 - recovery);
        g_FLU = -15 * (1 - recovery);
        g_FRU = -15 * (1 - recovery);
        
        // Close mouth
        g_mouth = 12 * (1 - recovery);
        
        // Stop wagging tail
        g_tail = 15 * (1 - recovery);
    }
}

// Helper function to reset the animal pose
function resetAnimalPose() {
    if (!g_Animation) {
        // Only reset if not in normal animation mode
        g_body = 0;
        g_mouth = 0;
        g_tail = 0;
        g_FLU = 0;
        g_FRU = 0;
        g_FLL = 0;
        g_FRL = 0;
        g_FLP = 0;
        g_FRP = 0;
        g_BLU = 0;
        g_BRU = 0;
        g_BLL = 0;
        g_BRL = 0;
        g_BLP = 0;
        g_BRP = 0;
    }
}

// render all shapes
function renderScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a global rotation matrix that combines X and Y rotations
    var globalRotateMatrix = new Matrix4()
        .translate(0, 0, -2.5) // move camera "backward"
        .rotate(g_globalAngleX, 1, 0, 0)  // Rotate around X axis
        .rotate(g_globalAngleY, 0, 1, 0); // Rotate around Y axis
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotateMatrix.elements);

    let projMatrix = new Matrix4();
    projMatrix.setPerspective(60, canvas.width / canvas.height, 0.1, 100);
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMatrix.elements);
    
    var sky = new Cube();
    sky.matrix.setTranslate(2.5, 2.5, 2.5); // Position the sky cube
    sky.matrix.scale(-5, -5, -5);
    sky.render([0.5, 0.7, 1.0, 1.0]); // Sky color

    // body 
    var body = new Cube();
    body.matrix.setTranslate(-0.25, -0.2, -0.05);
    body.matrix.rotate(g_body, 1, 0, 0);
    var bodyCoords = new Matrix4(body.matrix);
    body.matrix.scale(0.5, 0.3, 0.65);
    body.render([0.45, 0.3, 0.0, 1.0]);

    // tail
    var tail = new Cylinder();
    tail.matrix = bodyCoords;
    tail.matrix.translate(0.25, 0.25, 0.55);
    tail.matrix.rotate(45, 1, 0, 0);
    tail.matrix.rotate(g_tail, 0, 0, 1);
    tail.matrix.scale(0.1, 0.4, 0.1);
    tail.render([0.4, 0.2, 0.0, 1.0]);

    // Head
    var head = new Cube();
    head.matrix = bodyCoords;
    head.matrix.setTranslate(-0.175, 0.025, -0.15);
    var headCoords = new Matrix4(head.matrix);
    head.matrix.scale(0.35, 0.25, 0.2);
    head.render([0.5, 0.3, 0.0, 1.0]);

    // mouth roof
    var mouthRoof = new Cube();
    mouthRoof.matrix = headCoords;
    mouthRoof.matrix.setTranslate(-0.075, 0.075, -0.3);
    mouthRoof.matrix.scale(0.15, 0.075, 0.2);
    mouthRoof.render([0.5, 0.2, 0.0, 1.0]);

    // mouth floor
    var mouthFloor = new Cube();
    mouthFloor.matrix = headCoords;
    mouthFloor.matrix.setTranslate(0.075, 0.025, -0.1);
    mouthFloor.matrix.rotate(180, 0, 1, 0);
    mouthFloor.matrix.rotate(10, 1, 0, 0);
    mouthFloor.matrix.rotate(g_mouth, 1, 0, 0);
    mouthFloor.matrix.scale(0.15, 0.075, 0.2);
    mouthFloor.render([0.5, 0.3, 0.0, 1.0]);

    // draw left eye
    var leftEye = new Cube();
    leftEye.matrix = headCoords;
    leftEye.matrix.setTranslate(0.075, 0.175, -0.151);
    leftEye.matrix.scale(0.05, 0.05, 0.05);
    leftEye.render([0, 0, 0, 1.0]);

    // draw right eye
    var rightEye = new Cube();
    rightEye.matrix = headCoords;
    rightEye.matrix.setTranslate(-0.125, 0.175, -0.151);
    rightEye.matrix.scale(0.05, 0.05, 0.05);
    rightEye.render([0, 0, 0, 1.0]);

    // draw left ear
    var leftEar = new Cube();
    leftEar.matrix = headCoords;
    leftEar.matrix.setTranslate(0.075, 0.2, -0.05);
    leftEar.matrix.rotate(45, 0, 0, 1);
    leftEar.matrix.scale(0.1, 0.1, 0.05);
    leftEar.render([0.5, 0.3, 0.0, 1.0]);

    // draw left ear
    var rightEar = new Cube();
    rightEar.matrix = headCoords;
    rightEar.matrix.setTranslate(-0.075, 0.2, -0.05);
    rightEar.matrix.rotate(45, 0, 0, 1);
    rightEar.matrix.scale(0.1, 0.1, 0.05);
    rightEar.render([0.5, 0.3, 0.0, 1.0]);

    // draw front left upper leg
    var leftFU = new Cube();
    leftFU.matrix = new Matrix4(bodyCoords);
    leftFU.matrix.translate(1.2, -0.75, 0.75);
    leftFU.matrix.rotate(180, 0, 0, 1);
    leftFU.matrix.rotate(-15, 1, 0, 0);
    leftFU.matrix.rotate(g_FLU, 1, 0, 0);
    var leftFUCoords = new Matrix4(leftFU.matrix);
    leftFU.matrix.scale(0.3, 1.1, 0.5);
    leftFU.render([0.6, 0.4, 0.0, 1.0]);

    // draw left Lower Leg
    var leftFL = new Cube();
    leftFL.matrix = leftFUCoords;
    leftFL.matrix.translate(0.0, 1.0 , 0.0);
    leftFL.matrix.rotate(30, 1, 0, 0);
    leftFL.matrix.rotate(g_FLL, 1, 0, 0);
    var leftFLCoords = new Matrix4(leftFL.matrix);
    leftFL.matrix.scale(.3, 1.0, 0.5);
    leftFL.render([.65, .35, 0.0, 1.0]);

    // draw left front paw
    var leftFP = new Cube();
    leftFP.matrix = leftFLCoords;
    leftFP.matrix.translate(-0.01, 1.0, 0.5);
    leftFP.matrix.rotate(180, 1, 0, 0);
    leftFP.matrix.rotate(g_FLP, 1, 0, 0);
    leftFP.matrix.scale(0.34, 0.2, 1.);
    leftFP.render([0.7, 0.5, 0.0, 1.0]);

    // draw front right upper leg
    var rightFU = new Cube();
    rightFU.matrix = new Matrix4(bodyCoords);
    rightFU.matrix.translate(0.1, -0.75, 0.75);
    rightFU.matrix.rotate(180, 0, 0, 1);
    rightFU.matrix.rotate(-15, 1, 0, 0);
    rightFU.matrix.rotate(g_FRU, 1, 0, 0);
    var rightFUCoords = new Matrix4(rightFU.matrix);
    rightFU.matrix.scale(0.3, 1.1, 0.5);
    rightFU.render([0.6, 0.4, 0.0, 1.0]);

    // draw right Lower Leg
    var rightFL = new Cube();
    rightFL.matrix = rightFUCoords;
    rightFL.matrix.translate(0.0, 1.0 , 0.0);
    rightFL.matrix.rotate(30, 1, 0, 0);
    rightFL.matrix.rotate(g_FRL, 1, 0, 0);
    var rightFLCoords = new Matrix4(rightFL.matrix);
    rightFL.matrix.scale(0.3, 1.0, 0.5);
    rightFL.render([.65, .35, 0.0, 1.0]);

    // draw right front paw
    var rightFP = new Cube();
    rightFP.matrix = rightFLCoords;
    rightFP.matrix.translate(-0.01, 1.0, 0.5);
    rightFP.matrix.rotate(180, 1, 0, 0);
    rightFP.matrix.rotate(g_FRP, 1, 0, 0);
    rightFP.matrix.scale(0.34, 0.2, 1.0);
    rightFP.render([0.7, 0.5, 0.0, 1.0]);

    // draw back left upper leg
    var leftBU = new Cube();
    leftBU.matrix = new Matrix4(bodyCoords);
    leftBU.matrix.translate(0.1, -0.75, 3.25);
    leftBU.matrix.rotate(180, 0, 0, 1);
    leftBU.matrix.rotate(-15, 1, 0, 0);
    leftBU.matrix.rotate(g_BLU, 1, 0, 0);
    var leftBUCoords = new Matrix4(leftBU.matrix);
    leftBU.matrix.scale(0.3, 1.1, 0.5);
    leftBU.render([0.6, 0.4, 0.0, 1.0]);

    // draw Back left Lower Leg
    var leftBL = new Cube();
    leftBL.matrix = leftBUCoords;
    leftBL.matrix.translate(0.0, 1.0 , 0.0);
    leftBL.matrix.rotate(30, 1, 0, 0);
    leftBL.matrix.rotate(g_BLL, 1, 0, 0);
    var leftBLCoords = new Matrix4(leftBL.matrix);
    leftBL.matrix.scale(0.3, 1.0, 0.5);
    leftBL.render([.65, .35, 0.0, 1.0]);

    // draw left Back paw
    var leftBP = new Cube();
    leftBP.matrix = leftBLCoords;
    leftBP.matrix.translate(-0.01, 1.0, 0.5);
    leftBP.matrix.rotate(180, 1, 0, 0);
    leftBP.matrix.rotate(g_BLP, 1, 0, 0);
    leftBP.matrix.scale(0.34, 0.2, 1.0);
    leftBP.render([0.5, 0.35, 0.0, 1.0]);

    // draw front right Back leg
    var rightBU = new Cube();
    rightBU.matrix = new Matrix4(bodyCoords);
    rightBU.matrix.translate(1.2, -0.75, 3.25);
    rightBU.matrix.rotate(180, 0, 0, 1);
    rightBU.matrix.rotate(-15, 1, 0, 0);
    rightBU.matrix.rotate(g_BRU, 1, 0, 0);
    var rightBUCoords = new Matrix4(rightBU.matrix);
    rightBU.matrix.scale(0.3, 1.1, 0.5);
    rightBU.render([0.65, 0.4, 0.0, 1.0]);

    // draw Back right Lower Leg
    var rightBL = new Cube();
    rightBL.matrix = rightBUCoords;
    rightBL.matrix.translate(0.0, 1.0 , 0.0);
    rightBL.matrix.rotate(30, 1, 0, 0);
    rightBL.matrix.rotate(g_BRL, 1, 0, 0);
    var rightBLCoords = new Matrix4(rightBL.matrix);
    rightBL.matrix.scale(0.3, 1.0, 0.5);
    rightBL.render([.55, .35, 0.0, 1.0]);

    // draw right Back paw
    var rightBP = new Cube();
    rightBP.matrix = rightBLCoords;
    rightBP.matrix.translate(-0.01, 1.0, 0.5);
    rightBP.matrix.rotate(180, 1, 0, 0);
    rightBP.matrix.rotate(g_BRP, 1, 0, 0);
    rightBP.matrix.scale(0.34, 0.2, 1.0);
    rightBP.render([0.5, 0.3, 0.0, 1.0]);
}
