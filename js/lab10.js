import * as m from "gl_math";
import { default as createIlluminationScene } from "scene_illumination";
import {Node, TrafoNode, RenderNode} from "gl_nodes";

let context = {}; //basicaly everything we need when we need it
let scene = {};







function initRender3D(context) {
    let ctx = context;

    // get HTML canvas element
    let canvas = document.querySelector("#canvas_gl");
    ctx.canvas = canvas;
    ctx.canvas.aspect = canvas.width / canvas.height;

    // get WebGL context
    let gl = canvas.getContext("webgl2");
    ctx.gl = gl;
    if (gl == null) {
        console.error("Can't get WebGL context.");
        return;
    }

    console.log(`[info] ${gl.getParameter(gl.VERSION)}`);
    console.log(`[info] ${gl.getParameter(gl.SHADING_LANGUAGE_VERSION)}`);

    // setup WebGL 
    gl.frontFace(gl.CCW);  // standard: GL_CCW
    gl.cullFace(gl.BACK);  // standard: GL_BACK
    gl.enable(gl.CULL_FACE);

    gl.depthFunc(gl.LESS); // standard: GL_LESS
    gl.enable(gl.DEPTH_TEST);

    // init viewer position and orientation
    context.viewer_azimuth = Math.PI * 0.25;
    context.viewer_altitude = Math.PI * 0.25;
    context.viewer_distance = 5.0;

    context.viewer_azimuth_down = context.viewer_azimuth;
    context.viewer_altitude_down = context.viewer_altitude;
    context.viewer_distance_down = context.viewer_distance;

    // create view and projection matrices
    //make a view and model matrix


    // create view and projection matrices
    //make a view and model matrix
    context.mat4_M = m.mat4_new_identity();     // model matrix
    context.mat4_V = m.mat4_new_identity();    // view matrix    
    context.mat4_P = m.mat4_new_identity();     // projection matrix
    context.mat4_VM = m.mat4_new_identity();    // model-view matrix
    context.mat4_PVM = m.mat4_new_identity();   // model-view-projection matrix
    context.mat3_N = m.mat3_new_identity();     // normal matrix: inverse transpose of 3x3 affine part

}

function initScene(context, scene) {
    let ctx = context;
    let gl = context.gl;

    // compile all shaders that are attached to scene
    for (const [name, program] of Object.entries(scene.programs)) {
        console.log("[info] compile program '" + name + "'");
        program.id = createProgram(gl,
            program.vertex_shader.source,
            program.fragment_shader.source);
        if (program.id == null) {
            console.log("[error] compiling program '" + name + "'");
            return false;
        }
        program.is_compiled = true;

        // get active attributes
        let n_attribs = gl.getProgramParameter(program.id, gl.ACTIVE_ATTRIBUTES);
        for (let j = 0; j < n_attribs; ++j) {
            let info = gl.getActiveAttrib(program.id, j);
            let loc = gl.getAttribLocation(program.id, info.name);
            console.log("  found attribute '" + info.name + "'");
            program.attributes[info.name] = loc;
        }

        // get active uniforms
        let n_uniforms = gl.getProgramParameter(program.id, gl.ACTIVE_UNIFORMS);
        for (let j = 0; j < n_uniforms; ++j) {
            let info = gl.getActiveUniform(program.id, j);
            let loc = gl.getUniformLocation(program.id, info.name);
            console.log("  found uniform '" + info.name + "'");
            program.uniforms[info.name] = loc;
        }
    }

    // create WebGL buffers for all geometries
    for (const [name, geometry] of Object.entries(scene.geometries)) {
        console.log("[info] creating buffers for geometry '" + name
            + "' with " + geometry.primitives + " primitives");

        // create attribute buffers
        for (const [attribute_name, buffer] of Object.entries(geometry.buffers)) {
            console.log("  buffer for attribute '" + attribute_name + "'");
            let buffer_gl = gl.createBuffer();
            geometry.buffers_gl[attribute_name] = buffer_gl;
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer_gl);
            gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);//transfer buffer data to the GPU
        }

        // create index (element) buffer
        if (geometry.elements) {
            console.log("  buffer for elements");
            let elements_gl = gl.createBuffer();
            geometry.elements_gl = elements_gl;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements_gl);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.elements, gl.STATIC_DRAW);
        }
    }

    // attach render functions to shader programs
    scene.programs['simple'].setRenderGeometryFunc(renderGeometrySimpleProgram);
    //scene.programs['phong_flat'].setRenderGeometryFunc(renderGeometryPhongProgram);
    scene.programs['shadow'].setRenderGeometryFunc(renderGeometryShadowProgram); //line 467
    scene.programs['texture'].setRenderGeometryFunc(renderGeometryTextureProgram); //line 417

    return true;
}


