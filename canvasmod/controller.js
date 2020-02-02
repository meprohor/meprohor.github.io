const clickDeltaLength = 16.0;
const defaultWidth = 3.0;
const defaultLineSettings = [8.0, 5.0];
const rotHandleOffset = 64.0;
const scaleMax = 8.0;
const scaleMin = .5;
const flipDeaddzone = .75;
const frameWidth = 1.0;

class vec2 {
    constructor(x, y) {
        this.x = (null == x)?0.0:x;
        this.y = (null == y)?this.x:y;
    }

    copy(example) { this.x = example.x; this.y = example.y; return this; }
    add(other) { this.x += other.x; this.y += other.y; return this; }
    sub(other) { this.x -= other.x; this.y -= other.y; return this; }
    scale(other) { this.x *= other.x; this.y *= other.y; return this; }
    reverseScale(other) { this.x /= other.x; this.y /= other.y; return this; }
    mul(floatb) { this.scale( new vec2(floatb) ); return this; }
    div(floatb) { this.reverseScale( new vec2(floatb) ); return this; }
    rotate(angle) {
        var cosA = Math.cos(- angle);
        var sinA = Math.sin(- angle);
        var tmp = new vec2().copy(this);

        this.y = tmp.y * cosA - tmp.x * sinA;
        this.x = tmp.y * sinA + tmp.x * cosA;
    }
    static distance(a, b) { return ( Math.sqrt( (b.x-a.x)*(b.x-a.x) + (b.y-a.y)*(b.y-a.y) ) ); }
    static length(a) { return this.distance(new vec2(0.0), a); }
    static simpledot(a, b) { return a.x * b.x + a.y * b.y; }
    static mid(a, b) { var tmp = new vec2().copy(a); tmp.add(b); tmp.mul(0.5); return tmp; }
}

class Transform {
    constructor(position, rotation, scale, pivot) {
        this.position = (null != position)?position:new vec2();
        this.rotation = (null != rotation)?rotation:0.0;
        this.scale = (null != scale)?scale:new vec2(1.0);
        this.pivot = (null != pivot)?pivot:new vec2();
    }

    get deg() { return this.rotation * (Math.PI / 180.0); }

    copy(example) {
        this.position.copy(example.position);
        this.rotation = example.rotation;
        this.scale.copy(example.scale);
        this.pivot.copy(example.pivot);
    }
}

class Drawer {
    constructor(image, innerPos, innerSize) {
        this.image = (null != image)?image:null; // set explicitly
        this.innerPos = (null != innerPos)?innerPos:new vec2();
        this.innerSize = innerSize;

        if(null == Drawer.tmpVec2) { Drawer.tmpVec2 = new vec2(); }
    }

    draw(obj) {
        context.save();

        context.translate(obj.transform.position.x, obj.transform.position.y);
        context.rotate(obj.transform.deg);
        context.scale(obj.transform.scale.x, obj.transform.scale.y);

        Drawer.tmpVec2.copy(obj.transform.pivot);
        Drawer.tmpVec2.mul(-1.0);

        context.translate(Drawer.tmpVec2.x, Drawer.tmpVec2.y);

        Drawer.tmpVec2.copy(this.innerSize);

        context.drawImage(this.image,
            this.innerPos.x, this.innerPos.y,
            this.innerSize.x, this.innerSize.y,
            0.0, 0.0,
            this.innerSize.x, this.innerSize.y);
        
        context.restore();
    }
}

class Collider {
    constructor() {
        this.rectPoints = [null, null, null, null];
        this.fract_pivot = new vec2();
        if(null == Collider.tmpVec2) Collider.tmpVec2 = new vec2();
    }

    calcBBrect(obj) {
        if(null == obj) { console.log("obj cannot be null"); }

        this.fract_pivot.copy(obj.drawer.innerSize);
        this.fract_pivot.sub(obj.transform.pivot);
        
        for(var i = 0; i < 4; i += 1) { this.rectPoints[i] = new vec2(); }

        Collider.tmpVec2.copy(obj.transform.pivot);
        this.rectPoints[0].sub(Collider.tmpVec2);

        Collider.tmpVec2.x = this.fract_pivot.x;
        Collider.tmpVec2.y *= -1.0;
        this.rectPoints[1].add(Collider.tmpVec2);

        Collider.tmpVec2.y = this.fract_pivot.y;
        this.rectPoints[2].add(Collider.tmpVec2);

        Collider.tmpVec2.x = obj.transform.pivot.x * -1.0;
        this.rectPoints[3].add(Collider.tmpVec2);

        this.rectPoints.forEach(point => {
            point.scale(obj.transform.scale);
            point.rotate(obj.transform.deg);
            point.add(obj.transform.position);
        });
    }
    
