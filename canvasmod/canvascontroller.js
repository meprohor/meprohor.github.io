// max distance between mouse down and up events to classify as tap
var clickDeltaLength = 16.0;
var handleHitbox = 32.0;
var rotationHandleTweak = 0.5;
var sizeHandleTweak = 0.015625;

class Vector2 {
    constructor(x, y) {
        this.x = (null != x)?x:1.0;
        this.y = (null != y)?y:this.x;
    }

    static distance(a, b) { return ( Math.sqrt( (b.x-a.x)*(b.x-a.x) + (b.y-a.y)*(b.y-a.y) ) ); }
    static length(a) { return ( Math.sqrt( a.x*a.x + a.y*a.y ) ); }
    
    rotate(a) {
        var cosA = Math.cos(- a);
        var sinA = Math.sin(- a);
        var tmp = new Vector2(this.x, this.y);

        this.y = tmp.y * cosA - tmp.x * sinA;
        this.x = tmp.y * sinA + tmp.x * cosA;
    }
}

class Transform {
    constructor(position, rotation, scale, pivot) {
        this.position = (null != position)?position:new Vector2(0.0, 0.0);
        this.rotation = (null != rotation)?rotation:0.0;
        this.scale = (null != scale)?scale:new Vector2(1.0, 1.0);
        this.pivot = (null != pivot)?pivot:new Vector2(0.5, 0.5);
    }
}

class Drawer {
    constructor(image, innerPos, innerSize) {
        this.image = (null != image)?image:null; // explicitly set pointer to null if needed
        this.innerPos = (null != innerPos)?innerPos:new Vector2(0.0, 0.0);
        
        this.innerSize = (null != innerSize)?innerSize:new Vector2(1.0, 1.0);
        
        this.truePivot = new Vector2(null, null); // actual, non-normalized pivot
        this.fractPivot = new Vector2(null, null); // fracture of true pivot for assymetrical cases

        this.deg = 0.0; // rotation in degrees

        this.collider = new Collider();
    }

    draw(transform) {
        this.truePivot.x = this.innerSize.x * transform.pivot.x;
        this.truePivot.y = this.innerSize.y * transform.pivot.y;
        
        context.save(); // matrix.push()
        
        context.translate(this.truePivot.x - this.innerSize.x * .5,
            this.truePivot.y - this.innerSize.y * .5);
        context.translate(transform.position.x, transform.position.y);
        
        this.deg = transform.rotation * (Math.PI / 180.0);
        context.rotate(this.deg);
        context.translate(- this.truePivot.x * transform.scale.x,
            - this.truePivot.y * transform.scale.y);
        
        context.drawImage(this.image,
            this.innerPos.x, this.innerPos.y,
            this.innerSize.x, this.innerSize.y,
            0, 0, // since { position + pivot } are applied at context
            this.innerSize.x * transform.scale.x, this.innerSize.y * transform.scale.y);
        
        context.restore(); // matrix.pop()
    }
}

class Collider {
    constructor() {
        this.cosA = 0.0;
        this.sinA = 0.0;

        this.rectPoints = [new Vector2(), new Vector2(), new Vector2(), new Vector2()];
    }
    
    calcAABBrect(drawer, transform, debug) {
        // !!! object should be drawn => truePivot and deg should be calculated by now !!!

        drawer.fractPivot.x = drawer.innerSize.x * (1.0 - transform.pivot.x);
        drawer.fractPivot.y = drawer.innerSize.y * (1.0 - transform.pivot.y);

        this.rectPoints[0].x = - drawer.truePivot.x; this.rectPoints[0].y = - drawer.truePivot.y;
        this.rectPoints[1].x = drawer.fractPivot.x; this.rectPoints[1].y = - drawer.truePivot.y;
        this.rectPoints[2].x = drawer.fractPivot.x; this.rectPoints[2].y = drawer.fractPivot.y;
        this.rectPoints[3].x = - drawer.truePivot.x; this.rectPoints[3].y = drawer.fractPivot.y;

        for(var i = 0; i < 4; i += 1) {
            this.rectPoints[i].rotate(drawer.deg);
            
            this.rectPoints[i].x *= transform.scale.x;
            this.rectPoints[i].x += transform.position.x;
            this.rectPoints[i].y *= transform.scale.y;
            this.rectPoints[i].y += transform.position.y;
            
            if(debug && i>1) this.drawAABBrect(1.);
            // alert('');
        }
    }
    
    // to draw you need to calc first
    drawAABBrect(width) {
        context.beginPath();

        context.moveTo(this.rectPoints[3].x, this.rectPoints[3].y);
        
        for(var i = 0; i < 4; i += 1) {
            context.lineTo(this.rectPoints[i].x, this.rectPoints[i].y);
        }

        context.save();
        context.lineWidth = (null != width)?width:3.0;
        context.setLineDash([8.0, 5.0]);

        context.stroke();

        context.closePath();
        context.restore();
    }

