

export class Node {
    children;

    constructor() {
        this.children = [];
    }

    hasChildren() { return this.children.length > 0 ? true : false; }
    addChild(child) { this.children.push(child); }
}

export class TrafoNode extends Node {//traverse n    ode?
    matrix;

    constructor(matrix) {
        super();
        this.matrix = matrix;  //i think this should the matrix of the mesh
    }
}

export class RenderNode extends Node {//store geomerty object
    render_callback;
    matrix;

    constructor() {
        super();
        this.is_selected = false;
        this.id = 0;
    }

    render() {
        this.render_callback(this);
    }
}
