// Vertex shader program
const VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec3 a_Normal;
    varying vec3 v_Normal;
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_NormalMatrix;
    uniform mat4 u_GlobalRotateMatrix;
    uniform mat4 u_ProjectionMatrix;
    varying vec4 v_VertPos;

    void main() {
        gl_Position = u_ProjectionMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
        v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 1.0)));
        v_VertPos = u_ModelMatrix * a_Position;
    }`;

// Fragment shader program
const FSHADER_SOURCE = `
    precision mediump float;
    varying vec3 v_Normal;
    uniform vec4 u_FragColor;
    uniform int u_UseNormalColors;
    uniform vec3 u_LightPos;
    uniform vec3 u_SpotlightPos;
    uniform vec3 u_cameraPos;
    varying vec4 v_VertPos;
    uniform bool u_LightOff;
    uniform vec3 u_SpotlightDir;
    uniform float u_SpotlightCutoff;
    uniform float u_SpotlightOuterCutoff;
    void main() {
        if (u_UseNormalColors == 1) {
            gl_FragColor = vec4((v_Normal + 1.0) / 2.0, 1.0);
        } else{
            gl_FragColor = u_FragColor;
        }

        vec3 N = normalize(v_Normal);
        vec3 E = normalize(u_cameraPos - vec3(v_VertPos));

        // Point light calculation
        vec3 lightVector1 = u_LightPos - vec3(v_VertPos);
        vec3 L1 = normalize(lightVector1);
        float nDotL1 = max(dot(N, L1), 0.0);
        vec3 R1 = reflect(-L1, N);
        float specular1 = pow(max(dot(E, R1), 0.0), 5.0);

        // Spotlight calculation
        vec3 lightVector2 = u_SpotlightPos - vec3(v_VertPos);
        vec3 L2 = normalize(lightVector2);
        float nDotL2 = max(dot(N, L2), 0.0);
        
        vec3 spotDir = normalize(u_SpotlightDir);
        float theta = dot(L2, normalize(-spotDir));
        float epsilon = u_SpotlightCutoff - u_SpotlightOuterCutoff;
        float intensity = clamp((theta - u_SpotlightOuterCutoff) / epsilon, 0.0, 1.0);
        
        vec3 R2 = reflect(-L2, N);
        float specular2 = pow(max(dot(E, R2), 0.0), 5.0) * intensity;

        bool isSky = (gl_FragColor.r > 0.4 && gl_FragColor.r < 0.6 && 
              gl_FragColor.g > 0.6 && gl_FragColor.g < 0.8 && 
              gl_FragColor.b > 0.9);

        // Combine both lights
        vec3 diffuse = vec3(gl_FragColor) * nDotL1 + vec3(gl_FragColor) * (nDotL2 * intensity * .5);
        vec3 specular = vec3(specular1 + specular2);
        
        vec3 ambient = vec3(gl_FragColor) * 0.3;
        
        if (!u_LightOff) {
            if (isSky) {
                gl_FragColor = vec4(diffuse + ambient, 1.0);
            } else {
                gl_FragColor = vec4(specular + diffuse + ambient, 1.0);
            }
        }
    }`;

// Global variables
let gl;
let canvas;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let u_LightPos;
let u_ProjectionMatrix;
let a_Normal;
let u_NormalMatrix;
let u_UseNormalColors;
let u_cameraPos;
let u_LightOff; // Toggle light off/on
let u_SpotlightDir;
let u_SpotlightCutoff;
let u_SpotlightOuterCutoff;
let u_SpotlightPos;

let g_lastTime = performance.now();
let g_frameCount = 0;
let g_fps = 0;
let g_Normals = false; // Toggle normals display
let g_lightPos = [0,1,-1.5];
let g_spotlightPos = [.3, 1.5, .2];
let g_spotlightDir = [0, -1, 0]; // Point downward
let g_spotlightCutoff = Math.cos(12.5 * Math.PI / 180); // Inner cone (12.5 degrees)
let g_spotlightOuterCutoff = Math.cos(17.5 * Math.PI / 180); // Outer cone (17.5 degrees)
let g_shapes = {};

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
let g_isAnimating = false;
let g_lastAnimationTime = 0;


function main() {
    // set up webGL context
    setupWebGL();
    
    connectVariablesToGLSL();

    addActionsForHtmlUI();
    
    setupMouseHandlers();

    initializeShapes();

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

    u_LightPos = gl.getUniformLocation(gl.program, 'u_LightPos');
    if (!u_LightPos) {
        console.log('Failed to get u_LightPos');
        return;
    }
    
    u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
    if (!u_cameraPos) {
        console.log('Failed to get u_cameraPos');
        return;
    }
    u_LightOff = gl.getUniformLocation(gl.program, 'u_LightOff');
    if (!u_LightOff) {
        console.log('Failed to get u_LightOff');
        return;
    }

    u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    if (!u_NormalMatrix) {
        console.log('Failed to get u_NormalMatrix');
        return;
    }
    u_SpotlightDir = gl.getUniformLocation(gl.program, 'u_SpotlightDir');
    if (!u_SpotlightDir) {
        console.log('Failed to get u_SpotlightDir');
        return;
    }
    u_SpotlightCutoff = gl.getUniformLocation(gl.program, 'u_SpotlightCutoff');
    if (!u_SpotlightCutoff) {
        console.log('Failed to get u_SpotlightCutoff');
        return;
    }
    u_SpotlightOuterCutoff = gl.getUniformLocation(gl.program, 'u_SpotlightOuterCutoff');
    if (!u_SpotlightOuterCutoff) {
        console.log('Failed to get u_SpotlightOuterCutoff');
        return;
    }
    u_SpotlightPos = gl.getUniformLocation(gl.program, 'u_SpotlightPos');
    if (!u_SpotlightPos) {
        console.log('Failed to get u_SpotlightPos');
        return;
    }
    
    var identityM = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

// set up event listeners
function addActionsForHtmlUI() {
    document.getElementById("start").onclick = function() {g_Animation = true;};
    document.getElementById("stop").onclick = function() {g_Animation = false;};
    document.getElementById("On").onclick = function() {g_Normals = true, gl.uniform1i(u_UseNormalColors, 1);};
    document.getElementById("Off").onclick = function() {g_Normals = false, gl.uniform1i(u_UseNormalColors, 0);};
    document.getElementById("LightO").onclick = function() {gl.uniform1i(u_LightOff, false);};
    document.getElementById("LightOff").onclick = function() {gl.uniform1i(u_LightOff, true);};

    document.getElementById("lightSliderX").addEventListener("mousemove", function() { g_lightPos[0]= this.value/100; renderScene();});
    document.getElementById("lightSliderY").addEventListener("mousemove", function() { g_lightPos[1]= this.value/100; renderScene();});
    document.getElementById("lightSliderZ").addEventListener("mousemove", function() { g_lightPos[2]= this.value/100; renderScene();});

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
        } else if (g_Animation) {
            updateRunAnimation();
            
        }
    }

    g_lightPos[0] = Math.sin(g_seconds);

    // Only render when something has changed
    
    renderScene();
    
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

function initializeShapes() {
    // Initialize all shapes once
    g_shapes.sky = new Cube();
    g_shapes.sphere = new Sphere();
    g_shapes.light = new Cube();
    g_shapes.spotLight = new Cube();
    g_shapes.body = new Cube();
    g_shapes.tail = new Cylinder();
    g_shapes.head = new Cube();
    g_shapes.mouthRoof = new Cube();
    g_shapes.mouthFloor = new Cube();
    g_shapes.leftEye = new Cube();
    g_shapes.rightEye = new Cube();
    g_shapes.leftEar = new Cube();
    g_shapes.rightEar = new Cube();
    g_shapes.leftFU = new Cube();
    g_shapes.leftFL = new Cube();
    g_shapes.leftFP = new Cube();
    g_shapes.rightFU = new Cube();
    g_shapes.rightFL = new Cube();
    g_shapes.rightFP = new Cube();
    g_shapes.leftBU = new Cube();
    g_shapes.leftBL = new Cube();
    g_shapes.leftBP = new Cube();
    g_shapes.rightBU = new Cube();
    g_shapes.rightBL = new Cube();
    g_shapes.rightBP = new Cube();
    g_shapes.teapot = new Model(gl, 'teapot.obj');
}

// render all shapes
function renderScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a global rotation matrix that combines X and Y rotations
    var globalRotateMatrix = new Matrix4()
        .translate(0, 0, -2.5)
        .rotate(g_globalAngleX, 1, 0, 0)
        .rotate(g_globalAngleY, 0, 1, 0);
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotateMatrix.elements);

    let projMatrix = new Matrix4();
    projMatrix.setPerspective(90, canvas.width / canvas.height, 0.1, 100);
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMatrix.elements);

    gl.uniform3f(u_LightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
    gl.uniform3f(u_SpotlightDir, g_spotlightDir[0], g_spotlightDir[1], g_spotlightDir[2]);
    gl.uniform1f(u_SpotlightCutoff, g_spotlightCutoff);
    gl.uniform1f(u_SpotlightOuterCutoff, g_spotlightOuterCutoff);
    gl.uniform3f(u_SpotlightPos, g_spotlightPos[0], g_spotlightPos[1], g_spotlightPos[2]);

    var radX = g_globalAngleX * Math.PI / 180;
    var radY = g_globalAngleY * Math.PI / 180;
    
    var cameraX = -2.5 * Math.sin(radY) * Math.cos(radX);
    var cameraY = 2.5 * Math.sin(radX);
    var cameraZ = 2.5 * Math.cos(radY) * Math.cos(radX);
    gl.uniform3f(u_cameraPos, cameraX, cameraY, cameraZ);

    // Sky - reuse existing shape
    g_shapes.sky.matrix.setTranslate(2.5, 2.5, 2.5);
    g_shapes.sky.matrix.scale(-5, -5, -5);
    g_shapes.sky.render([0.5, 0.7, 1.0, 1.0]);

    g_shapes.teapot.matrix.translate(2, 2, 2); // Position the teapot
    g_shapes.teapot.matrix.scale(0.5, 0.5, 0.5); // Scale if needed
    g_shapes.teapot.render(gl, gl.program);

    // Sphere - reuse existing shape
    g_shapes.sphere.matrix.setTranslate(0.5, .5, 0);
    g_shapes.sphere.matrix.scale(0.5, 0.5, 0.5);
    g_shapes.sphere.render([0.8, 0.5, 0.7, 1.0]);

    // Light - reuse existing shape
    g_shapes.light.matrix.setTranslate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
    g_shapes.light.matrix.scale(-0.1, -0.1, -0.1);
    g_shapes.light.normalMatrix.setInverseOf(g_shapes.light.matrix).transpose();
    g_shapes.light.render([2.0, 2.0, 0.0, 1.0]);

    // Light - reuse existing shape
    g_shapes.spotLight.matrix.setTranslate(g_spotlightPos[0], g_spotlightPos[1], g_spotlightPos[2]);
    g_shapes.spotLight.matrix.scale(-0.1, -0.1, -0.1);
    g_shapes.spotLight.normalMatrix.setInverseOf(g_shapes.spotLight.matrix).transpose();
    g_shapes.spotLight.render([2.0, 2.0, 0.0, 1.0]);

    // Body - reuse existing shape
    g_shapes.body.matrix.setTranslate(-0.25, -0.2, -0.05);
    g_shapes.body.matrix.rotate(g_body, 1, 0, 0);
    var bodyCoords = new Matrix4(g_shapes.body.matrix);
    g_shapes.body.matrix.scale(0.5, 0.3, 0.65);
    g_shapes.body.normalMatrix.setInverseOf(g_shapes.body.matrix).transpose();
    g_shapes.body.render([0.45, 0.3, 0.0, 1.0]);

    // Tail - reuse existing shape
    g_shapes.tail.matrix = bodyCoords;
    g_shapes.tail.matrix.translate(0.25, 0.25, 0.55);
    g_shapes.tail.matrix.rotate(45, 1, 0, 0);
    g_shapes.tail.matrix.rotate(g_tail, 0, 0, 1);
    g_shapes.tail.matrix.scale(0.1, 0.4, 0.1);
    g_shapes.tail.render([0.4, 0.2, 0.0, 1.0]);

    // Head - reuse existing shape
    g_shapes.head.matrix = bodyCoords;
    g_shapes.head.matrix.setTranslate(-0.175, 0.025, -0.15);
    var headCoords = new Matrix4(g_shapes.head.matrix);
    g_shapes.head.matrix.scale(0.35, 0.25, 0.2);
    g_shapes.head.render([0.5, 0.3, 0.0, 1.0]);

    // Mouth roof - reuse existing shape
    g_shapes.mouthRoof.matrix = headCoords;
    g_shapes.mouthRoof.matrix.setTranslate(-0.075, 0.075, -0.3);
    g_shapes.mouthRoof.matrix.scale(0.15, 0.075, 0.2);
    g_shapes.mouthRoof.render([0.5, 0.2, 0.0, 1.0]);

    // Mouth floor - reuse existing shape
    g_shapes.mouthFloor.matrix = headCoords;
    g_shapes.mouthFloor.matrix.setTranslate(0.075, 0.025, -0.1);
    g_shapes.mouthFloor.matrix.rotate(180, 0, 1, 0);
    g_shapes.mouthFloor.matrix.rotate(10, 1, 0, 0);
    g_shapes.mouthFloor.matrix.rotate(g_mouth, 1, 0, 0);
    g_shapes.mouthFloor.matrix.scale(0.15, 0.075, 0.2);
    g_shapes.mouthFloor.normalMatrix.setInverseOf(g_shapes.mouthFloor.matrix).transpose();
    g_shapes.mouthFloor.render([0.5, 0.3, 0.0, 1.0]);

    // Left eye - reuse existing shape
    g_shapes.leftEye.matrix = headCoords;
    g_shapes.leftEye.matrix.setTranslate(0.075, 0.175, -0.151);
    g_shapes.leftEye.matrix.scale(0.05, 0.05, 0.05);
    g_shapes.leftEye.render([0, 0, 0, 1.0]);

    // Right eye - reuse existing shape
    g_shapes.rightEye.matrix = headCoords;
    g_shapes.rightEye.matrix.setTranslate(-0.125, 0.175, -0.151);
    g_shapes.rightEye.matrix.scale(0.05, 0.05, 0.05);
    g_shapes.rightEye.render([0, 0, 0, 1.0]);

    // Left ear - reuse existing shape
    g_shapes.leftEar.matrix = headCoords;
    g_shapes.leftEar.matrix.setTranslate(0.075, 0.2, -0.05);
    g_shapes.leftEar.matrix.rotate(45, 0, 0, 1);
    g_shapes.leftEar.matrix.scale(0.1, 0.1, 0.05);
    g_shapes.leftEar.render([0.5, 0.3, 0.0, 1.0]);

    // Right ear - reuse existing shape
    g_shapes.rightEar.matrix = headCoords;
    g_shapes.rightEar.matrix.setTranslate(-0.075, 0.2, -0.05);
    g_shapes.rightEar.matrix.rotate(45, 0, 0, 1);
    g_shapes.rightEar.matrix.scale(0.1, 0.1, 0.05);
    g_shapes.rightEar.render([0.5, 0.3, 0.0, 1.0]);

    // Front left upper leg - reuse existing shape
    g_shapes.leftFU.matrix = new Matrix4(bodyCoords);
    g_shapes.leftFU.matrix.translate(1.2, -0.75, 0.75);
    g_shapes.leftFU.matrix.rotate(180, 0, 0, 1);
    g_shapes.leftFU.matrix.rotate(-15, 1, 0, 0);
    g_shapes.leftFU.matrix.rotate(g_FLU, 1, 0, 0);
    var leftFUCoords = new Matrix4(g_shapes.leftFU.matrix);
    g_shapes.leftFU.matrix.scale(0.3, 1.1, 0.5);
    g_shapes.leftFU.normalMatrix.setInverseOf(g_shapes.leftFU.matrix).transpose();
    g_shapes.leftFU.render([0.6, 0.4, 0.0, 1.0]);

    // Left front lower leg - reuse existing shape
    g_shapes.leftFL.matrix = leftFUCoords;
    g_shapes.leftFL.matrix.translate(0.0, 1.0 , 0.0);
    g_shapes.leftFL.matrix.rotate(30, 1, 0, 0);
    g_shapes.leftFL.matrix.rotate(g_FLL, 1, 0, 0);
    var leftFLCoords = new Matrix4(g_shapes.leftFL.matrix);
    g_shapes.leftFL.matrix.scale(.3, 1.0, 0.5);
    g_shapes.leftFL.normalMatrix.setInverseOf(g_shapes.leftFL.matrix).transpose();
    g_shapes.leftFL.render([.65, .35, 0.0, 1.0]);

    // Left front paw - reuse existing shape
    g_shapes.leftFP.matrix = leftFLCoords;
    g_shapes.leftFP.matrix.translate(-0.01, 1.0, 0.5);
    g_shapes.leftFP.matrix.rotate(180, 1, 0, 0);
    g_shapes.leftFP.matrix.rotate(g_FLP, 1, 0, 0);
    g_shapes.leftFP.matrix.scale(0.34, 0.2, 1.);
    g_shapes.leftFP.normalMatrix.setInverseOf(g_shapes.leftFP.matrix).transpose();
    g_shapes.leftFP.render([0.7, 0.5, 0.0, 1.0]);

    // Front right upper leg - reuse existing shape
    g_shapes.rightFU.matrix = new Matrix4(bodyCoords);
    g_shapes.rightFU.matrix.translate(0.1, -0.75, 0.75);
    g_shapes.rightFU.matrix.rotate(180, 0, 0, 1);
    g_shapes.rightFU.matrix.rotate(-15, 1, 0, 0);
    g_shapes.rightFU.matrix.rotate(g_FRU, 1, 0, 0);
    var rightFUCoords = new Matrix4(g_shapes.rightFU.matrix);
    g_shapes.rightFU.matrix.scale(0.3, 1.1, 0.5);
    g_shapes.rightFU.normalMatrix.setInverseOf(g_shapes.rightFU.matrix).transpose();
    g_shapes.rightFU.render([0.6, 0.4, 0.0, 1.0]);

    // Right front lower leg - reuse existing shape
    g_shapes.rightFL.matrix = rightFUCoords;
    g_shapes.rightFL.matrix.translate(0.0, 1.0 , 0.0);
    g_shapes.rightFL.matrix.rotate(30, 1, 0, 0);
    g_shapes.rightFL.matrix.rotate(g_FRL, 1, 0, 0);
    var rightFLCoords = new Matrix4(g_shapes.rightFL.matrix);
    g_shapes.rightFL.matrix.scale(0.3, 1.0, 0.5);
    g_shapes.rightFL.normalMatrix.setInverseOf(g_shapes.rightFL.matrix).transpose();
    g_shapes.rightFL.render([.65, .35, 0.0, 1.0]);

    // Right front paw - reuse existing shape
    g_shapes.rightFP.matrix = rightFLCoords;
    g_shapes.rightFP.matrix.translate(-0.01, 1.0, 0.5);
    g_shapes.rightFP.matrix.rotate(180, 1, 0, 0);
    g_shapes.rightFP.matrix.rotate(g_FRP, 1, 0, 0);
    g_shapes.rightFP.matrix.scale(0.34, 0.2, 1.0);
    g_shapes.rightFP.normalMatrix.setInverseOf(g_shapes.rightFP.matrix).transpose();
    g_shapes.rightFP.render([0.7, 0.5, 0.0, 1.0]);

    // Back left upper leg - reuse existing shape
    g_shapes.leftBU.matrix = new Matrix4(bodyCoords);
    g_shapes.leftBU.matrix.translate(0.1, -0.75, 3.25);
    g_shapes.leftBU.matrix.rotate(180, 0, 0, 1);
    g_shapes.leftBU.matrix.rotate(-15, 1, 0, 0);
    g_shapes.leftBU.matrix.rotate(g_BLU, 1, 0, 0);
    var leftBUCoords = new Matrix4(g_shapes.leftBU.matrix);
    g_shapes.leftBU.matrix.scale(0.3, 1.1, 0.5);
    g_shapes.leftBU.normalMatrix.setInverseOf(g_shapes.leftBU.matrix).transpose();
    g_shapes.leftBU.render([0.6, 0.4, 0.0, 1.0]);

    // Back left lower leg - reuse existing shape
    g_shapes.leftBL.matrix = leftBUCoords;
    g_shapes.leftBL.matrix.translate(0.0, 1.0 , 0.0);
    g_shapes.leftBL.matrix.rotate(30, 1, 0, 0);
    g_shapes.leftBL.matrix.rotate(g_BLL, 1, 0, 0);
    var leftBLCoords = new Matrix4(g_shapes.leftBL.matrix);
    g_shapes.leftBL.matrix.scale(0.3, 1.0, 0.5);
    g_shapes.leftBL.normalMatrix.setInverseOf(g_shapes.leftBL.matrix).transpose();
    g_shapes.leftBL.render([.65, .35, 0.0, 1.0]);

    // Left back paw - reuse existing shape
    g_shapes.leftBP.matrix = leftBLCoords;
    g_shapes.leftBP.matrix.translate(-0.01, 1.0, 0.5);
    g_shapes.leftBP.matrix.rotate(180, 1, 0, 0);
    g_shapes.leftBP.matrix.rotate(g_BLP, 1, 0, 0);
    g_shapes.leftBP.matrix.scale(0.34, 0.2, 1.0);
    g_shapes.leftBP.normalMatrix.setInverseOf(g_shapes.leftBP.matrix).transpose();
    g_shapes.leftBP.render([0.5, 0.35, 0.0, 1.0]);

    // Back right upper leg - reuse existing shape
    g_shapes.rightBU.matrix = new Matrix4(bodyCoords);
    g_shapes.rightBU.matrix.translate(1.2, -0.75, 3.25);
    g_shapes.rightBU.matrix.rotate(180, 0, 0, 1);
    g_shapes.rightBU.matrix.rotate(-15, 1, 0, 0);
    g_shapes.rightBU.matrix.rotate(g_BRU, 1, 0, 0);
    var rightBUCoords = new Matrix4(g_shapes.rightBU.matrix);
    g_shapes.rightBU.matrix.scale(0.3, 1.1, 0.5);
    g_shapes.rightBU.normalMatrix.setInverseOf(g_shapes.rightBU.matrix).transpose();
    g_shapes.rightBU.render([0.65, 0.4, 0.0, 1.0]);

    // Back right lower leg - reuse existing shape
    g_shapes.rightBL.matrix = rightBUCoords;
    g_shapes.rightBL.matrix.translate(0.0, 1.0 , 0.0);
    g_shapes.rightBL.matrix.rotate(30, 1, 0, 0);
    g_shapes.rightBL.matrix.rotate(g_BRL, 1, 0, 0);
    var rightBLCoords = new Matrix4(g_shapes.rightBL.matrix);
    g_shapes.rightBL.matrix.scale(0.3, 1.0, 0.5);
    g_shapes.rightBL.normalMatrix.setInverseOf(g_shapes.rightBL.matrix).transpose();
    g_shapes.rightBL.render([.55, .35, 0.0, 1.0]);

    // Right back paw - reuse existing shape
    g_shapes.rightBP.matrix = rightBLCoords;
    g_shapes.rightBP.matrix.translate(-0.01, 1.0, 0.5);
    g_shapes.rightBP.matrix.rotate(180, 1, 0, 0);
    g_shapes.rightBP.matrix.rotate(g_BRP, 1, 0, 0);
    g_shapes.rightBP.matrix.scale(0.34, 0.2, 1.0);
    g_shapes.rightBP.normalMatrix.setInverseOf(g_shapes.rightBP.matrix).transpose();
    g_shapes.rightBP.render([0.5, 0.3, 0.0, 1.0]);
}