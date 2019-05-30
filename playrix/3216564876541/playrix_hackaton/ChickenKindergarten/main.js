const TILESIZE = 16,
	OFFSETX = 176,
	WORKSPACE = 176 - 32 * 2,
	WORKOFFSET = 32;

class Sprite {
	constructor(row, x, y) {
		this.offsetX = OFFSETX;
		this.offsetY = row * TILESIZE;
		this.x = x;
		this.y = y;
		this.jump = 0;
		this.shadowOffsetY = 0;
	}
	setFrame(frame) {
		this.offsetX = OFFSETX + (frame | 0) * TILESIZE;
	}
	draw(ctx, skin) {
		ctx.drawImage(skin, this.offsetX, this.offsetY, TILESIZE, TILESIZE, (this.x + -TILESIZE / 2) | 0, (this.y - this.jump) | 0, TILESIZE, TILESIZE);
	}
	drawShadow(ctx, skin) {
		ctx.drawImage(skin, this.offsetX, this.offsetY + TILESIZE, TILESIZE, TILESIZE, (this.x - TILESIZE / 2) | 0, (this.y + this.shadowOffsetY) | 0, TILESIZE, TILESIZE);
	}
	update() {}
}

class Grass extends Sprite {
	constructor(variant, x, y) {
		super(4, x, y);
		this.shadowOffsetY = 9;
		this.setFrame(variant);
	}
}

class StateSprite extends Sprite {
	constructor(row, x, y, state) {
		super(row, x, y);
		this.state = state;
		this.timer = this.getStateDuration(state);
		this.duration = this.timer;
	}
	setState(state) {
		this.state = state;
		if (this['begin' + this.state]) this['begin' + this.state]();
		this.timer = this.duration = this.getStateDuration(this.state);
	}
	update(dt) {
		if (this['update' + this.state]) {
			this['update' + this.state]();
		}
		this.timer -= dt;
		if (this.timer < 0) {
			let state = this['end' + this.state]();
			this.setState(state);
		}
	}
}

class Chick extends StateSprite {
	constructor(x, y, area) {
		super(0, x, y, 'Idle');
		this.area = area;
		this.shadowOffsetY = 7;
		this.setFrame(7);
		this.sx = 0;
		this.sy = 0;
	}
	getStateDuration(state) {
		return {
			Idle: () => Math.random() * 0.3 + 0.2,
			Eat: () => Math.random() * 0.5 + 0.2,
			Move: () => Math.random() * 0.6 + 0.4,
			Mad: () => 0.4,
			Run: () => Math.random() + 5.0,
			Loose: () => 1.0,
			Appear: () => 0.4
		}[state]();
	}
	beginIdle() {
		this.setFrame(this.sx > 0 ? 8 : 7);
	}
	endIdle() {
		if (Math.random() < 0.5) {
			return 'Move';
		} else {
			return 'Eat';
		}
	}
	beginMove() {
		let r = Math.random() * Math.PI * 2.0;
		this.sx = Math.cos(r);
		this.sy = Math.sin(r);
	}
	updateMove() {
		this.x += this.sx;
		this.y += this.sy;
		this.area.bounce(this);
		this.setFrame(this.sx > 0 ? 8 : 7);
		this.jump = Math.abs(Math.sin((this.duration - this.timer) * 15) * this.timer * 10);
		if (this.area.hasWormsNear(this)) {
			this.jump = 0;
			this.setState('Eat');
		}
	}
	endMove() {
		if (this.area.hasWormsNear(this)) {
			return 'Eat';
		} else {
			return 'Idle';
		}
	}
	updateEat() {
		let base = this.sx > 0 ? 9 : 5;
		this.setFrame(base + (Math.sin(this.timer * 70) > 0 ? 1 : 0));
	}
	endEat() {
		this.area.eatWormsNear(this);
		return 'Idle';
	}
	updateMad() {
		this.jump = Math.abs(Math.sin((this.duration - this.timer) * 15) * this.timer * 20);
		this.setFrame(3 + (Math.sin(this.timer * 70) > 0 ? 1 : 0));
	}
	endMad() {
		return 'Run';
	}
	beginRun() {
		let r = Math.random() * Math.PI * 2.0;
		this.sx = Math.cos(r) * 2;
		this.sy = Math.sin(r) * 2;
	}
	updateRun() {
		this.x += this.sx;
		this.y += this.sy;
		this.area.bounce(this);
		this.setFrame(this.sy < 0 ? 0 : (Math.sin(this.timer * 70) > 0 ? 1 : 2));
	}
	endRun() {
		return 'Idle';
	}
	updateLoose() {
		this.jump = Math.abs(Math.sin((this.duration - this.timer) * 15) * 20);
		this.setFrame(3 + (Math.sin(this.timer * 70) > 0 ? 1 : 0));
	}
	endLoose() {
		return 'Loose';
	}
	updateAppear() {
		this.jump = Math.abs(Math.sin((this.duration - this.timer) * 15) * this.timer * 20);
		this.setFrame(3 + (Math.sin(this.timer * 70) > 0 ? 1 : 0));
	}
	endAppear() {
		return 'Idle';
	}
}

