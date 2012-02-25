Math.signum = function(x) { return x < 0 ? -1 : (x == 0 ? 0 : 1); };

function Person(at) {
    this.default(at);
    this.action_queue = [];
}

Person.prototype.default = function(at) {
    this.head = at || this.head || {x:0,y:0};
    this.lelbow = {t: 5, l: 0.5};
    this.lhand = {t: -2, l: 0.5};
    this.relbow = {t: -5, l: 0.5};
    this.rhand = {t: 2, l: 0.5};
    this.hips = {t: 0, l: 1};
    this.lknee = {t: 5, l: 0.5};
    this.lfoot = {t: -5, l: 0.5};
    this.rknee = {t: -5, l: 0.5};
    this.rfoot = {t: 5, l: 0.5};  
    this.facingRight = true;
};

Person.defaultPerson = new Person();

Person.prototype.draw = function(p, scale){
    scale = scale || 1;
    p.translate(this.head.x, this.head.y);
    p.ellipse(0,0,25,25);
    
    var shoulders = {x:0, y:14}, 
	hips_ = {x:shoulders.x + this.hips.l * p.sin(p.radians(this.hips.t)) * scale,
		 y: shoulders.y + this.hips.l * p.cos(p.radians(this.hips.t)) * scale},
	limb = function(end1, joint, end2) {
	    var x1 = end1.x, y1 = end1.y,
	 x2 = x1 + p.sin(p.radians(joint.t)) * joint.l * scale, y2 = y1 + p.cos(p.radians(joint.t)) * joint.l *scale,
	 x3 = x2 + p.sin(p.radians(joint.t + end2.t)) * end2.l * scale, y3 = y2 + p.cos(p.radians(joint.t + end2.t)) * end2.l * scale;
	    p.line(x1, y1, x2, y2);
	    p.line(x2, y2, x3, y3);
	};

    p.line(shoulders.x, shoulders.y, hips_.x, hips_.y);
    limb(shoulders, this.lelbow, this.lhand);
    limb(shoulders, this.relbow, this.rhand);
    limb(hips_, this.lknee, this.lfoot);
    limb(hips_, this.rknee, this.rfoot);
    p.translate(-this.head.x, -this.head.y);
};

Person.prototype.keepAnglesNormal = function() {
    for (var prop in this) {
	if (this.hasOwnProperty(prop) && this[prop].hasOwnProperty('t')) {
	    this[prop].t = this[prop].t % 360;
	    if (this[prop].t < -180) this[prop].t += 360;
	    else if (this[prop].t > 180) this[prop].t -= 360;
	}
    }
}

Person.prototype.keepJointsSensible = function() {
    if (this.facingRight) {
	if (this.rhand.t < 0) this.rhand.t = 0;
	if (this.lhand.t < 0) this.lhand.t = 0;
	if (this.rfoot.t > 0) this.rfoot.t = 0;
	if (this.lfoot.t > 0) this.lfoot.t = 0;
    }
    else  {
	if (this.rhand.t > 0) this.rhand.t = 0;
	if (this.lhand.t > 0) this.lhand.t = 0;
	if (this.rfoot.t < 0) this.rfoot.t = 0;
	if (this.lfoot.t < 0) this.lfoot.t = 0;
    }
};

Person.prototype.face = function(direction) {
    if (direction === true || direction === 'right') {
	if (!this.facingRight) this.turnAround();
    }
    else if (this.facingRight) this.turnAround();
};

Person.prototype.turnAround = function() {
    var joints=['hand','foot','elbow','knee'];
    this.action_queue.push({
	name: 'turn around',
	instant: function() {
	    console.log('called', this.facingRight);
	    this.facingRight = !this.facingRight;
	    console.log(this.facingRight);
	    for (var i in joints) {
		this['r' + joints[i]].t *= -1;
		this['l' + joints[i]].t *= -1;
	    }
	}});
};

Person.prototype.walk = function() {
    var f = function() {
	console.log('called walking', this.facingRight);
	var left_forward = this.facingRight;
	return function(dt) {
	    var speed = (this.facingRight ? 50 : -50);
	 
	   
	    this.head.x += dt * speed;
	
	    if (left_forward) {
		this.lknee.t += 100 * dt;
		this.rknee.t -= 100 * dt;
		this.lfoot.t -= 20 * dt;
		this.rfoot.t += 20 * dt;

		this.lelbow.t += 80 * dt;
		this.relbow.t -= 80 * dt;
		this.lhand.t += 40 * dt;
		this.rhand.t -= 40 * dt;
	    }
	    else {
		this.lknee.t -= 100 * dt;
		this.rknee.t += 100 * dt;
		this.lfoot.t += 20 * dt;
		this.rfoot.t -= 20 * dt;

		this.lelbow.t -= 80 * dt;
		this.relbow.t += 80 * dt;
		this.lhand.t -= 40 * dt;
		this.rhand.t += 40 * dt;
	    }
	    this.keepAnglesNormal();

	    if (this.lknee.t > 30 && left_forward) {
		left_forward = false;
	    }
	    else if (this.lknee.t < -30 && !left_forward) {
		left_forward = true;
	    }

	    this.keepJointsSensible();
	    return false;
	}; };
    
    this.action_queue.push({name: 'walking', stepMaker: f});
    this.do_actions();
};