function initShadowMapping(context, scene) {
    let ctx = context;
    let gl = context.gl;
    // const SHADOWMAP_WIDTH = 256;
    // const SHADOWMAP_HEIGHT = 256;

    // init lights
    for (const [name, light] of Object.entries(scene.lights)) {

    }

    // create shadow maps
    for (const [name, light] of Object.entries(scene.lights)) {

        if (!light.hasShadowmap())
            continue;

        console.log(`[info] creating shadow map for light '${name}'`);

        // create Frame Buffer Object (FBO)
        light.shadowmap.fbo = gl.createFramebuffer();

        // create Texture for FBO color attachment and set parameters
        //   regarding texture format and texture processing
        light.shadowmap.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, light.shadowmap.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, light.shadowmap.width, light.shadowmap.height,
            0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // create Render Buffer for FBO depth attachment and set parameters
        light.shadowmap.depthbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, light.shadowmap.depthbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
            light.shadowmap.width, light.shadowmap.height);

        // attach texture and render buffer to FBO
        gl.bindFramebuffer(gl.FRAMEBUFFER, light.shadowmap.fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D, light.shadowmap.texture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
            gl.RENDERBUFFER, light.shadowmap.depthbuffer, 0);

        const result = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (result !== gl.FRAMEBUFFER_COMPLETE) {
            console.log(`[error] Problems creating FBO: ${result}`);
        }

        // // attach shadow matrix (identity)
        // light.shadowmap.mat4_vmp = mat4_new();
    }
}


function initMouseHandler(context) {

    context.is_mouse_down = false;
    context.mouse_down = [0.0, 0.0];
    context.mouse_move = [0.0, 0.0];
    context.mouse_wheel = 0.0;

    context.canvas.onmousedown = function (event) {
        let rect = event.target.getBoundingClientRect();

        context.is_mouse_down = true;
        context.mouse_down = transformClient2WebGL(
            [rect.left, rect.top, context.canvas.width, context.canvas.height],
            [event.clientX, event.clientY]
        );
        context.mouse_move = context.mouse_down;

        context.viewer_azimuth_down = context.viewer_azimuth;
        context.viewer_altitude_down = context.viewer_altitude;
        context.viewer_distance_down = context.viewer_distance;
    };

    context.canvas.onmousemove = function (event) {
        let rect = event.target.getBoundingClientRect();

        if (!context.is_mouse_down) {
            return;
        }

        context.mouse_move = transformClient2WebGL(
            [rect.left, rect.top, context.canvas.width, context.canvas.height],
            [event.clientX, event.clientY]
        );
    };

    context.canvas.onmouseup = function (event) {
        context.is_mouse_down = false;
    };

    context.canvas.onmouseout = function (event) {
        context.is_mouse_down = false;
    };

    context.canvas.onwheel = function (event) {
        context.mouse_wheel += event.deltaY;
        event.preventDefault();
    };
}


async function init(context) {
    initRender3D(context);
    scene = await createIlluminationScene(context.gl);
    initScene(context, scene);
    initShadowMapping(context, scene);
    initMouseHandler(context);
}


