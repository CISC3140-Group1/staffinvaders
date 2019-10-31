/* gameSettings Object
 * Specifies the sizing of the window
 */

function GameSettings() {
  this.width = 640;
  this.height = 480;
  this.speed = 1;
}

function setSpeed(x) {
  console.log("Hey");
  game.gameSettings().speed=x
}

GameSettings.prototype.setDimensions = function(width, height) {
  this.width = width;
  this.height = height;
}

/* Missile Object
 * When the user presses SPACEBAR, a projectile should shoot
 * from the user's x-position until it hits an enemy or the
 * edge of the map.
 */

function Missile(entity, d) {
  this.d = d;
  this.x = entity.x + entity.width/2 - 2;
  this.y = entity.y;
  this.width = 4;
  this.height = entity.height/2;
  this.direction = 8 * d;
}

// update -- missile moves to top per iteration 
Missile.prototype.update = function() {
  this.y -= this.direction;
  if (this.y <= -this.height) {
    return false;
  }
  return true;
}

/* Player Object
 * The user's ship, which can move left and right and
 * spawn missiles.
 */

function Player(x, gs) {
  var playerHeight = gs.height / 10;
  this.x = x;
  this.y = game.gameSettings().height - playerHeight * 1.2;
  this.width = playerHeight * 1.1;
  this.height = playerHeight;
}

// move -- moves the player's ship d-pixels left/right
Player.prototype.move = function(d) {
  if (this.x+d < 0) {
    this.x = 0;
  } else if (this.x+this.width+d > game.gameSettings().width) {
    this.x = game.gameSettings().width-this.width;
  } else {
    this.x += d;
  }
}

// shoot -- creates a new Missile object at player's x location
Player.prototype.shoot = function() {
  game.addMissile(new Missile(this, 1));
}

/* Enemy Object
 * Enemies are packed together and move in unity based on the
 * game timer.
 */

function Enemy(i, j, r, c, gs) {
  var boxwidth = gs.width * 3 / 4;
  var enemyboxwidth = boxwidth / c;
  var enemyboxheight = enemyboxwidth * 0.9;
  var padding = enemyboxwidth / 7;
  this.x = enemyboxwidth * j;
  this.y = enemyboxheight * i;
  this.width = enemyboxwidth - padding;
  this.height = enemyboxheight - padding;
  this.direction = game.gameSettings().speed;
}

// update -- moves enemy object left or right, swapping when it
//           hits an edge.
Enemy.prototype.update = function(gs) {
  if (this.x <= 0 || this.x + this.width >= game.gameSettings().width) {
    return true;
  }
  return false;
}

Enemy.prototype.shootMissile = function() {
  game.addMissile(new Missile(this, -1));
}

// advance -- moves enemy down a level
Enemy.prototype.advance = function() {
  this.direction *= -1;
  this.y += this.height/2;
  if (this.y + this.height >= game.player().y+4) {
    return true
  }
  return false
}

/* Renderer Object
 * Renders graphics using fills on the canvas.
 */

var renderer = (function () {
  // _drawEnemy -- draws the enemy object
  function _drawEnemy(context, enemy, i) {
    // context.fillStyle = "red";
    // context.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    var img = document.getElementById("staff-img-"+i);
    context.drawImage(img, enemy.x, enemy.y, enemy.width, enemy.height);
  }

  // _drawPlayer -- draws the player object
  function _drawPlayer(context, player) {
    // context.fillStyle = "blue";
    // context.fillRect(player.x, player.y, player.width, player.height);
    var img = document.getElementById("player-img");
    context.drawImage(img, player.x, player.y, player.width, player.height);
  }

  // _drawMissile -- draws the missile object
  function _drawMissile(context, missile) {
    context.fillStyle = "white";
    context.fillRect(missile.x, missile.y, missile.width, missile.height);
  }
  
  // _render -- renders all graphics and controls missile hits
  function _render() {
    var player = game.player();
    var canvas = document.getElementById("game-layer");
    var context = canvas.getContext("2d");
    context.fillStyle =  "black";
    context.fillRect(0, 0, canvas.width, canvas.height);
    var entity, entities = game.entities();
    for (var i = 0; i < game.missiles().length; i++) {
      if (game.missiles()[i] == null) continue;
      _drawMissile(context, game.missiles()[i])
    }
    for (var i = 0; i < game.rows(); i++) {
      for (var j = 0; j < game.cols(); j++) {
        entity = entities[i][j];
        if (entity == null) continue;
        if(entity instanceof Enemy) {
          _drawEnemy(context, entity, i+1);
        } else if(entity instanceof Player) {
          _drawPlayer(context, entity);
        }
      }
    }
    _drawPlayer(context, player);
  }

  return {
    render: _render,
  };
})();

/* Physics Object
 * Controls updates to graphics based on the clock.
 */
var physics = (function() {
  function _update() {
    var entities = game.entities();
    for (var i = 0; i < game.rows(); i++) {
      for (var j = 0; j < game.cols(); j++) {
        if (entities[i][j] == null) continue;
        entities[i][j].x += entities[i][j].direction;
      }
    }
  }

  return { update: _update };
})();