class Worm extends StateSprite {
	constructor(x, y, area) {
		super(6, x, y, 'Hidden');
		this.shadowOffsetY = 8;
		this.setFrame(5);
		this.area = area;
	}
	getStateDuration(state) {
		return {
			Show: () => 0.8,
			Idle: () => Math.random() * 5.0 + 2.0,
			Hide: () => 0.8,
			Hidden: () => Math.random() * 10.0 + 2.0
		}[state]();
	}
	updateShow() {
		this.setFrame(4 - this.timer * 5);
	}
	endShow() {
		return 'Idle';
	}
	beginIdle() {
		this.setFrame(3);
	}
	endIdle() {
		return 'Hide';
	}
	beginHide() {
		this.setFrame(3);
	}
	updateHide() {
		this.setFrame(this.timer * 5);
	}
	endHide() {
		return 'Hidden';
	}
	beginHidden() {
		this.setFrame(5);
	}
	endHidden() {
		this.area.replaceWorm(this);
		return 'Show';
	}
}

class Chicken extends StateSprite {
	constructor(area, userInfo) {
		super(2, area.bounds.x0 * 0.5 + area.bounds.x1 * 0.5, area.bounds.y1, 'Idle');
		this.shadowOffsetY = 7;
		this.targetx = this.x;
		this.moveTimer = 0;
		this.userInfo = userInfo;
	}
	getStateDuration(state) {
		return {
			Idle: () => Math.random() * 0.3 + 0.1,
			Move: () => 0.2,
			Random: () => Math.random() * 0.1 + 0.1,
			Knock: () => 0.05,
			Xp: () => 0.2
		}[state]();
	}
	beginIdle() {
		this.setFrame(2);
	}
	endIdle() {
		if (Math.random() < 0.5) {
			return 'Random';
		}
		if (Math.random() < 0.5) {
			return 'Knock';
		}
		return 'Idle';
	}
	beginMove() {
		this.jump = 0;
		this.setFrame(0);
	}
	endMove() {
		return 'Idle';
	}
	beginRandom() {
		let frame = Math.floor(Math.random() * 3) + 1;
		this.setFrame(frame);
	}
	endRandom() {
		return 'Idle';
	}
	beginKnock() {
		this.setFrame(4);
	}
	endKnock() {
		return 'Idle';
	}
	beginXp() {
		this.setFrame(5);
	}
	updateXp() {
		this.jump = Math.sin((1.0 - this.timer / this.duration) * Math.PI * 2.0) * 4.0;
	}
	endXp() {
		this.jump = 0;
		return 'Move';
	}
}

