/* gameSettings Object
 * Specifies the sizing of the window
 */

function GameSettings() {
  this.width = 640;
  this.height = 480;
  this.speed = 2;
}

function setSpeed(x) {
  game.gameSettings().speed=x
}

GameSettings.prototype.setDimensions = function(width, height) {
  this.width = width;
  this.height = height;
}

/* Barricade Object
 * A barricade which guards a player. Takes 24 hits until destroyed.
 */

function Barricade(gs, i) {
  this.x = (gs.width / 4) * i + (gs.width / 16) * (i+1);
  this.y = game.player().y - (gs.width / 4) * 0.55 - game.player().height/4;
  this.width = gs.width / 4;
  this.height = (gs.width * 0.55) / 4;
  this.destroyed = false;
  this.health = 24;
  this.healthIncrement = this.health/3;
}

Barricade.prototype.loseDurability = function(x) {
  this.health -= x;
  if (this.health <= 0) this.destroyed = true;
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
  this.blink = false;
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
  this.padding = enemyboxwidth / 7;
  this.x = enemyboxwidth * j;
  this.y = enemyboxheight * i;
  this.width = enemyboxwidth - this.padding;
  this.height = enemyboxheight - this.padding;
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
  this.y += this.height/2 + this.padding;
  if (this.y + this.height >= game.player().y+4) {
    return true
  }
  return false
}

/* Renderer Object
 * Renders graphics using fills on the canvas.
 */

var renderer = (function () {
  // _drawBarricade -- draws the barricade object
  function _drawBarricade(context, barricade) {
    var img = document.getElementById("wall-img-" + Math.ceil(barricade.health/barricade.healthIncrement));
    context.drawImage(img, barricade.x, barricade.y, barricade.width, barricade.height);
  }

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
    for (var i = 0; i < game.barricades().length; i++) {
      if (game.barricades()[i].destroyed) continue;
      _drawBarricade(context, game.barricades()[i]);
    }
    for (var i = 0; i < game.missiles().length; i++) {
      if (game.missiles()[i] == null) continue;
      _drawMissile(context, game.missiles()[i])
    }
    for (var i = 0; i < game.rows(); i++) {
      for (var j = 0; j < game.cols(); j++) {
        entity = entities[i][j];
        if (entity == null) continue;
        _drawEnemy(context, entity, i+1);
      }
    }
    if (!player.blink) _drawPlayer(context, player);
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
  var _barricades = [];
  var leftLimit = 0;
  var rightLimit = 200;
  var _rows = 5;
  var _cols = 11;
  var movementLength = 10;
  var _missiles = [];
  var deadships = 0;
  var invulnTimer = 0;
  var invuln = false;

  var _shootTimer = 0;

  // _start -- initializes game settings
  function _start() {
    _gameSettings = new GameSettings();
    _gameSettings.setDimensions(640, 480);
    _player = new Player(0, _gameSettings);
    for (var i = 0; i < 3; i++) {
      _barricades.push(new Barricade(_gameSettings, i));
    }
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
        if (_shootTimer >= 20) {
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
    window.requestAnimationFrame(this.update.bind(this));
  }

  // _update -- gets called by other objects when required to update
  function _update() {
    physics.update();
    _shootTimer++;
    if (invuln) {
      invulnTimer++;
      if (invulnTimer >= 15 && invulnTimer < 25 ||
          invulnTimer >= 45 && invulnTimer < 50 ||
          invulnTimer >= 70 && invulnTimer < 75) {

        _player.blink = true;
          } else {
            _player.blink = false;
          }
      if (invulnTimer >= 85) {
        invulnTimer = 0;
        invuln = false;
        _player.blink = false;
      }
    }
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
        for (var i = 0; i < 3; i++) {
          if (_barricades[i].destroyed) continue;
          if (didHit(_entities[m][n], _barricades[i])) {
            _barricades[i].loseDurability(_barricades[i].healthIncrement);
            _entities[m][n] = null;
            destroyShip();
            break;
          }
        }
        for (var k = 0; k < game.missiles().length; k++) {
          if (_entities[m][n] == null) break;
          if (game.missiles()[k] == null) continue;
          
          if (game.missiles()[k].d == 1) {
            if (didHit(game.missiles()[k], _entities[m][n])) {
              game.missiles()[k] = null;
              _entities[m][n] = null;
              destroyShip();
            } else {
              for (var i = 0; i < 3; i++) {
                if (_barricades[i].destroyed) continue;
                if (didHit(game.missiles()[k], _barricades[i])) {
                  game.missiles()[k] = null;
                  break;
                }
              }
            }
          } else if (game.missiles()[k].d == -1) {
            if (didHit(game.missiles()[k], _player)) {
              game.missiles()[k] = null;
              invuln = true;
            } else {
              for (var i = 0; i < 3; i++) {
                if (_barricades[i].destroyed) continue;
                if (didHit(game.missiles()[k], _barricades[i])) {
                  game.missiles()[k] = null;
                  _barricades[i].loseDurability(1);
                  break;
                }
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

  // didHit -- returns true if entity X and Y collide
  function didHit(a, b) {
    return (((a.x < b.x + b.width && a.x > b.x) || (a.x + a.width < b.x + b.width && a.x + a.width > b.x)) &&
            ((a.y < b.y + b.height && a.y > b.y) || (a.y + a.height < b.y + b.height && a.y + a.height > b.y)));
  }

  // proceedLevel -- respawns the enemies and increases speed
  function levelUp() {
    _gameSettings.speed += 0.5;
    for (var m = 0; m < _rows; m++) {
      for (var n = 0; n < _cols; n++) {
        _entities[m][n] = new Enemy(m, n+1, _rows, _cols, _gameSettings);
      }
    }
    for (var i = 0; i < 3; i++) {
      _barricades[i] = new Barricade(_gameSettings, i);
    }
  }

  // destroyShip -- controls destruction of enemy objects
  function destroyShip() {
    deadships+=1;
    if (deadships == _rows*_cols) {
      deadships = 0;
      levelUp()
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
    barricades: function() { return _barricades; },
    rows: function() { return _rows; },
    cols: function() { return _cols; },
    missiles: function() { return _missiles },
    addMissile: _addMissile
  };
  renderer.render();
  window.requestAnimationFrame(this.update.bind(this));
})();
game.start();