/* Game
 * Main control loop for the game.
 */
var game = (function() {
  var _player;
  var _gameSettings;
  var _entities = [];
  var leftLimit = 0;
  var rightLimit = 200;
  var _rows = 5;
  var _cols = 11;
  var movementLength = 10;
  var _missiles = [];
  var deadships = 0;

  var _shootTimer = 0;

  // _start -- initializes game settings
  function _start() {
    _gameSettings = new GameSettings();
    _gameSettings.setDimensions(640, 480);
    _player = new Player(0, _gameSettings);
    var canvas = document.getElementById("game-layer");
    let ratio = 4;
    canvas.width = _gameSettings.width*ratio;
    canvas.height = _gameSettings.height*ratio;
    canvas.style.width = _gameSettings.width;
    canvas.style.height = _gameSettings.height;
    canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);

    document.onkeydown = function(e) {
      if(e.key == "ArrowRight") {
        _player.move(movementLength);
        renderer.render();
      } else if (e.key == "ArrowLeft") {
        _player.move(-movementLength);
        renderer.render();
      } else if (e.keyCode == 32) {
        if (e.target == document.body) {
          e.preventDefault();
        }
        if (_shootTimer >= 15) {
          _shootTimer = 0;
          _player.shoot();
        }
      }
    }
    
    for (var m = 0; m < _rows; m++) {
      entity_row  = []
      for (var n = 0; n < _cols; n++) {
        entity_row.push(new Enemy(m, n, _rows, _cols, _gameSettings));
      }
      _entities.push(entity_row);
    }
    console.log(_entities);
    window.requestAnimationFrame(this.update.bind(this));
  }

  // _update -- gets called by other objects when required to update
  function _update() {
    physics.update();
    _shootTimer++;
    var setReverse = false;
    for (var m = 0; m < game.missiles().length; m++) {
      if (game.missiles()[m] != null) {
        if (!game.missiles()[m].update()) {
          game.missiles()[m] = null;
        }
      }
    }
    for (var m = 0; m < _rows; m++) {
      for (var n = 0; n < _cols; n++) {
        if (_entities[m][n] == null) continue;
        if (Math.floor(Math.random() * Math.floor(500)) == 69) {
          var mdx = _rows-1;
          while (mdx >= 0 && _entities[mdx][n] == null) mdx--;
          if (m == mdx) {
            _entities[m][n].shootMissile();
          }
        }
        if (_entities[m][n].update()) {
          setReverse = true;
          break;
        }
        for (var k = 0; k < game.missiles().length; k++) {
          if (_entities[m][n] == null) break;
          if (game.missiles()[k] == null) continue;
          if (game.missiles()[k].d == 1) {
            if (game.missiles()[k].x < _entities[m][n].x+_entities[m][n].width && 
                game.missiles()[k].x > _entities[m][n].x &&
                game.missiles()[k].y < _entities[m][n].y+_entities[m][n].height &&
                game.missiles()[k].y > _entities[m][n].y) {
                  game.missiles()[k] = null;
                  _entities[m][n] = null;
                  deadships+=1;
                  if (deadships == _rows*_cols) {
                    deadships = 0;
                    levelUp()
                  }
            }
          }
        }
      }
    }
    if (setReverse) {
      for (var m = 0; m < _rows; m++) {
        for (var n = 0; n < _cols; n++) {
          if (_entities[m][n] == null) continue;
          if (_entities[m][n].advance()) {
            _endgame();
            return;
          }
        }
      }
    }

    renderer.render();
    window.requestAnimationFrame(this.update.bind(this));
  }

  // _addMissile -- all instances missiles get added to the game object
  function _addMissile(missile) {
    _missiles = _missiles.filter(function (e) {
      return e != null;
    });
    _missiles.push(missile);
  }

  // proceedLevel -- respawns the enemies and increases speed
  function levelUp() {
    _gameSettings.speed += 0.5;
    for (var m = 0; m < _rows; m++) {
      for (var n = 0; n < _cols; n++) {
        _entities[m][n] = new Enemy(m, n+1, _rows, _cols, _gameSettings);
      }
    }
  }

  // _endGame -- displays a "GAME OVER" screen
  function _endgame() {
    var canvas = document.getElementById("game-layer");
    var context = canvas.getContext("2d");
    context.fillStyle = "gray";
    context.fillRect(0, 0, canvas.width/4, canvas.height/4);
    context.fillStyle = "black";
    context.font = "30px Arial";
    context.textAlign = "center";
    context.fillText("Game Over", canvas.width/8, canvas.height/8);
  }

  return {
    gameSettings: function() {return _gameSettings; },
    player: function() { return _player; },
    start: _start,
    update: _update,
    entities: function() { return _entities; },
    rows: function() { return _rows; },
    cols: function() { return _cols; },
    missiles: function() { return _missiles },
    addMissile: _addMissile
  };
  renderer.render();
  window.requestAnimationFrame(this.update.bind(this));
})();
game.start();