    tptest(collisionPoint) {
        // transform point to object transformation
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

class SolImage {
    constructor(imageSrc, imageSize, transform) {
        this.image = new Image();
        this.image.src = imageSrc;
        this.drawer = new Drawer(this.image, null, imageSize);
        this.transform = (null != transform)?transform:new Transform();
    }

    draw() { this.drawer.draw(this.transform); }
}

class AtlasElement {
    constructor(atlasPosition, elementSize, transform) {
        this.drawer = new Drawer(null, atlasPosition, elementSize);
        this.transform = (null != transform)?transform:new Transform();
    }
    
    draw() { this.drawer.draw(this.transform); }
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
}

/* ##### JUNKTION STARTS HERE ##### */

class MouseInfo {
    constructor() {
        this.down = false;

        this.pos = new Vector2(0.0, 0.0);
        this.prevPos = new Vector2(0.0, 0.0);
        this.clickPos = new Vector2(0.0, 0.0);
        this.delta = new Vector2(0.0, 0.0);
    }

    getPosition(event) {
        this.prevPos.x = this.pos.x;
        this.prevPos.y = this.pos.y;

        var rect = canvas.getBoundingClientRect();
        this.pos.x = event.clientX - rect.left;
        this.pos.y = event.clientY - rect.top;

        this.delta.x = this.pos.x - this.prevPos.x;
        this.delta.y = this.pos.y - this.prevPos.y;
    }

    updatePosition (event) {
        this.getPosition(event);
        if(this.down && handle.active) { handle.apply(handle.mode); }
    }

    onMouseDown(event) {
        this.updatePosition(event);
        this.clickPos.x = this.pos.x;
        this.clickPos.y = this.pos.y;
        this.down = true;

        // hitttest handle
        if(null != selectedObject) {
            var candidates = null;

            handle.h_atlas.atlasElements.forEach(layer => {
                layer.drawer.collider.calcAABBrect(layer.drawer, layer.transform);
                
                if( layer.drawer.collider.tptest(this.pos) ) {
                    if(null == candidates)
                        candidates = [layer];
                    else
                        candidates.push(layer);
                }
            });

            if(null != candidates) {
                var mode;

                switch (candidates[ candidates.length - 1 ]) {
                    case handle.posHandle:
                        mode = 0;
                        break;
                    case handle.rotHandle:
                        mode = 1;
                        break;
                    default:
                        mode = 2;
                        handle.scalememory.x = selectedObject.transform.scale.x;
                        handle.scalememory.y = selectedObject.transform.scale.y;
                        break;
                }
                handle.mode = mode;
                handle.active = true;
            }
        }
    }

    onMouseUp(event) {
        this.down = false;
        this.updatePosition(event);

        if(handle.active) {
            handle.active = false;
        }
        else if( clickDeltaLength > Vector2.distance(this.clickPos, this.pos) ) {
            //hittest layers
            var candidates = null;

            layers.forEach(layer => {
                layer.drawer.collider.calcAABBrect(layer.drawer, layer.transform);
                
                if( layer.drawer.collider.tptest(this.pos) ) {
                    if(null == candidates)
                        candidates = [layer];
                    else
                        candidates.push(layer);
                }
            });

            if(null == candidates) {
                selectedObject = null;
                return;
            }
            else
                selectedObject = candidates[ candidates.length - 1 ];
        }
    }
}

function Init () {
    /* set fill policy */
    canvas.style.width = '100%';
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.width / 16 * 9;
}

class Handle{
    constructor() {
        this.active = false;
        this.mode = 0;

        var h_atlasElements = [new AtlasElement( new Vector2(128.0), new Vector2(128.0), null), // position
            new AtlasElement( new Vector2(0.0, 128.0), new Vector2(128.0), null), // rotation
            new AtlasElement( new Vector2(0.0, 128.0), new Vector2(128.0), null), // scale
            new AtlasElement( new Vector2(0.0, 128.0), new Vector2(128.0), null), // scale
            new AtlasElement( new Vector2(0.0, 128.0), new Vector2(128.0), null), // scale
            new AtlasElement( new Vector2(0.0, 128.0), new Vector2(128.0), null)]; // scale
        this.h_atlas = new Atlas("handles.png", h_atlasElements);

        this.posHandle = this.h_atlas.atlasElements[0];
        this.rotHandle = this.h_atlas.atlasElements[1];
        this.scaleHandles = [ this.h_atlas.atlasElements[2], this.h_atlas.atlasElements[3],
            this.h_atlas.atlasElements[4], this.h_atlas.atlasElements[5] ];
        
        this.scalememory = new Vector2();
    }

    draw() {
        if(null != selectedObject) {
            if(true) { // configure and draw handle.posHandle 
                
                this.posHandle.transform.position.x = selectedObject.transform.position.x;
                this.posHandle.transform.position.y = selectedObject.transform.position.y;
                this.posHandle.transform.rotation = selectedObject.transform.rotation;
                this.posHandle.transform.scale.x = (selectedObject.drawer.innerSize.x * selectedObject.transform.scale.x) / this.posHandle.drawer.innerSize.x;
                this.posHandle.transform.scale.y = (selectedObject.drawer.innerSize.y * selectedObject.transform.scale.y) / this.posHandle.drawer.innerSize.y;
                this.posHandle.transform.pivot.x = selectedObject.transform.pivot.x;
                this.posHandle.transform.pivot.y = selectedObject.transform.pivot.y;
                

                this.posHandle.draw();
                this.posHandle.drawer.collider.rectPoints = selectedObject.drawer.collider.rectPoints; // shitty]
            }

            if(true) { // configure and draw handle.rotHandle 
                this.rotHandle.transform.position.x = selectedObject.drawer.collider.rectPoints[0].x +
                    .5 * (selectedObject.drawer.collider.rectPoints[1].x - selectedObject.drawer.collider.rectPoints[0].x)
                this.rotHandle.transform.position.y = selectedObject.drawer.collider.rectPoints[0].y +
                    .5 * (selectedObject.drawer.collider.rectPoints[1].y - selectedObject.drawer.collider.rectPoints[0].y)
                
                this.rotHandle.draw();
            }

            if(true) { // configure and draw each of handle.scaleHandles 
                var i = 0;

                this.scaleHandles.forEach(element => {
                    element.transform.position.x = selectedObject.drawer.collider.rectPoints[i].x;
                    element.transform.position.y = selectedObject.drawer.collider.rectPoints[i ++].y;

                    element.draw();
                });
            }
        }
    }

    apply(mode) {
        switch (mode) {
            case 0: // position
                selectedObject.transform.position.x += mouseInfo.delta.x;
                selectedObject.transform.position.y += mouseInfo.delta.y;
                break;
            case 1: // rotation
                var smd = Math.atan2(mouseInfo.pos.y - selectedObject.transform.position.y, mouseInfo.pos.x - selectedObject.transform.position.x);
                selectedObject.transform.rotation = smd * 180.0 / Math.PI + 90.0;

                break;
            case 2: // scale
                var reference = Vector2.distance(selectedObject.transform.position, mouseInfo.clickPos);

                selectedObject.transform.scale.x = this.scalememory.x * Vector2.distance(selectedObject.transform.position, mouseInfo.pos) / reference;
                
                selectedObject.transform.scale.x = Math.min(selectedObject.transform.scale.x, 8.0);
                selectedObject.transform.scale.x = Math.max(selectedObject.transform.scale.x, 0.1);
                
                selectedObject.transform.scale.y = selectedObject.transform.scale.x;
                break;
            case 3: // pivot
                break;
            default:
                break;
        }
    }
}

/* Necessary initializations | maybe move to Main class */
var canvas = document.getElementById("canvas")
var context = canvas.getContext("2d");

let mouseInfo = new MouseInfo();
canvas.addEventListener('mousemove', function(e) { mouseInfo.updatePosition(e); } );
canvas.addEventListener('mousedown', function(e) { mouseInfo.onMouseDown(e); } );
canvas.addEventListener('mouseup', function(e) { mouseInfo.onMouseUp(e); } );

/* initialize resources */

var atlasElements = [ new AtlasElement ( new Vector2(0, 0), new Vector2(64, 64),
        new Transform( new Vector2(856.0, 465.0), -19.0, new Vector2(6.28) ) ), // first sprite
    new AtlasElement ( new Vector2(64.0, 128.0), new Vector2(192.0, 64.0),
        new Transform( new Vector2(646.0, 185.0), 20.0, new Vector2(3.14) ) ),  // unity logo
    new AtlasElement ( new Vector2(64, 0), new Vector2(64, 64),
        new Transform( new Vector2(523.0, 749.0), 3.5, new Vector2(3.625) ) ) ]; // second sprite

var atlas = new Atlas("test-sprite-atlas.png", atlasElements);

var newAtlasElement = new AtlasElement ( new Vector2(0, 0), new Vector2(64, 64),
    new Transform( new Vector2(683.0, 442.0), 17.5, new Vector2(7.5) ) );

atlas.add(newAtlasElement);

let selectedObject = null;
let handle = new Handle();

var layers = [];
atlas.atlasElements.forEach(element => { layers.push(element); } );

var atlasElements = [ new AtlasElement( new Vector2(0.0), new Vector2(128.0),
        new Transform( new Vector2(1002.0, 244.0), 14.299, new Vector2(2.4) ) ),
    new AtlasElement( new Vector2(128.0, 0.0), new Vector2(128.0),
        new Transform( new Vector2(1106.0, 567.0), -149.5, new Vector2(1.796) ) ),
    new AtlasElement( new Vector2(0.0, 128.0), new Vector2(128.0),
        new Transform( new Vector2(310.0, 524), 0.0, new Vector2(2.03) ) )];
var atlas = new Atlas("handles.png", atlasElements);

atlas.atlasElements.forEach(element => { layers.push(element); } );

function draw() {

	context.clearRect(0, 0, canvas.width, canvas.height);
    
    layers.forEach(element => { element.draw(); });
    
    if(null != selectedObject) {
        selectedObject.drawer.collider.calcAABBrect(selectedObject.drawer, selectedObject.transform); // <- necessary
        selectedObject.drawer.collider.drawAABBrect();
    }
    
    handle.draw();
}

onload = Init ();
setInterval(draw, 33);
