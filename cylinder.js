let g_cylinderVertexBuffer = null;
let g_cylinderNormalBuffer = null;
let g_cylinderVertices = null;
let g_cylinderNormals = null;

class Cylinder {
    constructor() {
        this.color = [1.0, 1.0, 1.0, 1.0];  // [r, g, b, a]
        this.matrix = new Matrix4();
        this.normalMatrix = new Matrix4();
        this.segments = 12;  // Number of segments around the cylinder

        // Initialize cylinder vertices and normals if needed
        if (g_cylinderVertices === null) {
            this.generateVertices();
        }

        if (g_cylinderVertexBuffer === null) {
            g_cylinderVertexBuffer = gl.createBuffer();
            if (!g_cylinderVertexBuffer) {
                console.log('Failed to create the cylinder vertex buffer object');
            }
            
            // Bind the buffer object to target
            gl.bindBuffer(gl.ARRAY_BUFFER, g_cylinderVertexBuffer);
            
            // Write data into the buffer object
            gl.bufferData(gl.ARRAY_BUFFER, g_cylinderVertices, gl.STATIC_DRAW);
        }

        if (g_cylinderNormalBuffer === null) {
            g_cylinderNormalBuffer = gl.createBuffer();
            if (!g_cylinderNormalBuffer) {
                console.log('Failed to create the cylinder normal buffer object');
            }
            
            // Bind the buffer object to target
            gl.bindBuffer(gl.ARRAY_BUFFER, g_cylinderNormalBuffer);
            
            // Write data into the buffer object
            gl.bufferData(gl.ARRAY_BUFFER, g_cylinderNormals, gl.STATIC_DRAW);
        }
    }

    generateVertices() {
        const segments = this.segments;
        const angleStep = 360 / segments;
        
        // Arrays to store all vertices and normals
        let verticesArray = [];
        let normalsArray = [];
        
        // Generate all the vertices and normals
        for (let i = 0; i < segments; i++) {
            const angle1 = i * angleStep;
            const angle2 = ((i + 1) % segments) * angleStep;
            
            const x1 = 0.5 * Math.cos(angle1 * Math.PI / 180);
            const z1 = 0.5 * Math.sin(angle1 * Math.PI / 180);
            const x2 = 0.5 * Math.cos(angle2 * Math.PI / 180);
            const z2 = 0.5 * Math.sin(angle2 * Math.PI / 180);
            
            // Side vertices (two triangles per segment)
            verticesArray.push(
                // First triangle
                x1, 0.0, z1,
                x2, 0.0, z2,
                x1, 1.0, z1,
                
                // Second triangle
                x1, 1.0, z1,
                x2, 0.0, z2,
                x2, 1.0, z2
            );
            
            // Side normals (pointing outward from cylinder axis)
            // Each vertex on the side gets the normal pointing radially outward
            const norm1X = x1 / 0.5; // Normalize to unit vector
            const norm1Z = z1 / 0.5;
            const norm2X = x2 / 0.5;
            const norm2Z = z2 / 0.5;
            
            normalsArray.push(
                // First triangle normals
                norm1X, 0.0, norm1Z,
                norm2X, 0.0, norm2Z,
                norm1X, 0.0, norm1Z,
                
                // Second triangle normals
                norm1X, 0.0, norm1Z,
                norm2X, 0.0, norm2Z,
                norm2X, 0.0, norm2Z
            );
            
            // Top circle vertices
            verticesArray.push(
                0.0, 1.0, 0.0,
                x1, 1.0, z1,
                x2, 1.0, z2
            );
            
            // Top circle normals (pointing up)
            normalsArray.push(
                0.0, 1.0, 0.0,
                0.0, 1.0, 0.0,
                0.0, 1.0, 0.0
            );
            
            // Bottom circle vertices
            verticesArray.push(
                0.0, 0.0, 0.0,
                x2, 0.0, z2,  // Note: reversed order for correct winding
                x1, 0.0, z1
            );
            
            // Bottom circle normals (pointing down)
            normalsArray.push(
                0.0, -1.0, 0.0,
                0.0, -1.0, 0.0,
                0.0, -1.0, 0.0
            );
        }
        
        // Convert arrays to Float32Array for WebGL
        g_cylinderVertices = new Float32Array(verticesArray);
        g_cylinderNormals = new Float32Array(normalsArray);
    }
    
    render(color) {
        var rgba = color || this.color;
        
        // Set the model matrix
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        
        // Set the normal matrix
        this.normalMatrix.setInverseOf(this.matrix).transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, this.normalMatrix.elements);
        
        // Set the color
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        
        // Bind the vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, g_cylinderVertexBuffer);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);
        
        // Bind the normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, g_cylinderNormalBuffer);
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);
        
        // Draw all triangles at once
        gl.drawArrays(gl.TRIANGLES, 0, g_cylinderVertices.length / 3);
    }
}