Person.prototype.do_actions = function() {
    if (this.action_in_progress) {
	return true;
    }

    if (this.action_queue.length > 0) {
	var a = this.action_queue.shift();
	this.action = a.name;
	if (a.hasOwnProperty('stepMaker'))
	    this.step = a.stepMaker.call(this);
	else if(a.hasOwnProperty('instant'))
	    a.instant.call(this);
	else if (a.hasOwnProperty('step'))
	    this.step = a.step;
	else
	    this.step = function(dt) {};
	return true;
    }
    else {
	this.step = function(dt){};
	this.action = 'nothing';
	return false;
    }
};

Person.prototype.stop = function() {
    var time = 0,
	velos = {};
    for (var prop in Person.defaultPerson) {
	if (this.hasOwnProperty(prop) && prop != 'head' && Person.defaultPerson[prop].t !== undefined) {
	    velos[prop] = (Person.defaultPerson[prop].t - this[prop].t)/1;
	}
    }

    this.action_queue = [];
    this.action_in_progress = true;
    this.action = 'stopping';
    this.step = function(dt) {
	if (time > 1) {
	    this.default();
	    this.action_in_progress = false;
	    return !this.do_actions();
	}
	time += dt;
	
	for (var prop in velos) {
	    if (velos.hasOwnProperty(prop)) {
		this[prop].t += velos[prop] * dt;
	    }
	}
	return false;
    };
};

Person.prototype.action = 'nothing';
Person.prototype.step = function(dt) {
    // do nothing
    return true;
};

function World(gravity, wind) {
    this.gravity = gravity || 0;
    this.wind = wind || function(x,y) { return {x:0,y:0}; };
    return true;
}

function Particle(time, world, mass, x, y, vx, vy, airresist) {
    this.created = time || 0;
    this.world = world || new World();
    this.mass = mass || 1;
    this.x = x || 0;
    this.y = y || 0;
    this.vx = vx || 0;
    this.vy = vy || 0;
    this.airresist = airresist || 0;

    return true;
}

Particle.prototype.inside = function(x0,x1,y0,y1) {
    return x0 <= this.x && this.x <= x1 && y0 <= this.y && this.y <= y1;
};

Particle.prototype.velocity = function() {
    return Math.sqrt(this.vy * this.vy + this.vx * this.vx);
};

Particle.prototype.step = function(dt, p1, p2, damp) {
    
    var x = this.x, y = this.y,
	newx = x + this.vx * dt,
	newy = y + this.vy * dt;
    if (!p1 || !p2) {
	this.x = newx;
	this.y = newy;
    }
    else {
	var x1 = p1.x, y1 = p1.y,
     x2 = p2.x, y2 = p2.y,
     a1 = x1*y2 - y1*x2, a2 = newx*y - newy * x,
     denom = (x1-x2)*(newy-y) - (y1-y2)*(newx-x);
	if (denom != 0) {
	    var xi = (a1 * (newx - x) - (x1 - x2) * a2) / denom,
	 yi = (a1 * (newy - y) - (y1 - y2) * a2) / denom;

	    if (Math.max(Math.min(y1,y2),Math.min(newy,y))*0.999999 < yi &&
		yi < Math.min(Math.max(y1,y2),Math.max(newy,y))*1.000001 &&
		Math.max(Math.min(x1,x2),Math.min(newx,x))*0.999999 < xi &&
		xi < Math.min(Math.max(x1,x2),Math.max(newx,x))*1.000001) {

		this.reflect(Math.atan2((y1-y2),(x1-x2)), damp);
	    }
	}
	this.step(dt);
    }

    var ratio = this.airresist / this.mass,
	wind = this.world.wind(this.x,this.y),
	windy = wind.y,
	windx = wind.x,
	windspeedy = this.vy - windy,
	windspeedx = this.vx - windx;
   
    this.vy += (this.world.gravity - ratio * Math.abs(windspeedy*windspeedy) * Math.signum(windspeedy)) * dt; 
    this.vx += -ratio * Math.abs(windspeedx*windspeedx) * Math.signum(windspeedx) * dt;
};

Particle.prototype.reflect = function(surfaceAngle, damp) {
    var damp_ = typeof damp == 'undefined' && 1 || damp,
	velocity = this.velocity();

    var myAngle = Math.atan2(this.vy, this.vx),
	incident = Math.PI/2 + surfaceAngle - myAngle,
	reflect = Math.PI/2 + incident + surfaceAngle;
	
    this.vy = -damp * velocity * Math.sin(reflect);
    this.vx = -damp * velocity * Math.cos(reflect);
};

Particle.prototype.terminalVelocity = function() {
    return Math.sqrt(this.world.gravity * this.mass / this.airresist);
};

Particle.prototype.draw = function(p) {
    p.point(this.x, this.y);
};

function Raindrop() {
    var args = [].slice.apply(arguments);
    args[7] = args.length < 8 && 0.001 || args[7];
    Particle.apply(this, args);
}

Raindrop.prototype = new Particle();
Raindrop.prototype.draw = function(p) {
    p.stroke(0);
    p.line(this.x, this.y, this.x - 0.05*this.vx, this.y - 0.05*this.vy);
};

function Snowflake() {
    var args = [].slice.apply(arguments);
    args[7] = args.length < 8 && 0.0002 || args[7];
    Particle.apply(this, args);
}
Snowflake.prototype = new Particle();
Snowflake.prototype.draw = function(p) {
    p.stroke(255);
    p.point(this.x, this.y);
};