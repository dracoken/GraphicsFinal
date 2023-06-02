import { SHADER_TYPE, Shader, Program, loadShaderProgram } from "gl_shader";
import { Light, LightType, Shadowmap } from "gl_light"
import { Geometry } from "gl_geometry";
import { createGeometryQuad, createGeometryPlane } from "geometries/basic";
import { createGeometryGrid } from "geometries/grid";
import { createGeometryHouse, createGeometryHouseWires } from "geometries/house";
import { createGeometryTower } from "geometries/tower";
import { loadGLTF, createGeometryGLTF } from "gl_gltf";
import * as m from "gl_math";
import {Node, TrafoNode, RenderNode} from "gl_nodes";


class Scene {
    constructor(name) {
        this.name = name;
    }
}


function init_hierarchy(scene) {
    

    let mat0 = new Float32Array([
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0,

    ]);

    let mat1 = new Float32Array([
        1.0, 0.0, 0.0, 16.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0,
    ]);

    let alph2 = Math.PI/4;
    let mat2 = new Float32Array([
     Math.cos(alph2), -(Math.sin(alph2)), 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        Math.sin(alph2), 0.0, Math.cos(alph2), 0.0,
        0.0, 0.0, 0.0, 1.0,
    ]);

    // create render and transformation nodes
    let render0 = new RenderNode();
    let render1 = new RenderNode();
    let render2 = new RenderNode();

    let root = new TrafoNode(m.mat4_new_identity());
    let trafo1 = new TrafoNode(mat1);
    let trafo2 = new TrafoNode(mat2);

    root.addChild(trafo1);
    root.addChild(render0);
    trafo1.addChild(trafo2);
    trafo1.addChild(render1);
    trafo2.addChild(render2);

    render0.geometry =  true;//put geometry here


    // console.log(scene.geometries.mesh0.buffers.a_Position.length);
    // for (let i = 0; i < scene.geometries.mesh0.buffers.a_Position.length; i += 3) {
    //     let mat = new Float32Array(m.vec4_new(scene.geometries.mesh0.buffers.a_Position[i], scene.geometries.mesh0.buffers.a_Position[i + 1], scene.geometries.mesh0.buffers.a_Position[i + 2], 1));

    //     //itterate through tree starting at root noode if node has children itterate through them
    //     let currNode = root;
    //     while (currNode.hasChildren()) {
    //         currNode = currNode.children[0];
    //     }
    //     currNode.addChild(new TrafoNode(mat));

    //     // let node = new TrafoNode(mat);
    //     // root.addChild(node);
    //     // console.log(node.matrix);
    // }

    // console.log(root);

    //let root = new TrafoNode(mat0);
    // let trafo1 = new TrafoNode(mat1);
    // let trafo2 = new TrafoNode(mat2);

    // set unique ids for picking
    // render0.id = 0x7F01CAFE; // can't have leading bit set to 1 because of 32 bit two's complement
    // render1.id = 0x0BADBEEF;
    // render2.id = 3;

    // map ids to nodes
    // context.id2node = {};
    // context.id2node[render0.id] = render0;
    // context.id2node[render1.id] = render1;
    // context.id2node[render2.id] = render2;

    // register handlers
    // render0.onclick = handler_onclick;
    // render1.onclick = handler_onclick;
    // render2.onclick = handler_onclick;

    // set up transformation hierarchy
    // trafo2.addChild(render2);
    // trafo1.addChild(render1);
    // trafo1.addChild(trafo2);
    // root.addChild(trafo1);
    // root.addChild(render0);

    // save transformation matrices in context
    context.mat0 = mat0;
    context.mat1 = mat1;
    context.mat2 = mat2;

    // save root in context
    context.root = root;
}