    drawBBrect(width, settings) {
        width = (null != width)?width:defaultWidth;
        settings = (null != settings)?settings:defaultLineSettings;

        context.save();
        context.beginPath();

        context.moveTo(this.rectPoints[3].x, this.rectPoints[3].y);
        
        this.rectPoints.forEach(point => { context.lineTo(point.x, point. y); });

        context.lineWidth = width;
        context.setLineDash(settings);

        context.stroke();

        context.closePath();
        context.restore();
    }
    
    BBtest(collisionPoint) {
        // check if point is within rect
        var ni1;
        var ni2;
        var result = true;

        for(var i = 0; (result && i < 4); i += 1) {
            ni1 = i + 1; if(ni1 > 3) ni1 -= 4;
            ni2 = ni1 + 1; if(ni2 > 3) ni2 -= 4;

            result = (( ( (this.rectPoints[i].y - this.rectPoints[ni1].y) * (this.rectPoints[ni2].x - this.rectPoints[i].x) +
                (this.rectPoints[ni1].x - this.rectPoints[i].x) * (this.rectPoints[ni2].y - this.rectPoints[i].y) ) *
                ( (this.rectPoints[i].y - this.rectPoints[ni1].y) * (collisionPoint.x - this.rectPoints[i].x) +
                (this.rectPoints[ni1].x - this.rectPoints[i].x) * (collisionPoint.y - this.rectPoints[i].y) ) ) >= 0.0);
        }

        return result;
    }
}

class LayerImage {
    constructor(imageSrc, imageSize, transform) {
        var image = new Image();
        image.src = imageSrc;
        
        this.drawer = new Drawer(image, null, imageSize);
        this.transform = (null != transform)?transform:new Transform();
        this.collider = new Collider();
    }

    draw() { this.drawer.draw(this); }
}

class AtlasElement {
    constructor(positionInAtlas, elementSize, transform) {
        this.drawer = new Drawer(null, positionInAtlas, elementSize);
        this.transform = (null != transform)?transform:new Transform();

        this.collider = new Collider();
    }
    
    draw() { this.drawer.draw(this); }
}

class Atlas {
    constructor(imageSrc, atlasElements) {
        this.image = new Image();
        this.image.src = imageSrc;
        this.atlasElements = atlasElements;

        this.atlasElements.forEach(element => { element.drawer.image = this.image; });
    }

    add(newElement) {
        this.atlasElements.push(newElement);
        newElement.drawer.image = this.image;
    }

    remove(element) {
        if(!this.atlasElements.includes(element)) { return; }

        var index = this.atlasElements.indexOf(element);
        this.atlasElements.splice(index);
    }
}

class InputState {
    constructor() {
        this.down = false;
        
        this.pos = new vec2();
        this.prevPos = new vec2();
        this.clickPos = new vec2();
        this.delta = new vec2();
    }

    copy(other) {
        this.down = other.down;
        
        this.pos.copy(other.pos);
        this.prevPos.copy(other.prevPos);
        this.clickPos.copy(other.clickPos);
        this.delta.copy(other.delta);

        return this;
    }
}

class Input {
    constructor(canvasController) {
        this.s = new InputState();
        
        this.schedule = [];
        this.touchMode = null;

        this.typeMove = null;
        this.typeDown = null;
        this.typeUp = null;

        var tmpRect = canvas.getBoundingClientRect();
        this.brect = new vec2(tmpRect.left, tmpRect.top);
    }

    addEntry(event) { this.schedule.push( [event, new InputState().copy(this.s)] ); }

    getPosition(event) {
        if(null == this.touchMode) {
            this.touchMode = event.type.startsWith('touch');
            
            this.typeMove = this.touchMode?'touchmove':'mousemove';
            this.typeDown = this.touchMode?'touchstart':'mousedown';
            this.typeUp = this.touchMode?'touchend':'mouseup';

            console.log("input type: touch");
        }

        this.s.pos.x = (this.touchMode?event.touches[0]:event).clientX;
        this.s.pos.y = (this.touchMode?event.touches[0]:event).clientY;
    }

    updatePosition(event) {
        this.s.prevPos.copy(this.s.pos);
        this.getPosition(event);
        this.s.pos.sub(this.brect);

        this.s.delta.copy(this.s.pos);
        this.s.delta.sub(this.s.prevPos);
        
        if(this.s.down) { this.addEntry(event); }
    }

