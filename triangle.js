let g_triangleBuffer = null;
let g_triangleBuffer3D = null;

class Triangle{
    constructor(){
        this.type='triangle';
        this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.size = 5.0;

        // Initialize buffer if needed
        if (g_triangleBuffer === null) {
            g_triangleBuffer = gl.createBuffer();
            if (!g_triangleBuffer) {
                console.log('Failed to create the triangle buffer object');
            }
        }

        this.vertices = null;

    }

    generateVertices() {
        let xy = this.position;
        let d = this.size / 20.0;
        
        // Create the vertices of the triangle
        this.vertices = new Float32Array([
            xy[0] - d/2, xy[1] - d/2, 
            xy[0] + d/2, xy[1] - d/2, 
            xy[0], xy[1] + d/2
        ]);
    }
 
    render(){
        var xy = this.position;
        var rgba = this.color;
        var size = this.size;
    
        // Pass color to u_FragColor
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
            
        // Generate vertices if needed
        if (this.vertices === null) {
            this.generateVertices();
        }

        // Bind the buffer object to target
        gl.bindBuffer(gl.ARRAY_BUFFER, g_triangleBuffer);
        
        // Write data into the buffer object
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);

        // Assign the buffer object to a_Position variable
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

        // Enable the assignment to a_Position variable
        gl.enableVertexAttribArray(a_Position);

        gl.drawArrays(gl.TRIANGLES, 0, 3);
    
    }
 }
 
 function drawTriangle(vertices){
    var n = 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, g_triangleBuffer);
    
    // Write data into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    gl.drawArrays(gl.TRIANGLES, 0, n);
 }
 
 function drawTriangle3D(vertices){
    var n = 3;
    // Create the buffer only once
    if (g_triangleBuffer3D === null) {
        g_triangleBuffer3D = gl.createBuffer();
        if (!g_triangleBuffer3D) {
            console.log('Failed to create the 3D triangle buffer object');
            return -1;
        }
    }
 
    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, g_triangleBuffer3D);
    // Write date into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
 
    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
 
    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);
 
    gl.drawArrays(gl.TRIANGLES, 0, n);
 }

 function drawTriangle3DNormal(vertices, uv, normals){
    var n = vertices.length / 3; // Number of vertices
    // Create the buffer only once
    if (g_triangleBuffer3D === null) {
        g_triangleBuffer3D = gl.createBuffer();
        if (!g_triangleBuffer3D) {
            console.log('Failed to create the 3D triangle buffer object');
            return -1;
        }
    }
 
    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, g_triangleBuffer3D);
    // Write date into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
 
    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
 
    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);


    var normalBuffer = gl.createBuffer();
    
    if (!normalBuffer) {
        console.log('Failed to create the 3D triangle buffer object');
        return -1;
    }
 
    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    // Write date into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.DYNAMIC_DRAW);
 
    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
 
    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Normal);
 
    gl.drawArrays(gl.TRIANGLES, 0, n);
 }

