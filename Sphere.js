let g_sphereVertexBuffer = null;
let g_sphereNormalBuffer = null;
let g_sphereVertices = null;
let g_sphereNormals = null;
let g_sphereIndices = null;
let g_sphereIndexBuffer = null;

class Sphere {
    constructor() {
        this.color = [1.0, 1.0, 1.0, 1.0];        // [r, g, b, a]
        this.matrix = new Matrix4();

        // Initialize sphere vertices and normals if needed
        if (g_sphereVertices === null) {
            this.generateVertices();
        }

        if (g_sphereVertexBuffer === null) {
            g_sphereVertexBuffer = gl.createBuffer();
            if (!g_sphereVertexBuffer) {
                console.log('Failed to create the sphere vertex buffer object');
            }
            
            // Bind the buffer object to target
            gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereVertexBuffer);
            
            // Write data into the buffer object
            gl.bufferData(gl.ARRAY_BUFFER, g_sphereVertices, gl.STATIC_DRAW);
        }

        if (g_sphereNormalBuffer === null) {
            g_sphereNormalBuffer = gl.createBuffer();
            if (!g_sphereNormalBuffer) {
                console.log('Failed to create the sphere normal buffer object');
            }
            
            // Bind the buffer object to target
            gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereNormalBuffer);
            
            // Write data into the buffer object
            gl.bufferData(gl.ARRAY_BUFFER, g_sphereNormals, gl.STATIC_DRAW);
        }

        if (g_sphereIndexBuffer === null) {
            g_sphereIndexBuffer = gl.createBuffer();
            if (!g_sphereIndexBuffer) {
                console.log('Failed to create the sphere index buffer object');
            }
            
            // Bind the buffer object to target
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g_sphereIndexBuffer);
            
            // Write data into the buffer object
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g_sphereIndices, gl.STATIC_DRAW);
        }
    }

    generateVertices() {
        const radius = 0.5;
        const latitudeBands = 20;
        const longitudeBands = 20;
        
        const vertices = [];
        const normals = [];
        const indices = [];
        
        // Generate vertices and normals
        for (let lat = 0; lat <= latitudeBands; lat++) {
            const theta = (lat * Math.PI) / latitudeBands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            
            for (let lon = 0; lon <= longitudeBands; lon++) {
                const phi = (lon * 2 * Math.PI) / longitudeBands;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
                
                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;
                
                // Position (scaled by radius)
                vertices.push(radius * x);
                vertices.push(radius * y);
                vertices.push(radius * z);
                
                // Normal (unit vector pointing outward)
                normals.push(x);
                normals.push(y);
                normals.push(z);
            }
        }
        
        // Generate indices for triangles
        for (let lat = 0; lat < latitudeBands; lat++) {
            for (let lon = 0; lon < longitudeBands; lon++) {
                const first = lat * (longitudeBands + 1) + lon;
                const second = first + longitudeBands + 1;
                
                // First triangle
                indices.push(first);
                indices.push(second);
                indices.push(first + 1);
                
                // Second triangle
                indices.push(second);
                indices.push(second + 1);
                indices.push(first + 1);
            }
        }
        
        g_sphereVertices = new Float32Array(vertices);
        g_sphereNormals = new Float32Array(normals);
        g_sphereIndices = new Uint16Array(indices);
    }
    
    render(color) {
        var rgba = color || this.color;

        // Set the model matrix
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        
        // Set the color
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        
        // Bind the vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereVertexBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);
        
        // Bind the normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereNormalBuffer);
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);
        
        // Bind the index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g_sphereIndexBuffer);
        
        // Draw the sphere using indexed triangles
        gl.drawElements(gl.TRIANGLES, g_sphereIndices.length, gl.UNSIGNED_SHORT, 0);
    }
}