class StageGame {
	constructor(config, userInfo) {
		this.timer = config.getLevelTime(userInfo);
		this.bounds = config.getAreaBounds(userInfo);
		this.userInfo = userInfo;
		this.config = config;
		this.score = 0;

		this.sprites = [];
		this.gameover = true;
		this.getNextChickTimer = config.getNextChickTimer;
		this.nextChickTimer = 0.0;
		this.chicksCount = 0;
	}
	newGame(canvas) {
		this.sprites = [];
		this.placeGrass(this.config, this.userInfo);
		this.placeChicks(this.config, this.userInfo);
		this.placeWorms(this.config, this.userInfo);
		this.chicken = new Chicken(this, this.userInfo);
		this.sprites.push(this.chicken);
		this.gameover = false;
		this.score = 0;
		this.looseTimer = 0;
		this.runawayChick = null;
		this.chicksCount = 0;
		this.nextChickTimer = this.getNextChickTimer(this.chicksCount);

		canvas.onclick = (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.onclick(e.offsetX / canvas.offsetWidth * canvas.width, e.offsetY / canvas.offsetHeight * canvas.height);
			return false;
		};
		canvas.onmousemove = canvas.ondrag = (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.ondrag(e.offsetX / canvas.offsetWidth * canvas.width, e.offsetY / canvas.offsetHeight * canvas.height);
			return false;
		};
	}
	getRandPointInRect(x0, x1, y0, y1) {
		return {
			x: x0 + (x1 - x0) * Math.random(),
			y: y0 + (y1 - y0) * Math.random()
		};
	}
	placeGrass(config, userInfo) {
		let count = config.getGrassCount(userInfo);
		this.sprites.push(new Grass(config.getGrassVariant(userInfo), 30, 20));
		this.sprites.push(new Grass(config.getGrassVariant(userInfo), 176-30, 20));
		for (let i = 0; i < count; i++) {
			let pos;
			nextTry: for (let tries = 0; tries < 100; tries++) {
				pos = this.getRandPointInRect(this.bounds.x0, this.bounds.x1, this.bounds.y0, this.bounds.y1);
				for (let j = 0; j < this.sprites.length; j++) {
					if (this.sprites[j] instanceof Grass) {
						let dx = this.sprites[j].x - pos.x,
							dy = this.sprites[j].y - pos.y;
						if (dx * dx + dy * dy < TILESIZE * TILESIZE * 0.25) {
							break nextTry;
						}
					}
				}
			}
			this.sprites.push(new Grass(config.getGrassVariant(userInfo), pos.x, pos.y));
		}
	}
	placeChicks(config, userInfo) {
		let count = config.getChickCount(userInfo);
		for (let i = 0; i < count; i++) {
			this.addChick();
		}
	}
	addChick() {
		let pos = this.getRandPointInRect(this.bounds.x0, this.bounds.x1, this.bounds.y0, this.bounds.y1 - 60),
			chick = new Chick(pos.x, pos.y, this);
		this.sprites.push(chick);
		this.chicksCount++;
		return chick;
	}
	placeWorms(config, userInfo) {
		let count = config.getWormsCount(userInfo);
		for (let i = 0; i < count; i++) {
			let worm = new Worm(0, 0, this);
			this.sprites.push(worm);
			this.replaceWorm(worm);
		}
	}
	update(dt) {
		if (this.gameover) {
			return;
		}

		if (this.runawayChick) {
			this.looseTimer -= dt;
			if (this.looseTimer < 0.0) {
				if (this.runawayChick.state !== 'Loose') {
					this.runawayChick.setState('Loose');
					this.looseTimer = 1.0;
				} else {
					this.gameover = true;
					return true;
				}
			}
			this.runawayChick.update(dt);
		} else {
			for (let i = 0; i < this.sprites.length; i++) {
				this.sprites[i].update(dt);
			}

			this.nextChickTimer -= dt;
			if (this.nextChickTimer < 0.0) {
				let chick = this.addChick();
				chick.setState('Appear');
				this.nextChickTimer = this.getNextChickTimer(this.chicksCount);
			}
		}
	}
	draw(ctx, skin) {
		this.sprites.sort((a, b) => a.y - b.y);
		ctx.drawImage(skin, 0, 0);
		for (let i = 0; i < this.sprites.length; i++) {
			this.sprites[i].drawShadow(ctx, skin);
		}
		for (let i = 0; i < this.sprites.length; i++) {
			this.sprites[i].draw(ctx, skin);
		}
	}
	bounce(chick) {
		if (chick.x < this.bounds.x0) {
			chick.x = this.bounds.x0;
			chick.sx = -chick.sx;
		}
		if (chick.x > this.bounds.x1) {
			chick.x = this.bounds.x1;
			chick.sx = -chick.sx;
		}
		if (chick.y < this.bounds.y0) {
			chick.y = this.bounds.y0;
			chick.sy = -chick.sy;
		}

		let covered = false,
			dx = this.chicken.x - chick.x,
			dy = this.chicken.y - chick.y;
		if (dx * dx + dy * dy < TILESIZE * TILESIZE) {
			if (this.chicken.state !== 'Xp') {
				this.chicken.setState('Move');
			}
			covered = true;
		}

		if (chick.y > this.bounds.y1) {
			if (covered) {
				chick.y = this.bounds.y1;
				chick.sy = -chick.sy;
				this.score += 100;
				document.getElementById('score').innerText = this.score;
				this.chicken.setState('Xp');
			} else {
				this.runawayChick = chick;
				this.looseTimer = 0.01;
			}
		}
	}
	hasWormsNear(chick) {
		for (let i = 0; i < this.sprites.length; i++) {
			if (this.sprites[i] instanceof Worm && this.sprites[i].state !== 'Hidden') {
				let dx = this.sprites[i].x - chick.x,
					dy = this.sprites[i].y - chick.y;
				if (dx * dx + dy * dy < TILESIZE * TILESIZE / 2 / 2) {
					return true;
				}
			}
		}
	}
	eatWormsNear(chick) {
		for (let i = 0; i < this.sprites.length; i++) {
			if (this.sprites[i] instanceof Worm && this.sprites[i].state !== 'Hidden') {
				let dx = this.sprites[i].x - chick.x,
					dy = this.sprites[i].y - chick.y;
				if (dx * dx + dy * dy < TILESIZE * TILESIZE / 2 / 2) {
					this.sprites[i].setState('Hidden');

					// съели чьего-то червяка
					for (let j = 0; j < this.sprites.length; j++) {
						if (this.sprites[j] instanceof Chick && this.sprites[j] !== chick && this.sprites[j].stata === 'Eat') {
							let dx1 = this.sprites[i].x - this.sprites[j].x,
								dy1 = this.sprites[i].y - this.sprites[j].y;
							if (dx1 * dx1 + dy1 * dy1 < TILESIZE * TILESIZE / 2) {
								this.sprites[j].setState('Mad');
							}
						}
					}
				}
			}
		}
	}
	replaceWorm(worm) {
		nextTry: for (let tries = 0; tries < 100; tries++) {
			let pos = this.getRandPointInRect(this.bounds.x0 + TILESIZE, this.bounds.x1 - TILESIZE, this.bounds.y0 + TILESIZE, this.bounds.y1 - TILESIZE);
			worm.x = pos.x;
			worm.y = pos.y;
			for (let j = 0; j < this.sprites.length; j++) {
				if (this.sprites[j] instanceof Grass) {
					let dx = this.sprites[j].x - worm.x,
						dy = this.sprites[j].y - worm.y;
					if (dx * dx + dy * dy < TILESIZE * TILESIZE) {
						continue nextTry;
					}
				}
			}
		}
	}
	onclick(x, y) {
		if (this.runawayChick || this.gameover) {
			return;
		}

		for (let j = 0; j < this.sprites.length; j++) {
			if (this.sprites[j] instanceof Chick) {
				let dx1 = x - this.sprites[j].x,
					dy1 = y - this.sprites[j].y - TILESIZE / 2;
				if (dx1 * dx1 + dy1 * dy1 < TILESIZE * TILESIZE / 2) {
					this.sprites[j].setState('Mad');
				}
			}
		}
	}
	ondrag(x, y) {
		if (this.runawayChick || this.gameover) {
			return;
		}

		if (x < this.bounds.x0) {
			x = this.bounds.x0;
		}
		if (x > this.bounds.x1) {
			x = this.bounds.x1;
		}
		this.chicken.x = x;
		if (this.chicken.state !== 'Xp') {
			this.chicken.setState('Move');
		}
	}
}