export default async function createIlluminationScene(gl) { //returns a scene object


    let scene = new Scene('Illumination');

    let program_simple = await loadShaderProgram(
        "assets/shaders/simple.vert.glsl",
        "assets/shaders/simple.frag.glsl",
    );
    let program_phong_flat = await loadShaderProgram(
        "assets/shaders/phong_flat.vert.glsl",
        "assets/shaders/phong_flat.frag.glsl",
    );
    let program_phong_smooth = await loadShaderProgram(
        "assets/shaders/phong_smooth.vert.glsl",
        "assets/shaders/phong_smooth.frag.glsl",
    );
    let program_shadow = await loadShaderProgram(
        "assets/shaders/shadow.vert.glsl",
        "assets/shaders/shadow.frag.glsl",
    );
    let program_texture = await loadShaderProgram(
        "assets/shaders/texture.vert.glsl",
        "assets/shaders/texture.frag.glsl",
    );
    let program_shadowmap_create = await loadShaderProgram(
        "assets/shaders/shadowmap_create.vert.glsl",
        "assets/shaders/shadowmap_create.frag.glsl",
    );


    // shader programs
    scene.programs = {
        simple: program_simple,
        phong_flat: program_phong_flat,
        phong_smooth: program_phong_smooth,
        shadow: program_shadow,
        texture: program_texture,
        shadowmap_create: program_shadowmap_create,
    };

    // create geometries
    let grid = createGeometryGrid(gl);
    let plane = createGeometryPlane(gl);
    let house = createGeometryHouse(gl);
    let house_wires = createGeometryHouseWires(gl);
    let tower = createGeometryTower(gl);
    let quad = createGeometryQuad(gl);

    // load geometries
    //let gltf = await loadGLTF("assets/objects/funkyShape.gltf");
    // let gltf = await loadGLTF("assets/objects/castle.gltf");
    let gltf = await loadGLTF("assets/objects/cube.gltf");
    let mesh0 = await createGeometryGLTF(gl, gltf, 0);
    // let mesh1 = await createGeometryGLTF(gl, gltf, 0);
    

    // set programs
    grid.setProgram(program_simple);
    plane.setProgram(program_shadow);
    house.setProgram(program_shadow);
    house_wires.setProgram(program_phong_flat);
    tower.setProgram(program_shadow);
    mesh0.setProgram(program_shadow);
    // mesh1.setProgram(program_shadow);
    quad.setProgram(program_texture);

    // add objects to scene
    scene.geometries = {
        grid: grid,
        plane: plane,
        // house: house,
        // house_wires: house_wires,
        // tower: tower,
        mesh0: mesh0,
        // mesh1: mesh1,
        //quad: quad,
    };

    // create lights
    let spot0 = new Light(LightType.LIGHT_SPOT);
    let spot1 = new Light(LightType.LIGHT_SPOT);
    // spot0.setShadowmap(new Shadowmap(256, 256));
    spot0.setShadowmap(new Shadowmap(1024, 1024));
    spot1.setShadowmap(new Shadowmap(1024, 1024));
    //
    // add lights to scene
    scene.lights = {
        spot0: spot0,
        spot1: spot1,
    };

    console.log(scene.geometries.mesh0.buffers);
    console.log("[info] scene 'Illumination' constructed");

    //create heirarchy here
    let mat0 = new Float32Array([
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0,

    ]);

    let mat1 = new Float32Array([
        1.0, 0.0, 0.0, 3.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0,
    ]);

    let alph2 = Math.PI/7.0;
    let mat2 = new Float32Array([
        Math.cos(alph2), 0.0,           -(Math.sin(alph2)),              0.0,
        0.0,            1.0,               0.0,                         0.0,
        Math.sin(alph2), 0.0,               Math.cos(alph2),            3.0,
        0.0,              0.0,              0.0,                        1.0,
    ]);

    scene.transforms = {
        t1:mat1,
        t2:mat2,
    };

    // create render and transformation nodes
    let render0 = new RenderNode();
    let render1 = new RenderNode();
    let render2 = new RenderNode();
    let render_plane = new RenderNode();
    render_plane.geometry = scene.geometries.plane;

    let root = new TrafoNode(m.mat4_new_identity());
    let trafo1 = new TrafoNode(mat1);
    let trafo2 = new TrafoNode(mat2);

    root.addChild(render_plane);
    root.addChild(trafo1);
    root.addChild(render0);
    trafo1.addChild(trafo2);
    trafo1.addChild(render1);
    trafo2.addChild(render2);

    render0.geometry =  scene.geometries.mesh0;
    render1.geometry =  scene.geometries.mesh0;
    render2.geometry =  scene.geometries.mesh0;

    scene.root = root; //hierarchy tree attribute


    return scene;
}

