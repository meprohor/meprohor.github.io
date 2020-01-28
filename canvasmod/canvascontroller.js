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
        context.rotate( - this.deg); // since aabb is ccw
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

        this.tempPoints = [new Vector2(), new Vector2(), new Vector2(), new Vector2()]; // temporal points for aabb; often constantly used
        this.rectPoints = [new Vector2(), new Vector2(), new Vector2(), new Vector2()];
    }
    
    calcAABBrect(drawer, transform) {
        // !!! object should be drawn => truePivot and deg should be calculated by now !!!

        drawer.fractPivot.x = drawer.innerSize.x * (1.0 - transform.pivot.x);
        drawer.fractPivot.y = drawer.innerSize.y * (1.0 - transform.pivot.y);

        this.cosA = Math.cos(drawer.deg);
        this.sinA = Math.sin(drawer.deg);
        
        this.tempPoints[0].x = - drawer.truePivot.x; this.tempPoints[0].y = - drawer.truePivot.y;
        this.tempPoints[1].x = drawer.fractPivot.x; this.tempPoints[1].y = - drawer.truePivot.y;
        this.tempPoints[2].x = drawer.fractPivot.x; this.tempPoints[2].y = drawer.fractPivot.y;
        this.tempPoints[3].x = - drawer.truePivot.x; this.tempPoints[3].y = drawer.fractPivot.y;

        for(var i = 0; i < 4; i += 1) {
            this.rectPoints[i].y = this.tempPoints[i].y * this.cosA - this.tempPoints[i].x * this.sinA;
            this.rectPoints[i].x = this.tempPoints[i].y * this.sinA + this.tempPoints[i].x * this.cosA;
            
            this.rectPoints[i].x *= transform.scale.x;
            this.rectPoints[i].x += transform.position.x;
            this.rectPoints[i].y *= transform.scale.y;
            this.rectPoints[i].y += transform.position.y;
        }
    }
    
    // to draw you need to calc first
    drawAABBrect() {
        context.beginPath();

        context.moveTo(this.rectPoints[3].x, this.rectPoints[3].y);
        
        for(var i = 0; i < 4; i += 1) {
            context.lineTo(this.rectPoints[i].x, this.rectPoints[i].y);
        }

        context.lineWidth = 4.0;
        context.stroke();

        context.closePath();
    }

    ntptest(collisionPoint) {
        // get aabb rect of checked layer
        var mostLeft = null;
        var mostRight = null;
        var mostTop = null;
        var mostBottom = null;

        this.rectPoints.forEach(rectPoint => {
            if(null == mostLeft || rectPoint.x < mostLeft) mostLeft = rectPoint.x;
            if(null == mostRight || rectPoint.x > mostRight) mostRight = rectPoint.x;
            if(null == mostBottom || rectPoint.y < mostBottom) mostBottom = rectPoint.y;
            if(null == mostTop || rectPoint.y > mostTop) mostTop = rectPoint.y;
        });
        // check if point is within that rect
        if( ( mostLeft < collisionPoint.x && mostRight > collisionPoint.x ) &&
            ( mostBottom < collisionPoint.y && mostTop > collisionPoint.y ) ) {
            return true;
        }
        else {
            return false;
        }
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

            // alert(i +" "+ ni1 +" "+ ni2 +" :: "+ result);

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
        if(this.down && handle.active) { handle.apply(); }
    }

    onMouseDown(event) {
        this.updatePosition(event);
        this.clickPos.x = this.pos.x;
        this.clickPos.y = this.pos.y;
        this.down = true;

        // hitttest handle
        if(null != selectedObject) {
            var dist = Vector2.distance(selectedObject.transform.position, this.clickPos)
            if(handleHitbox > dist ) { handle.active = true; }
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

        var h_atlasElements = [new AtlasElement( new Vector2(0.0, 0.0), new Vector2(128.0, 128.0), null), // position
            new AtlasElement( new Vector2(128.0, 0.0), new Vector2(128.0, 128.0), null), // rotation
            new AtlasElement( new Vector2(0.0, 128.0), new Vector2(128.0, 128.0), null), // scale
            new AtlasElement( new Vector2(128.0, 128.0), new Vector2(128.0, 128.0), null)]; // pivot
        this.h_atlas = new Atlas("handles.png", h_atlasElements);
        
        this.defaultScale = new Vector2(1.0, 1.0);
        this.defaultRotation = 0.0;
        
        this.delta = new Vector2(0.0, 0.0);
        this.mousememory = new Vector2(-1.0, -1.0);
    }

    draw() {
        if(null != selectedObject) {
            // this.h_atlas.atlasElements[this.mode].transform = selectedObject.transform;

            this.h_atlas.atlasElements[this.mode].transform.position.x = selectedObject.transform.position.x;
            this.h_atlas.atlasElements[this.mode].transform.position.y = selectedObject.transform.position.y;

            this.h_atlas.atlasElements[this.mode].draw();
        }
    }

    apply() {
        switch (this.mode) {
            case 0: // position
                selectedObject.transform.position.x += mouseInfo.delta.x;
                selectedObject.transform.position.y += mouseInfo.delta.y;
                break;
            case 1: // rotation
                selectedObject.transform.rotation += - mouseInfo.delta.x * rotationHandleTweak;
                while(selectedObject.transform.rotation > 180) { selectedObject.transform.rotation -= 360.0; }
                while(selectedObject.transform.rotation < -180) { selectedObject.transform.rotation += 360.0; }
                break;
            case 2: // scale
                selectedObject.transform.scale.x += mouseInfo.delta.x * sizeHandleTweak;
                selectedObject.transform.scale.x = Math.min(selectedObject.transform.scale.x, 8.0);
                selectedObject.transform.scale.x = Math.max(selectedObject.transform.scale.x, 0.1);
                selectedObject.transform.scale.y = selectedObject.transform.scale.x;
                break;
            case 3: // pivot
                selectedObject.transform.pivot.x += mouseInfo.delta.x * sizeHandleTweak;
                selectedObject.transform.pivot.x = Math.min(selectedObject.transform.pivot.x, 0.0);
                selectedObject.transform.pivot.x = Math.max(selectedObject.transform.pivot.x, 1.0);

                selectedObject.transform.pivot.y += mouseInfo.delta.y * sizeHandleTweak + sizeHandleTweak;
                selectedObject.transform.pivot.y = Math.min(selectedObject.transform.pivot.y, 0.0);
                selectedObject.transform.pivot.y = Math.max(selectedObject.transform.pivot.y, 1.0);
                break;
            default:
                break;
        }
    }

    processKeyCode(code) {
        switch (code) {
            case 49:
                this.mode = 0;
            break;
            case 50:
                this.mode = 1;
            break;
            case 51:
                this.mode = 2;
            break;
            case 52:
                // this.mode = 3;
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

document.addEventListener("keypress", function(e) { handle.processKeyCode(e.keyCode); } );

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

    handle.draw();
}

onload = Init ();
setInterval(draw, 33);
