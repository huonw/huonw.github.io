$(function() {
    var canvas = document.getElementById("main-canvas");

    var MAXITEMS = 100, MAXAGE = 500,
        CLOUDWIDTH = 200, CLOUDHEIGHT = 40,
        SPAWNRATE = 100,
        UNFOCUSED_FPS = 20,
        FOCUSED_FPS = 30,
        WIND = 0,
        GRAVITY = 20,
        SCROLLX = 0,
        SCROLLY = 0;
    
    function proc(p) {
        var windfunc = function(x,y) {
            var dx = x - (camerax + p.mouseX), dy = y - (cameray + p.mouseY),
                ret = {x: WIND, y: 0};

            if (over && !justOver) {
                var quadrance = dx*dx+dy*dy,
      factor = Math.max(0, 10-quadrance/1000);
                
                ret =  {x: WIND + factor*(p.mouseX - p.pmouseX), y: factor*(p.mouseY -p.pmouseY)};
                
            }
            return ret;
        };

        var over, justOver, items = [], lastt = -1/UNFOCUSED_FPS, spawned = 0, lastAdjust = 0, fr = 10,
     world = new World(GRAVITY, windfunc),
     camerax = 0,
     cameray = 0,
     person,
     scenery = {fore:{},back:{}},
     intendedFps;

        p.setup = function() {
            p.frameRate(UNFOCUSED_FPS);
            intendedFps = UNFOCUSED_FPS;
            p.size(canvas.clientWidth, canvas.clientHeight);
            p.strokeWeight(2);
            person = new Person({x:p.width/2,y:-100});
            cameray = -p.height;
            person.walk();

            p.textFont(p.loadFont("monospace"));
        };


        p.draw  = function() {
            var t = p.millis() / 1000, dt = (t - lastt);

            fr = (fr*10 + 1/dt) / 11;

            if (p.frameCount > 10 && t - lastAdjust > 1) {
                lastAdjust = t;
                var newmax = MAXITEMS;
                if (fr < 0.5 * intendedFps) {
                    newmax = 0.8*MAXITEMS;
                }
                else if (fr < 0.8 * intendedFps) {
                    newmax = 0.95*MAXITEMS;
                }
                else if (fr > 0.98 * intendedFps && items.length > 0.98 * MAXITEMS) {
                    newmax += Math.min(100, newmax*0.1);
                }

                MAXITEMS = Math.floor(Math.max(newmax,50));
                fr = intendedFps;
            }

            camerax += SCROLLX * dt;
            cameray += SCROLLY * dt;
            p.translate(-camerax, -cameray);

            var mx = p.mouseX, my = p.mouseY,
         mvx = mx - p.pmouseX, mvy = p.pmouseY;

            p.background(180);

            var edgel = Math.floor(camerax /100 - 0.1)*100,
         edger = Math.ceil((camerax + p.width)/100 + 0.1)*100;

            p.beginShape();
            p.fill(210);
            for (var i = edgel; i <= edger; i+=100) {
                if (!scenery.fore.hasOwnProperty(i)) {
                    scenery.back[i] = -40 - 80 * Math.random();
                    scenery.fore[i] = -25 - 15 * Math.random();
                }
                p.vertex(i, scenery.back[i]);
            }
            p.vertex(edger+10, 10);
            p.vertex(edgel+10, 10);
            p.endShape(p.CLOSE);

            var newitems = [];
            p.stroke(255);

            for (var i in items) {
                var pt = items[i];

                if (!pt.inside(camerax - 100, camerax + p.width + 100, cameray-10, cameray+p.height) || t - pt.created > MAXAGE) {
                    continue;
                }

                pt.step(dt);
                pt.draw(p);

                newitems.push(pt);
            }
            items = newitems;

            p.stroke(0);
            p.fill(255);

            person.step(dt);

            person.draw(p,30);

            if (Math.random() < 0.3 * dt) {
                /*console.log('stopping');
                person.stop();
                person.turnAround();
                person.walk();*/
            }
            SCROLLX = (person.head.x - camerax)/p.width*400 - 200;
            /*if (person.action == 'walking') {
                SCROLLX = (person.head.x - camerax)/p.width*300 - 150;
            }
            else {
                SCROLLX = 0;
            }*/

            p.fill(230);

            p.beginShape();
            for (var i = edgel; i <= edger; i+=100) {
                p.vertex(i, scenery.fore[i]);
            }
            p.vertex(edger+10, 10);
            p.vertex(edgel+10, 10);
            p.endShape(p.CLOSE);

            if (over) {
            }
            else {
                //SCROLLX = SCROLLY = 0;
            }


            var todo = MAXITEMS - items.length;
            if (todo > dt * SPAWNRATE && spawned !== 0) {
                todo = Math.floor(dt*SPAWNRATE);
            }
            var lprob = (SCROLLX < 0) ? .7 : .1,
         rprob = (SCROLLX < 0) ? .1 : .7;

            if (SCROLLX === 0) { lprob = rprob = .2; }
            if (WIND > 0) { lprob += WIND / 100; }
            else if (WIND < 0) { rprob += -WIND / 100; }

            for (var i = 0; i < todo; i++) {
                var x, y, mass = 0.001 + Math.random() * 0.003;
                if (spawned === 0) {
                    x = (p.width + 200) * Math.random() - 100;
                    y = p.height * Math.random();
                }
                else {
                    var pos = Math.random() * (1 + lprob + rprob);
                    if (pos < lprob) {
                        x = -100 * Math.random();
                        y = Math.random() * p.height;
                    }
                    else if (pos < 1 + lprob) {
                        x = p.width * Math.random();
                        y = (spawned === 0) ? Math.random() * p.height : 0;
                    }
                    else {
                        x = p.width + 100 * Math.random();
                        y = Math.random() * p.height;
                    }
                }

                var pt = new Snowflake(t, world, mass,
                                       camerax + x,
                                       cameray + y, 0, 0);
                pt.vy = pt.terminalVelocity();

                items.push(pt);
            }
            spawned += todo;


            p.fill(0);
            p.text(fr.toFixed(1) + " FPS\n" + items.length + "/" + MAXITEMS + " items", camerax + 10, cameray + 10);
            //console.log(t, dt, items);
            lastt = t;
            justOver = false;
        };

        p.mouseOver = function() {
            p.frameRate(FOCUSED_FPS);
            intendedFps = FOCUSED_FPS;
            fr = intendedFps;
            over = true;
            justOver = true;
        };
        p.mouseOut = function() {
            p.frameRate(UNFOCUSED_FPS);
            intendedFps = UNFOCUSED_FPS;
            fr = intendedFps;
            over = false;
        };
        p.mouseClicked = function() {
        };
        p.resize = function(x,y) {
            if (x !== p.width || y !== p.height) {
                camerax += (p.width - x) / 2;
                cameray += (p.height - y);
                p.size(x,y);
            }
        };
    }


    var processingInstance = new Processing(canvas, proc);
    $(window).resize(function(){
        processingInstance.resize(canvas.clientWidth, canvas.clientHeight);
    });
});