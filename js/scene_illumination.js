import { SHADER_TYPE, Shader, Program, loadShaderProgram } from "gl_shader";
import { Light, LightType, Shadowmap } from "gl_light"
import { Geometry } from "gl_geometry";
import { createGeometryQuad, createGeometryPlane } from "geometries/basic";
import { createGeometryGrid } from "geometries/grid";
import { createGeometryHouse, createGeometryHouseWires } from "geometries/house";
import { createGeometryTower } from "geometries/tower";
import { loadGLTF, createGeometryGLTF } from "gl_gltf";


class Scene {
    constructor(name) {
        this.name = name;
    }
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
    let gltf = await loadGLTF("assets/objects/funkyShape.gltf");
    // let gltf = await loadGLTF("assets/objects/castle.gltf");
    //let gltf = await loadGLTF("assets/objects/cube.gltf");
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
        plnae: plane,
        // house: house,
        // house_wires: house_wires,
        // tower: tower,
        mesh0: mesh0,
        // mesh1: mesh1,
        quad: quad,
    };

    // create lights
    let spot0 = new Light(LightType.LIGHT_SPOT);
    //let spot1 = new Light(LightType.LIGHT_SPOT);
    // spot0.setShadowmap(new Shadowmap(256, 256));
    spot0.setShadowmap(new Shadowmap(1024, 1024));
    //spot1.setShadowmap(new Shadowmap(256, 256));
    //
    // add lights to scene
    scene.lights = {
        spot0: spot0,
        //spot1: spot1,
    };

    console.log("[info] scene 'Illumination' constructed");



    return scene;
}

