/*
 * Ski Gratis
 * =====
 * A game that looks very much like ski free
 *
 * This game was written to explore using easel.js
 * At some point I will turn this into a blog post
 * and perhaps even try and give some sort of talk.
 *
 * -- Sugendran
 */
// should probably encapsulate and play nice
(function(window, document) {

	// list of rows of things to draw
	// screen is broken into 64x64 grid
	// creating this as multiple worlds so that
	// in theory we can have many ski free games
	// all at the same time!
	function newWorld(stage, stageWidth, stageHeight) {
		// "Constants"
		var TILE_EDGE = 64;
		var TILE_EDGE_MINUS = -TILE_EDGE;
		var HALF_TILE_EDGE = TILE_EDGE * 0.5;
		var DIFFICULTY = 28;

		// "privates" (Haha... I made you say privates in your head)
		var _gameGrid = [];
		var _maxCols = Math.floor(stageWidth / TILE_EDGE) + 16;
		var _maxRows = Math.floor(stageHeight / TILE_EDGE) + 8;
		var _offsetX = 0;
		var _offsetY = 0;
		var _direction = 0;
		var _crashed = false;
		var _score = 0;
		var _offsetYPerTick = TILE_EDGE / 1000;
		var _offsetXPerTick = 2 * TILE_EDGE / 1000;
		var _offsetYSpeedUp = 0;
		var _bearUnleashed = false;

		// no z-indexes anywhere... WTF.
		// gonna setup a "container" for each layer
		var bgContainer = new createjs.Container();
		var skierContainer = new createjs.Container();
		stage.addChild(bgContainer);
		stage.addChild(skierContainer);

		// displaying the frames per second 
		// seems like a popular thing to do
		var fpsDisplay = new createjs.Text();
		fpsDisplay.textAlign = "right";
		fpsDisplay.x = stageWidth - 10;
		fpsDisplay.y = stageHeight - 10;
		skierContainer.addChild(fpsDisplay);

		// draw the score in the top right
		var scoreDisplay = new createjs.Text();
		scoreDisplay.textAlign = "right";
		scoreDisplay.x = stageWidth - 10;
		scoreDisplay.y = 24;
		scoreDisplay.font = "bold 24px monospace";
		skierContainer.addChild(scoreDisplay);

		// now add our skier
		var skier = new createjs.Bitmap("images/person.png");
		skier.regX = HALF_TILE_EDGE;
		skier.regY = TILE_EDGE;
		skier.x = (stageWidth * 0.5);
		skier.y = (stageHeight * 0.5);
		skierContainer.addChild(skier);

		// also add a crash/stumble icon, but keep it hidden
		var crash = new createjs.Bitmap("images/crash.png");
		crash.regX = HALF_TILE_EDGE;
		crash.regY = TILE_EDGE;
		crash.x = (stageWidth * 0.5);
		crash.y = (stageHeight * 0.5);
		crash.visible = false;
		crash.alpha = 0;
		skierContainer.addChild(crash);

		// load the sprite sheet
		var bearSpriteSheet = new createjs.SpriteSheet({
			images: ["images/bear.png"],
			// each frame is a 64x64 square
			frames: {width: 64, height: 64, count: 4, regX: 32, regY: 64},
			// only one animation in the list and it uses frames zero to three
			animations: { run: [0, 3, true, 10] }
		});
		// make a bitmap object for sticking onto the screen
		var bear = new createjs.Sprite(bearSpriteSheet, "run");
		// start that running animation up
		bear.gotoAndPlay("run");
		bear.x = -TILE_EDGE;
		bear.y = -TILE_EDGE;
		skierContainer.addChild(bear);

		// build up the grid
		// the grid is a map of the world
		// that wraps around as we move about it
		while(_gameGrid.length < _maxRows) {
			var newRow = [];
			for(var i=0, ii=_maxCols; i<ii; i++) {
				var r = Math.floor(Math.random() * DIFFICULTY);
				if(r == 1) {
					var tree = new createjs.Bitmap("images/tree.png");
					bgContainer.addChild(tree);
					newRow.push(tree);
				} else if(r == 2) {
					var rock = new createjs.Bitmap("images/rock.png");
					bgContainer.addChildAt(rock);
					newRow.push(rock);
				} else {
					newRow.push(0);
				}
			}
			_gameGrid.push(newRow);
		}

		// functions for messing with arrays in the grid
		function shiftPush(arr) {
			arr.push(arr.shift());
		}
		function popSplice(arr) {
			arr.splice(0, 0, arr.pop());
		}
		// move rows/cols around if we have moved to far
		// also update the x,y co-ords of everything in the grid
		function updateGrid() {
			if(_offsetY < TILE_EDGE_MINUS) {
				// take a row of cells from the top and move them to the bottom
				shiftPush(_gameGrid);
				_offsetY += TILE_EDGE;
			}
			if(_offsetX < TILE_EDGE_MINUS) {
				// gotta take one from the left and put it on the right
				_gameGrid.forEach(shiftPush);
				_offsetX += TILE_EDGE;
			} else if (_offsetX > TILE_EDGE) {
				// gotta take one from the right and put it on the left
				_gameGrid.forEach(popSplice);
				_offsetX -= TILE_EDGE;
			}

			// updated all locations
			var y = _gameGrid.length + _offsetY;
			for(var i=0; i<_maxRows; i++) {
				var row = _gameGrid[i];
				var x = _offsetX;
				for(var j=0; j<_maxCols; j++) {
					row[j].x = x;
					row[j].y = y;
					x += TILE_EDGE;
				}
				y += TILE_EDGE;
			}
		}
		// first run to get some locations happening before we draw
		updateGrid();

		// we should speed up as time goes by and then reset it when we crash!
		setInterval(function(){
			_offsetYSpeedUp = Math.min(8, _offsetXPerTick + (_offsetYPerTick * 0.5));
		},1000);


		// this function will do a very simple collision check
		// it just checks to see if the anchor point of the person
		// collides with ANY object below it.
		function checkForCollision() {
			if(_crashed) {
				return;
			}
			var obj = bgContainer.getObjectUnderPoint(skier.x, skier.y);
			if(obj) {
				// we probably didn't need the tweening here but the switch
				// between the sprites was very jarring so I stuck it in.
				// plus you get to see tween.js work
				_crashed = true;
				createjs.Tween.get(skier).to({alpha: 0}, 200).set({visible: false});
				createjs.Tween.get(crash).set({visible: true}).to({alpha: 1}, 200);
				_offsetYSpeedUp = 0;
				_score -= 50;
				setTimeout(function(){ 
					createjs.Tween.get(crash).to({alpha: 0}, 200).set({visible: false});
					createjs.Tween.get(skier).set({visible: true}).to({alpha: 1}, 200);
					_crashed = false; 
				}, 2300);
			}
		}


		function killPlayer() {
			createjs.Tween.get(bear).to({x: skier.x, y: skier.y}, 3000, createjs.Ease.elasticOut).call(function(){
				crash.alpha = 1;
				skier.alpha = 0;
				createjs.Ticker.paused = true;
			});
		}

		// we want to move 1 tile every 1 second
		// so we need to work out how many pixels
		// are moved per tick
		// The tick function gets called with the elapsed time
		// since the last time it was called
		this.tick = function(event) {
			var elapsed = event.delta;
			_offsetY -= (_offsetYPerTick + _offsetYSpeedUp) * elapsed;
			_offsetX -= _direction * _offsetXPerTick * elapsed;
			updateGrid();
			checkForCollision();

			if(!_crashed) {
				_score += (elapsed / 100);
			}

			if(_score > 1000 && !_bearUnleashed) {
				// unleash the bear and end the game
				killPlayer();
			}

			fpsDisplay.text = "fps: " + ~~createjs.Ticker.getMeasuredFPS();
			scoreDisplay.text = Math.floor(_score) + " points";
			stage.tick();
			stage.update();
		};

		// just going to skew the object along the Y-axis 
		// so that it looks liek they're changin direction
		// really should load up a different sprite for this... meh.
		function updatePersonOrientation() {
			skier.skewY = -0.3 * TILE_EDGE * _direction;
		}

		// the following bits of code deal with mouse/touch events
		var mouseActive = false;
		stage.onMouseUp = function () {
			mouseActive = false;
		};
		stage.onMouseDown = function () {
			mouseActive = true;
		};
		stage.onMouseMove = function(mouseEvent) {
			if(!mouseActive || _crashed) {
				return;
			}
			var mx = Math.round(mouseEvent.stageX / TILE_EDGE);
			var px = Math.round(skier.x / TILE_EDGE);
			var delta = mx - px;
			if(delta < 0 && _direction > -1) {
				_direction = -1;
			} else if(delta > 0 && _direction < 1) {
				_direction = 1;
			} else if (delta == 0 && _direction != 0) {
				_direction = 0;
			}
			updatePersonOrientation();
		};

		// added this so that I can hook in keyboard events
		this.setDirection = function(d) {
			if(_crashed) {
				return;
			}
			_direction = d;
			updatePersonOrientation();
		};

		return this;
	}

	// loads a self contained game in the given element
	function loadSkiGratis(elementId) {
		// setup the canvas
		canvasElement = document.getElementById(elementId);
		var stage = new createjs.Stage(canvasElement);
		var height = canvasElement.height;
		var width = canvasElement.width;
		// create our world object
		var world = newWorld(stage, width, height);
		// tell the Ticker to call world.tick such that
		// it renders at 60 FPS
	    createjs.Ticker.addEventListener("tick", world.tick.bind(world));
	    createjs.Ticker.framerate = 16;

	    // allow touches to work
	    createjs.Touch.enable(stage);

	    // global listener - not cool for embedding, but nice for debugging
		window.addEventListener("keypress", function(e) {
			if(e.charCode == 97) {
				//a
				world.setDirection(-1);
			} else if(e.charCode == 115) {
				// s
				world.setDirection(0);
			} else if (e.charCode == 100) {
				// d
				world.setDirection(1);
			}
		});
	}

	window.skigratis = loadSkiGratis;
})(window, document);