function transformClient2WebGL(canvas, mouse) {

    // transform in matrix-vector notation
    // c_wx, c_wy -- canvas width
    // c_x, c_y -- canvas position
    // m_x, m_y -- mouse position
    //
    // ┏ 1  0 ┓   ┏ 2/c_wx       0 ┓ ┏ m_x - c_x ┓   ┏ - 1.0 ┓
    // ┗ 0 -1 ┛ ( ┗      0  2/c_wy ┛ ┗ m_y - c_y ┛ + ┗ - 1.0 ┛ )
    //
    let x_premul = 2.0 / canvas[2];
    let y_premul = -2.0 / canvas[3];
    let x = x_premul * (mouse[0] - canvas[0]) - 1.0;
    let y = y_premul * (mouse[1] - canvas[1]) + 1.0;

    return [x, y];
}


/* 
 * The update() function updates the model
 * that you want to render; it changes the
 * state of the model.
 */
function update(context, timestamp) { //is an anmation function
    let ctx = context;    // shortcut alias
    let gl = context.gl;  // shortcut alias

    // lazy initialization
    if (!ctx.timestamp_last) {
        ctx.timestamp_last = timestamp;
        ctx.timestamp_init = timestamp;
        ctx.time = 0.0;
        ctx.angle = 0.0;
        ctx.speed = 20.0; // degree per second
        ctx.speed_zoom = 0.004;
        return;
    }
    // console.log("programs = ");
    // console.log(scene.geometries.mesh0.program);
    // get timestamps and update context
    let ts_init = ctx.timestamp_init;  // initial timestamp in ms
    let ts_last = ctx.timestamp_last   // last timestamp in ms
    let ts_curr = timestamp;           // current timestamp in ms
    ctx.timestamp_last = timestamp;
    ctx.time = (timestamp - ctx.timestamp_init) * 0.001; //unit: seconds?(probably)




    // setup viewer
    context.viewer_distance -= context.speed_zoom * context.mouse_wheel;
    context.mouse_wheel = 0.0;
    context.viewer_distance =
        Math.max(2.0, Math.min(context.viewer_distance, 50.0)); //how far you can zoom out / in (in being the first number)
    let dist = context.viewer_distance;
    let altitude = context.viewer_altitude;
    let azimuth = context.viewer_azimuth;



    if (context.is_mouse_down) {
        let speed_altitude = 1.0;
        let speed_azimuth = 1.0;
        let dx = context.mouse_move[0] - context.mouse_down[0];
        let dy = context.mouse_move[1] - context.mouse_down[1];
        altitude = context.viewer_altitude_down + speed_altitude * -dy;
        azimuth = context.viewer_azimuth_down + speed_azimuth * dx;
        altitude = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, altitude));
        context.viewer_altitude = altitude;
        context.viewer_azimuth = azimuth;
    }

    let cosAltitude = Math.cos(altitude);
    let sinAltitude = Math.sin(altitude);
    let cosAzimuth = Math.cos(azimuth);
    let sinAzimuth = Math.sin(azimuth);

    let eye0_x = cosAltitude * dist;
    let eye1_y = sinAltitude * dist;
    let eye1_x = cosAzimuth * eye0_x;
    let eye1_z = sinAzimuth * eye0_x;

    let eye = [eye1_x, eye1_y, eye1_z];
    let center = [0, 0, 0];
    let up = [0, 1, 0];

    // update viewer camera
    let aspect = context.canvas.aspect;


    //m is gl_math functions


    //changes here
    //if we have a heirachy of models then we alsways wanna modify the model matrix as were going throught the tree the _M one
    ctx.mat4_M = m.mat4_new_identity();

    // console.log("gemotries grid = ");
    // console.log(scene.geometries.grid);
    // console.log(scene.geometries.grid.program);
    // console.log(scene.geometries.grid.program.uniforms);
    // console.log(scene.geometries.grid.program.uniforms.u_PVM);
    // gl.useProgram(scene.geometries.grid.program.id)
    // gl.uniformMatrix4fv(scene.geometries.grid.program.uniforms.u_PVM, true,
    // [1,0,0,200,
    // 0,1,0,200,
    // 0,0,1,200,
    // 0,0,0,1]);

    //console.log(scene.geometries.mesh0);


    //let test = m.mat4_set_identity(ctx.mat4_M);//model position and orientation
    //test = m.mat4_set_col(test,3,[1,1,1,1])
    m.mat4_set_identity(ctx.mat4_M);//model position and orientation
    m.mat4_set_lookat(ctx.mat4_V, eye, center, up);//camera position and orientation
    m.mat4_set_perspective(ctx.mat4_P, 1.5, aspect, 0.1, 100.0);//camera projection

    //combination of matricies
    m.mat4_mul_mat4(ctx.mat4_VM, ctx.mat4_V, ctx.mat4_M);
    m.mat4_mul_mat4(ctx.mat4_PVM, ctx.mat4_P, ctx.mat4_VM);


    m.mat4_get_topleft_mat3(ctx.mat4_VM, ctx.mat3_N); // we just do euclidian

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // update rotating light
    const spot0 = scene.lights.spot0;

    if (spot0.speed === undefined) {
        spot0.speed = 0.20 * (2.0 * Math.PI);       //change this back to 0.2             // set rotation speed [turns / s]
        spot0.vec4_init = m.vec4_new(2.0, 4.0, 0.0, 1.0);       // initial position of light in model space
        spot0.mat4_Rt = m.mat4_new_identity();                  // rotation matrix
        spot0.vec3_position = m.vec3_new(0.0, 0.0, 0.0);        // inhomogeneous position
        spot0.vec3_center = m.vec3_new(0.0, 1.0, 0.0);          // look-at center
        spot0.vec3_up = m.vec3_new(0.0, 1.0, 0.0);              // up vector
    }

    let gird = scene.geometries.grid;
    //grid.program.uniforms.u_PVM = m.mat4_set_col(grid.program.uniforms.u_PVM, gird,3, m.vec4_new(20,10,10,1));
    // if(grid.speed === undefined) 
    // {
    //     grid.speed = 0.2 * (2.0 * Math.PI);                    // set rotation speed [turns / s]
    //     grid.vec4_init = m.vec4_new(2.0, 4.0, 0.0, 1.0);                    // initial position of light in model space
    //     grid.mat4_Rt = m.mat4_new_identity();                    // rotation matrix
    //     grid.vec3_position = m.vec3_new(0.0, 0.0, 0.0);                    // inhomogeneous position
    //     grid.vec3_center = m.vec3_new(0.0, 1.0, 0.0);                    // look-at center
    //     grid.vec3_up = m.vec3_new(0.0, 1.0, 0.0);                    // up vector
    // }

    //   spot0 position update (in world frame)
    spot0.angle = ctx.time * spot0.speed;
    m.mat4_set_identity(spot0.mat4_Rt);
    spot0.mat4_Rt[0] = Math.cos(spot0.angle); spot0.mat4_Rt[2] = Math.sin(spot0.angle);
    spot0.mat4_Rt[8] = -spot0.mat4_Rt[2]; spot0.mat4_Rt[10] = spot0.mat4_Rt[0];
    m.mat4_mul_vec4(spot0.vec4_position, spot0.mat4_Rt, spot0.vec4_init);

    // grid.angle = ctx.time * grid.speed;
    // m.mat4_set_identity(grid.mat4_Rt);
    // grid.mat4_Rt[0] = Math.cos(grid.angle); grid.mat4_Rt[2] = Math.sin(grid.angle);
    // grid.mat4_Rt[8] = -grid.mat4_Rt[2]; grid.mat4_Rt[10] = grid.mat4_Rt[0];
    // m.mat4_mul_vec4(grid.vec4_position, grid.mat4_Rt, grid.vec4_init);



    //   spot0 position in camera frame (viewer position frame)
    m.mat4_mul_vec4(spot0.vec4_position_camera, ctx.mat4_VM, spot0.vec4_position);

    //   spot0 direction update
    m.vec3_cpy_from_vec4(spot0.vec3_position, spot0.vec4_position);
    m.vec3_sub(spot0.vec3_direction, spot0.vec3_center, spot0.vec3_position);



    const spot1 = scene.lights.spot1;

    if (spot1.speed === undefined) {
        spot1.speed = -0.2 * (2.0 * Math.PI);                    // set rotation speed [turns / s]
        spot1.vec4_init = m.vec4_new(2.0, 10.0, 10.0, 1.0);       // initial position of light in model space
        spot1.mat4_Rt = m.mat4_new_identity();                  // rotation matrix
        spot1.vec3_position = m.vec3_new(0.0, 0.0, 0.0);        // inhomogeneous position
        spot1.vec3_center = m.vec3_new(0.0, 1.0, 0.0);          // look-at center
        spot1.vec3_up = m.vec3_new(0.0, 1.0, 0.0);              // up vector
    }

    //   spot1 position update (in world frame)
    spot1.angle = ctx.time * spot1.speed;
    m.mat4_set_identity(spot1.mat4_Rt);
    spot1.mat4_Rt[0] = Math.cos(spot1.angle); spot1.mat4_Rt[2] = Math.sin(spot1.angle);
    spot1.mat4_Rt[8] = -spot1.mat4_Rt[2]; spot1.mat4_Rt[10] = spot1.mat4_Rt[0];
    m.mat4_mul_vec4(spot1.vec4_position, spot1.mat4_Rt, spot1.vec4_init);

    //   spot1 position in camera frame (viewer position frame)
    m.mat4_mul_vec4(spot1.vec4_position_camera, ctx.mat4_VM, spot1.vec4_position);

    //   spot1 direction update
    m.vec3_cpy_from_vec4(spot1.vec3_position, spot1.vec4_position);
    m.vec3_sub(spot1.vec3_direction, spot1.vec3_center, spot1.vec3_position);
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    // update model-view-projection matrices for light
    //   parameters set_lookat(): eye, center, up
    //   parameters set_perspective(): fov (in radians), aspect, near, far
    m.mat4_set_lookat(spot0.shadowmap.mat4_VM, spot0.vec3_position, spot0.vec3_center, spot0.vec3_up);//VM is view matrix
    m.mat4_set_perspective(spot0.shadowmap.mat4_P, 0.5 * Math.PI, 1.0, 0.1, 100.0);
    m.mat4_mul_mat4(spot0.shadowmap.mat4_PVM, spot0.shadowmap.mat4_P, spot0.shadowmap.mat4_VM);

    m.mat4_set_lookat(spot1.shadowmap.mat4_VM, spot1.vec3_position, spot1.vec3_center, spot1.vec3_up);//VM is view matrix
    m.mat4_set_perspective(spot1.shadowmap.mat4_P, 0.5 * Math.PI, 1.0, .1, 100.0);
    m.mat4_mul_mat4(spot1.shadowmap.mat4_PVM, spot1.shadowmap.mat4_P, spot1.shadowmap.mat4_VM);

    let motion = Math.sin(context.time);
    scene.transforms.t1.set([
        1.0, 0.0, 0.0, 2.0+motion,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0,
    ])

    let alph2 = Math.PI/7.0;
    scene.transforms.t1.set(
        [
            Math.cos(motion), 0.0,           -(Math.sin(motion)),              0.0,
            0.0,            1.0,               0.0,                         0.0,
            Math.sin(motion), 0.0,               Math.cos(motion),            3.0,
            0.0,              0.0,              0.0,                        1.0,
        ])
}