    onMouseDown(event) {
        this.updatePosition(event);
        this.s.clickPos.copy(this.s.pos);
        this.s.down = true;
        this.addEntry(event);
    }

    onMouseUp(event) {
        this.s.down = false;
        this.updatePosition(event);
        this.addEntry(event);
    }

    process() {
        this.schedule.forEach(entry => {
            switch (entry[0].type) {
                case this.typeMove:
                    this._processMouseMove( entry[1] );
                    break;
                case this.typeDown:
                    this._processMouseDown( entry[1] );
                    break;
                case this.typeUp:
                    this._processMouseUp( entry[1] );
                    break;
                default:
                    break;
            }
        });
        this.schedule.length = 0;
    }

    /* ▲ scheduled events ▲ */
    _processMouseMove(state) { if(handle.active) handle.apply(state); }

    _processMouseDown(state) {
        /* ▲ hittest handles ▲ */
        if(null == selectedObject) { return; }

        var candidates = [];

        handle.handles.forEach(layer => {
            layer.collider.calcBBrect(layer);
            if( layer.collider.BBtest(state.pos) ) { candidates.push(layer); }
        });

        if(0 == candidates.length) {
            console.log("input: no handle was hit");
            return;
        }
        /*
        switch (candidates[ candidates.length - 1 ]) {
            case handle.posHandle:
                handle.mode = 0;
                break;
            case handle.rotHandle:
                handle.mode = 1;
                break;
            default:
                handle.mode = 2;
                break;
        }
        */
        handle.active = true;
        handle.actingHandle = candidates[ candidates.length - 1 ];
    }

    _processMouseUp(state) {
        if(handle.active) { handle.active = false; handle.flipFlag = false; }
        else if( clickDeltaLength > vec2.distance(state.clickPos, state.pos) ) {
            /* ▲ hittest layers ▲ */
            var candidates = [];

            layers.forEach(layer => {
                layer.collider.calcBBrect(layer);
                if( layer.collider.BBtest(state.pos) ) { candidates.push(layer); }
            });

            if(0 == candidates.length) {
                console.log("input: no object was selected");
                selectedObject = null;
                return;
            }
            else {
                console.log("input: layer was selected");
                selectedObject = candidates[ candidates.length - 1 ];
            }
        }
    }
}

class Handle {
    constructor() {
        this.active = false;
        // this.mode = 0;

        var h_atlasElements = [new AtlasElement(new vec2(128.0), new vec2(128.), null), // position
            new AtlasElement(new vec2(0.0, 128.0), new vec2(128.), new Transform(null, null, new vec2(.25), new vec2(64.) ) ), // rotation
            new AtlasElement(new vec2(0.0, 128.0), new vec2(128.), new Transform(null, null, new vec2(.25), new vec2(64.) ) ), // scale 0:0
            new AtlasElement(new vec2(0.0, 128.0), new vec2(128.), new Transform(null, null, new vec2(.25), new vec2(64.) ) ), // scale 1:1
            new AtlasElement(new vec2(0.0, 128.0), new vec2(128.), new Transform(null, null, new vec2(.25), new vec2(64.) ) ), // scale .5:0
            new AtlasElement(new vec2(0.0, 128.0), new vec2(128.), new Transform(null, null, new vec2(.25), new vec2(64.) ) ), // scale .5:1
            new AtlasElement(new vec2(0.0, 128.0), new vec2(128.), new Transform(null, null, new vec2(.25), new vec2(64.) ) ), // scale 1:0
            new AtlasElement(new vec2(0.0, 128.0), new vec2(128.), new Transform(null, null, new vec2(.25), new vec2(64.) ) ), // scale 0:1
            new AtlasElement(new vec2(0.0, 128.0), new vec2(128.), new Transform(null, null, new vec2(.25), new vec2(64.) ) ), // scale 1:.5
            new AtlasElement(new vec2(0.0, 128.0), new vec2(128.), new Transform(null, null, new vec2(.25), new vec2(64.) ) ), // scale 0:.5
            new AtlasElement(new vec2(0.0, 128.0), new vec2(128.), new Transform(new vec2(-512.), null, new vec2(.25), new vec2(64.) ) ),]; // pivot
        let h_atlas = new Atlas("handles.png", h_atlasElements);

        this.handles = h_atlasElements;
        this.posHandle = this.handles[0];
        this.rotHandle = this.handles[1];
        this.scaleHandles = [ this.handles[2], this.handles[3],
            this.handles[4],this.handles[5],
            this.handles[6],this.handles[7],
            this.handles[8],this.handles[9] ];
        this.actingHandle = null;

        this.pivHandle = this.handles[10];

        if(null == Handle.tmpVec2) { Handle.tmpVec2 = new vec2(); }
        this.flipFlag = false;
    }