class Game {
	constructor(canvas, skin, config, userInfo) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');
		this.skin = skin;
		this.userInfo = userInfo;
		this.config = config;
		this.stage = new StageGame(config, userInfo);

		window.setInterval(() => this.update(1.0 / config.updateRate), config.updateRate);
		this.update(1.0 / config.updateRate);
		this.draw();

		window.onclick = () => this.play();
	}
	draw() {
		this.stage.draw(this.ctx, this.skin);
		window.requestAnimationFrame(() => this.draw());
	}
	update(dt) {
		if (this.stage.gameover) {
			return;
		}

		if (this.stage.update(dt)) {
			let record = this.stage.score > 0;
			for (let i = 0; i < this.userInfo.highscores.length; i++) {
				if (this.stage.score <= this.userInfo.highscores[i].score) {
					record = false;
					break;
				}
			}
			
			if (record) {
				let name = window.prompt('НОВЫЙ РЕКОРД! Введите имя:');
				this.userInfo.highscores.push({
					name: name || 'anonymous',
					score: this.stage.score
				});
			}

			this.userInfo.highscores.sort((a, b) => a.score - b.score);

			let str = '';
			for (let i = 0; i < this.userInfo.highscores.length; i++) {
				str += '<tr><th>' + this.userInfo.highscores[i].name + '</th><th>' + this.userInfo.highscores[i].score + '</th></tr>';
			}
			document.getElementById('highscore-table').innerHTML = str;
			document.getElementById('start').className = '';
			document.getElementById('score').className = 'hidden';
			this.canvas.onmousemove = this.canvas.ondrag = this.canvas.onclick = null;
			window.onclick = () => this.play();
			window.localStorage.setItem('highscores', JSON.stringify(this.userInfo.highscores));
		}
	}
	play() {
		this.stage.newGame(this.canvas);
		window.onclick = null;
		document.getElementById('start').className = 'hidden';
		document.getElementById('score').className = '';
	}
}