function renderGemotry(gl, program, geometry) { //come back to this
    let buf_gl = geometry.buffers_gl["a_Position"];
    let buf = geometry.buffers["a_Position"];

    // console.log("what programs we have");
    // console.log(program);

    gl.useProgram(program.id);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf_gl);
    gl.vertexAttribPointer(program.attributes.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.uniform3f(program.uniforms.u_Color, 0.9, 0.0, 0.0);
    //gl.uniform4fv(program.uniforms.v_Color,.9, 0, 0, 0);
    gl.uniformMatrix4fv(program.uniforms.u_PVM, true, context.mat4_PVM);
}

function renderGeometrySimpleProgram(gl, program, geometry) {

    let buf_gl = geometry.buffers_gl["a_Position"];
    let buf = geometry.buffers["a_Position"];

    // console.log("what programs we have");
    // console.log(program);

    gl.useProgram(program.id);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf_gl);
    gl.vertexAttribPointer(program.attributes.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.uniform3f(program.uniforms.u_Color, 0.9, 0.0, 0.0);
    //gl.uniform4fv(program.uniforms.v_Color, .9, 0, 0, 0);
    gl.uniformMatrix4fv(program.uniforms.u_PVM, true, context.mat4_PVM);

    gl.drawArrays(geometry.primitives_type, 0, geometry.elements_count);
}


