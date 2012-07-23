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
//(function(window, document) {

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
	var DIFFICULTY = 40;

	// "privates" (Haha... I made you say privates in your head)
	var _gameGrid = [];
	var _maxCols = Math.floor(stageWidth / TILE_EDGE) + 16;
	var _maxRows = Math.floor(stageHeight / TILE_EDGE) + 8;
	var _offsetX = 0;
	var _offsetY = 0;
	var _direction = 0;
	var _crashed = false;
	var _score = 0;

	// no z-indexes anywhere... WTF.
	// gonna setup a "container" for each layer
	var bgContainer = new Container();
	var skierContainer = new Container();
	stage.addChild(bgContainer);
	stage.addChild(skierContainer);

	// displaying the frames per second 
	// seems like a popular thing to do
	var fpsDisplay = new Text();
	fpsDisplay.textAlign = "right";
	fpsDisplay.x = stageWidth - 10;
	fpsDisplay.y = stageHeight - 10;
	skierContainer.addChild(fpsDisplay);

	// draw the score in the top right
	var scoreDisplay = new Text();
	scoreDisplay.textAlign = "right";
	scoreDisplay.x = stageWidth - 10;
	scoreDisplay.y = 24;
	scoreDisplay.font = "bold 24px sans-serif";
	skierContainer.addChild(scoreDisplay);

	// now add our skier
	var skier = new Bitmap("images/person.png");
	skier.regX = HALF_TILE_EDGE;
	skier.regY = TILE_EDGE;
	skier.x = (stageWidth * 0.5);
	skier.y = (stageHeight * 0.5);
	skierContainer.addChild(skier);

	// also add a crash/stumble icon, but keep it hidden
	var crash = new Bitmap("images/crash.png");
	crash.regX = HALF_TILE_EDGE;
	crash.regY = TILE_EDGE;
	crash.x = (stageWidth * 0.5);
	crash.y = (stageHeight * 0.5);
	crash.visible = false;
	crash.alpha = 0;
	skierContainer.addChild(crash);

	// build up the grid
	// the grid is a map of the world
	// that wraps around as we move about it
	while(_gameGrid.length < _maxRows) {
		var newRow = [];
		for(var i=0, ii=_maxCols; i<ii; i++) {
			var r = Math.floor(Math.random() * DIFFICULTY);
			if(r == 1) {
				var tree = new Bitmap("images/tree.png");
				bgContainer.addChild(tree);
				newRow.push(tree);
			} else if(r == 2) {
				var rock = new Bitmap("images/rock.png");
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
			Tween.get(skier).to({alpha: 0}, 200).set({visible: false});
			Tween.get(crash).set({visible: true}).to({alpha: 1}, 200);
			setTimeout(function(){ 
				Tween.get(crash).to({alpha: 0}, 200).set({visible: false});
				Tween.get(skier).set({visible: true}).to({alpha: 1}, 200);
				_crashed = false; 
			}, 2300);
		}
	}


	// we want to move 1 tile every 1 second
	// so we need to work out how many pixels
	// are moved per tick
	// The tick function gets called with the elapsed time
	// since the last time it was called
	var offsetYPerTick = TILE_EDGE / 1000;
	var offsetXPerTick = 2 * TILE_EDGE / 1000;
	this.tick = function(elapsed) {
		_offsetY -= offsetYPerTick * elapsed;
		_offsetX -= _direction * offsetXPerTick * elapsed;
		updateGrid();
		checkForCollision();

		if(!_crashed) {
			_score += (elapsed / 100);
		}

		fpsDisplay.text = "fps: " + ~~Ticker.getMeasuredFPS();
		scoreDisplay.text = Math.floor(_score) + " points";
		stage.tick();
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
		if(!mouseActive) {
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
		_direction = d;
		updatePersonOrientation();
	};

	return this;
}

// loads a self contained game in the given element
function loadSkiGratis(elementId) {
	// setup the canvas
	canvasElement = document.getElementById(elementId);
	var stage = new Stage(canvasElement);
	var height = canvasElement.height;
	var width = canvasElement.width;
	// create our world object
	var world = newWorld(stage, width, height);
	// tell the Ticker to call world.tick such that
	// it renders at 60 FPS
    Ticker.addListener(world);
    Ticker.useRAF = true;
    Ticker.setFPS(60);

    // allow touches to work
    Touch.enable(stage);

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
//})(window, document);