    draw(hidden, rotated, debug) {
        if(null == selectedObject) { return; }

        hidden = (null != hidden)?hidden:false;
        rotated = (null != rotated)?rotated:false;
        debug = (null != debug)?debug:false;

        this.posHandle.transform.copy(selectedObject.transform);
        
        this.posHandle.transform.pivot.reverseScale(selectedObject.drawer.innerSize);
        this.posHandle.transform.pivot.scale(this.posHandle.drawer.innerSize);
        
        this.posHandle.transform.scale.scale(selectedObject.drawer.innerSize);
        this.posHandle.transform.scale.reverseScale(this.posHandle.drawer.innerSize);

        this.posHandle.collider.calcBBrect(this.posHandle);
        this.posHandle.collider.drawBBrect(frameWidth); // Frame
        if(!hidden) { this.posHandle.draw(); }
        
        this.rotHandle.transform.position = new vec2();
        this.rotHandle.transform.position.y -= (selectedObject.transform.scale.y > 0.0)?selectedObject.transform.pivot.y * selectedObject.transform.scale.y:selectedObject.collider.fract_pivot.y * Math.abs(selectedObject.transform.scale.y);
        Handle.tmpVec2.copy(this.rotHandle.transform.position);
        this.rotHandle.transform.position.y -= rotHandleOffset;
        this.rotHandle.transform.position.rotate(selectedObject.transform.deg);
        this.rotHandle.transform.position.add(selectedObject.transform.position);
        if(rotated) { this.rotHandle.transform.rotation = selectedObject.transform.rotation; }

        this.rotHandle.collider.calcBBrect(this.rotHandle);
        if(debug) { this.rotHandle.collider.drawBBrect(1); }
        /* ▼ Frame Addition ▼ */
        Handle.tmpVec2.rotate(selectedObject.transform.deg);
        Handle.tmpVec2.add(selectedObject.transform.position);

        context.save();
        context.beginPath();

        context.moveTo(Handle.tmpVec2.x, Handle.tmpVec2.y);
        context.lineTo(this.rotHandle.transform.position.x, this.rotHandle.transform.position.y);

        context.lineWidth = frameWidth;
        context.setLineDash(defaultLineSettings);

        context.stroke();

        context.closePath();
        context.restore();
        /* ▲ Frame Addition ▲ */
        if(!hidden) { this.rotHandle.draw(); }

        this.scaleHandles[0].transform.position = selectedObject.collider.rectPoints[0];
        this.scaleHandles[1].transform.position = selectedObject.collider.rectPoints[2];

        this.scaleHandles[2].transform.position = vec2.mid( selectedObject.collider.rectPoints[0], selectedObject.collider.rectPoints[1] );
        this.scaleHandles[3].transform.position = vec2.mid( selectedObject.collider.rectPoints[2], selectedObject.collider.rectPoints[3] );

        this.scaleHandles[4].transform.position = selectedObject.collider.rectPoints[1];
        this.scaleHandles[5].transform.position = selectedObject.collider.rectPoints[3];

        this.scaleHandles[6].transform.position = vec2.mid( selectedObject.collider.rectPoints[1], selectedObject.collider.rectPoints[2] );
        this.scaleHandles[7].transform.position = vec2.mid( selectedObject.collider.rectPoints[3], selectedObject.collider.rectPoints[0] );

        this.scaleHandles.forEach(instance => {
            if(rotated) { instance.transform.rotation = selectedObject.transform.rotation; }
            
            instance.collider.calcBBrect(instance);
            if(debug) { instance.collider.drawBBrect(1); }
            if(!hidden) { instance.draw(); }
        });
        /*
        this.pivHandle.transform.position = selectedObject.transform.position;
        if(rotated) { this.pivHandle.transform.rotation = selectedObject.transform.rotation; }
        this.pivHandle.collider.calcBBrect(this.pivHandle);
        this.pivHandle.collider.drawBBrect(frameWidth);
        */
    }