function renderGeometryTextureProgram(gl, program, geometry) {

    let buf_gl_Position = geometry.buffers_gl.a_Position;
    let buf_gl_Normal = geometry.buffers_gl.a_Normal;
    let buf_gl_TexCoord = geometry.buffers_gl.a_TexCoord;
    let buf_gl_elements = geometry.elements_gl;

    gl.useProgram(program.id); // .id contains the WebGL identifier

    // setup attribute pointers (attributes are different for each vertex)
    gl.bindBuffer(gl.ARRAY_BUFFER, buf_gl_Position);
    gl.vertexAttribPointer(program.attributes.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, buf_gl_Normal);
    gl.vertexAttribPointer(program.attributes.a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.a_Normal);

    gl.bindBuffer(gl.ARRAY_BUFFER, buf_gl_TexCoord);
    gl.vertexAttribPointer(program.attributes.a_TexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.a_TexCoord);

    // set uniforms (uniforms are same for all vertices)
    gl.uniform1f(program.uniforms.u_Time, context.time);
    gl.uniform1i(program.uniforms.u_Mode, 0);

    gl.uniform4f(program.uniforms.u_Color, 0.9, 0.0, 0.0, 1.0);

    gl.uniformMatrix4fv(program.uniforms.u_VM, true, context.mat4_VM);
    gl.uniformMatrix4fv(program.uniforms.u_P, true, context.mat4_P);
    gl.uniformMatrix4fv(program.uniforms.u_PVM, true, context.mat4_PVM);
    gl.uniformMatrix3fv(program.uniforms.u_N, true, context.mat3_N);

    // light and shadow setting
    const spot0 = scene.lights.spot0;

    gl.activeTexture(gl.TEXTURE0); // active texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, spot0.shadowmap.texture);
    gl.uniform1i(program.uniforms.u_SamplerShadow, 0); // use texture unit 0
    gl.uniform4fv(program.uniforms['u_Lights[0].position'], scene.lights.spot0.vec4_position);

    // bind element buffer and draw elements
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf_gl_elements);
    gl.drawElements(geometry.primitives_type, geometry.elements_count, geometry.elements_type, 0);
}

function renderGeometryShadowProgram(gl, program, geometry) {

    // for i in geometry.buffers_gl.a_Position



    let buf_gl_Position = geometry.buffers_gl.a_Position;
    let buf_gl_Normal = geometry.buffers_gl.a_Normal;
    let buf_gl_elements = geometry.elements_gl;

    gl.useProgram(program.id); // .id contains the WebGL identifier

    // setup attribute pointers (attributes are different for each vertex)
    gl.bindBuffer(gl.ARRAY_BUFFER, buf_gl_Position);
    gl.vertexAttribPointer(program.attributes.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.a_Position);


    gl.bindBuffer(gl.ARRAY_BUFFER, buf_gl_Normal);
    gl.vertexAttribPointer(program.attributes.a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.a_Normal);

    // set uniforms (uniforms are same for all vertices)
    gl.uniform1f(program.uniforms.u_Time, context.time);
    gl.uniform1i(program.uniforms.u_Mode, 0);
    gl.uniformMatrix4fv(program.uniforms.u_VM, true, context.mat4_VM);
    gl.uniformMatrix4fv(program.uniforms.u_P, true, context.mat4_P);
    gl.uniformMatrix4fv(program.uniforms.u_PVM, true, context.mat4_PVM);
    gl.uniformMatrix3fv(program.uniforms.u_N, true, context.mat3_N);

    // light parameters
    //const spot1 = vec4(0,0,0,1);
    const spot0 = scene.lights.spot0;

    //test code
    //Matrix (put this before 4fv if you want to change this line below back)
    gl.uniform4fv(program.uniforms['u_Lights[0].position'], m.vec4_new(0, 2, 5, 1)); //true, spot0.shadowmap.mat4_PVM);
    //const u_colorLocation = gl.getUniformLocation(program.uniforms.u_color, 'u_color');
    gl.uniform4fv(program.uniforms.u_Color, m.vec4_new(1, 1, 0, 0));
    //test code ends


    //gl.uniform4fv(program.uniforms['u_Lights[0].position'], spot0.vec4_position);
    gl.uniform4fv(program.uniforms['u_Lights[0].position_camera'], spot0.vec4_position_camera);

    // shadow mapping
    gl.uniformMatrix4fv(program.uniforms['u_Shadowmaps[0].PVM'], true, spot0.shadowmap.mat4_PVM);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, spot0.shadowmap.texture);

    // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256,
    //     0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.uniform1i(program.uniforms['u_Shadowmaps[0].Sampler'], 0); // use texture unit 0
    //gl.uniform1i(program.uniforms['u_Shadowmaps[0].Sampler'], 0); // use texture unit 0

    // bind element buffer and draw elements
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf_gl_elements);
    gl.drawElements(geometry.primitives_type, geometry.elements_count, geometry.elements_type, 0);
}