    apply(inputState) {
        switch (this.actingHandle) {
            case this.posHandle:
                selectedObject.transform.position.add(inputState.delta);
                break;
            case this.rotHandle:
                var smd = Math.atan2(inputState.pos.y - selectedObject.transform.position.y,
                    inputState.pos.x - selectedObject.transform.position.x);
                selectedObject.transform.rotation = smd * 180.0 / Math.PI + 90.0;
                break;
            /*
            case this.pivHandle:
                selectedObject.transform.pivot.add(inputState.delta);
                selectedObject.transform.position.add(inputState.delta);
                break;
            */
            default:
                this.handleIndex = this.scaleHandles.indexOf(this.actingHandle)
                this.pairHandle = this.scaleHandles[ (0.0 == this.handleIndex % 2.0)?this.handleIndex+1:this.handleIndex-1 ];
                
                this.handleIndex = Math.floor(this.handleIndex/2);
                this.uniform = ( 0 == this.handleIndex % 2.0 );
                if(!this.uniform) { this.XY = ( this.handleIndex < 2 ); } // true = Y || false = X
                
                Handle.tmpVec2 = new vec2();
                Handle.tmpVec2.copy(this.actingHandle.transform.position);

                this.reference = vec2.distance(Handle.tmpVec2, this.pairHandle.transform.position);
                Handle.tmpVec2.add(inputState.delta);
                this.newSize = vec2.distance(Handle.tmpVec2, this.pairHandle.transform.position);
                this.newSize /= this.reference;
                this.newSize *= this.newSize;

                if(this.uniform) {
                    selectedObject.transform.scale.x *= this.newSize;
                    selectedObject.transform.scale.y *= this.newSize;
                }
                else {
                    if(!this.XY) { selectedObject.transform.scale.x *= this.newSize; }
                    else { selectedObject.transform.scale.y *= this.newSize; }
                }
                
                if(!this.flipFlag) {
                    if(Math.abs(selectedObject.transform.scale.x) < scaleMin) {
                        selectedObject.transform.scale.x *= -1.0;
                        this.flipFlag = true;
                    }
                }
                else {
                    if( flipDeaddzone * selectedObject.drawer.innerSize.x < vec2.distance(this.actingHandle.transform.position, this.pairHandle.transform.position) ) {
                        this.flipFlag = false;
                    }
                }

                selectedObject.transform.scale.x = Math.min(selectedObject.transform.scale.x, scaleMax);
                selectedObject.transform.scale.x = Math.max(selectedObject.transform.scale.x, - scaleMax);

                if(scaleMin > Math.abs(selectedObject.transform.scale.x)) {
                    selectedObject.transform.scale.x = scaleMin * Math.sign(selectedObject.transform.scale.x);
                }

                selectedObject.transform.scale.y = Math.min(selectedObject.transform.scale.y, scaleMax);
                selectedObject.transform.scale.y = Math.max(selectedObject.transform.scale.y, scaleMin);
                break;
        }
    }
}

let canvas = document.getElementById('canvas');
let context = canvas.getContext('2d');
let layers = [];
let input = new Input(this);
let handle = new Handle();
let selectedObject = null;

function draw(drawBB) {
    console.log("draw");
    drawBB = (null != drawBB)?drawBB:false;

    context.clearRect(0.0, 0.0, canvas.width, canvas.height);

    context.fillStyle = "pink";
    context.fillRect(0.0, 0.0, canvas.width, canvas.height);
    
    layers.forEach(layer => { layer.draw(); });
    
    if(null != selectedObject) {
        selectedObject.collider.calcBBrect(selectedObject);
        if(drawBB) selectedObject.collider.drawBBrect();

        handle.draw(false, true);
    }
}

function cycle() {
    draw(false);
    input.process();
}

console.log("draw");

// default mouse support
canvas.addEventListener('mousemove', function(e) { input.updatePosition(e); } );
canvas.addEventListener('mousedown', function(e) { input.onMouseDown(e); } );
canvas.addEventListener('mouseup', function(e) { input.onMouseUp(e); } );
// optional touch support
canvas.addEventListener('touchmove', function(e) { input.updatePosition(e); } );
canvas.addEventListener('touchstart', function(e) { input.onMouseDown(e); } );
canvas.addEventListener('touchend', function(e) { input.onMouseUp(e); } );

var image = new LayerImage("test-img.png", new vec2(128.0), new Transform( new vec2(128.0), 45.0, new vec2(4., 2.), new vec2(64.0) ));
layers.push(image);
selectedObject = image;

setInterval( function() { cycle(); }, 33);