function process_node_shadow(node) {
    let geometry = node.geometry;
    let gl = context.gl;
    let program = context.program_shadow;

    if (!geometry.hasElements())
        return;
    // setup attribute pointers (attributes are different for each vertex)
    gl.bindBuffer(gl.ARRAY_BUFFER, geometry.buffers_gl.a_Position);
    gl.vertexAttribPointer(program.attributes.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.a_Position);

    // bind element buffer and draw elements
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.elements_gl);
    gl.drawElements(geometry.primitives_type, geometry.elements_count, geometry.elements_type, 0);


    // if (!node.geometry.hasProgram())
    //     return;
    // //console.log("here");
    // let program = node.geometry.getProgram();
    // if (!program.canRenderGeometry())
    //     return;
    // // here: pick render function based on shader program
    
    // program.renderGeometry(context.gl, node.geometry); //our geometrys are our meshes loaded up from our glsf file? (dyllin is very confident in this assesment)    
}

function render_pass_shadows_geometry(program) {
    let ctx = context;
    let gl = context.gl;

    context.program_shadow = program;

    let stack = [];
    stack.push(m.mat4_new_identity());
    //   traverse transformation hierarchy
    traverse_tree(scene.root, stack, process_node_shadow);

    // loop over geometry
    // for (const [name, geometry] of Object.entries(scene.geometries)) {

    //     // render only indexed-buffer geometry
    //     if (!geometry.hasElements())
    //         continue;

    //     // setup attribute pointers (attributes are different for each vertex)
    //     gl.bindBuffer(gl.ARRAY_BUFFER, geometry.buffers_gl.a_Position);
    //     gl.vertexAttribPointer(program.attributes.a_Position, 3, gl.FLOAT, false, 0, 0);
    //     gl.enableVertexAttribArray(program.attributes.a_Position);

    //     // bind element buffer and draw elements
    //     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.elements_gl);
    //     gl.drawElements(geometry.primitives_type, geometry.elements_count, geometry.elements_type, 0);
    // }
}

function render_pass_shadows() {
    let ctx = context;
    let gl = context.gl;

    // create shadow maps with special 'shadowmap_create' shader program
    let program = scene.programs.shadowmap_create;
    for (const [name, light] of Object.entries(scene.lights)) {

        if (!light.hasShadowmap())
            continue;

        // render from light point to FBO
        gl.bindFramebuffer(gl.FRAMEBUFFER, light.shadowmap.fbo);
        gl.viewport(0, 0, light.shadowmap.width, light.shadowmap.height);

        // clear FBO's color and depth attachements
        gl.clearColor(1.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // set up program to create shadow map
        gl.useProgram(program.id);
        gl.uniformMatrix4fv(program.uniforms.u_VM, true, light.shadowmap.mat4_VM);
        gl.uniformMatrix4fv(program.uniforms.u_PVM, true, light.shadowmap.mat4_PVM);

        // render geometry
        render_pass_shadows_geometry(program);
    }


}

function stack_top(stack) { //peek
    return stack[stack.length - 1]
}

function stack_push(stack, matrix) {
    stack.push(matrix)
}

function stack_push_mul(stack, matrix) {
    let matrix_product = m.mat4_new_identity();
    m.mat4_mul_mat4(matrix_product, stack_top(stack), matrix);
    stack_push(stack, matrix_product);
}

function stack_pop(stack) {
    stack.pop();
}

function traverse_tree(node, stack, process) {
    if (node instanceof TrafoNode) {
        stack_push_mul(stack, node.matrix);
        //console.log("here");

        for (const child of node.children) {
            traverse_tree(child, stack, process);
        }
        stack_pop(stack);

    } else if (node instanceof RenderNode) {
        // console.log("here");
        context.mat4_M.set(stack_top(stack));
        m.mat4_mul_mat4(context.mat4_VM, context.mat4_V, context.mat4_M);
        m.mat4_mul_mat4(context.mat4_PVM, context.mat4_P, context.mat4_VM);
        m.mat4_get_topleft_mat3(context.mat4_VM, context.mat3_N); // we just do euclidian
        process(node);
    }
}

function process_node_final(node) {
    if (!node.geometry.hasProgram())
        return;
    //console.log("here");
    let program = node.geometry.getProgram();
    if (!program.canRenderGeometry())
        return;
    // here: pick render function based on shader program
    
    program.renderGeometry(context.gl, node.geometry); //our geometrys are our meshes loaded up from our glsf file? (dyllin is very confident in this assesment)    
}



function render_pass_final() {
    let ctx = context;
    let canvas = context.canvas;
    let gl = context.gl;
    
    // reset framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.95, 0.95, 0.950, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let stack = [];
    stack.push(m.mat4_new_identity());
    //   traverse transformation hierarchy
    traverse_tree(scene.root, stack, process_node_final);
    //traverse tree here for heirarcical traversal, put the idenity matrix onto the stack

    // for (const [name, geometry] of Object.entries(scene.geometries)) {//traverse the tree here for heirarcical traversal

    //     if (!geometry.hasProgram())
    //         continue;

    //     let program = geometry.getProgram();
    //     if (program.canRenderGeometry()) {
    //         // here: pick render function based on shader program
    //         program.renderGeometry(gl, geometry); //our geometrys are our meshes loaded up from our glsf file? (dyllin is very confident in this assesment)
    //         continue;
    //     }
    // }
}

/* 
 * The render() function issues the draw calls
 * based on the current state of the model.
 */
function render(context) {//if we want picking goes in here
    let ctx = context;
    let gl = context.gl;

    render_pass_shadows(scene);//shadow pass one; records depth from light source. (mess with pass one for color)
    render_pass_final(scene);
}

/* 
 * The step() function is called for each animation
 * step. Note that the time points are not necessarily
 * equidistant.
 */
function step(timestamp) {
    update(context, timestamp); //this i think is where we change everythin  update rotation matricies in here
    render(context);// i dont think we should touch this one, dont quote me on this tho
    window.requestAnimationFrame(step);
}


async function main() {
    await init(context);
    window.requestAnimationFrame(step);
}

// make main function available globally
window.main = main;

