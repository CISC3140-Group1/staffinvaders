/* gameSettings Object
 * Specifies the sizing of the window
 */

function GameSettings() {
  this.width = 800;
  this.height = 600;
  this.speed = 1.0;
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

function Barricade(i) {
  this.x = (game.gameSettings().width / 5) * i + (game.gameSettings().width / 25) * (i+1);
  this.y = game.player().y - (game.gameSettings().width / 4) * 0.55 - game.player().height/4;
  this.width = game.gameSettings().width / 5;
  this.height = (game.gameSettings().width * 0.55) / 5;
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

function Player(x) {
  var playerHeight = game.gameSettings().height / 15;
  this.x = x;
  this.y = game.gameSettings().height - playerHeight * 1.2;
  this.width = playerHeight * 1.1;
  this.height = playerHeight;
  this.blink = false;
  this.movementSpeed = 10;
}

// move -- moves the player's ship d-pixels left/right
Player.prototype.move = function(d) {
  let movementLength = d * this.movementSpeed
  if (this.x+movementLength< 0) {
    this.x = 0;
  } else if (this.x+this.width+movementLength > game.gameSettings().width) {
    this.x = game.gameSettings().width-this.width;
  } else {
    this.x += movementLength;
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

function Enemy(i, j, r, c) {
  var boxwidth = game.gameSettings().width * 5 / 8;
  var enemyboxwidth = boxwidth / c;
  var enemyboxheight = enemyboxwidth * 0.9;
  this.padding = enemyboxwidth / 7;
  this.i = i;
  this.j = j;
  this.x = enemyboxwidth * j;
  this.y = enemyboxheight * i;
  this.width = enemyboxwidth - this.padding;
  this.height = enemyboxheight - this.padding;
  this.direction = game.gameSettings().speed;
}

// update -- moves enemy object left or right, swapping when it
//           hits an edge.
Enemy.prototype.update = function() {
  if (this.x <= 0 || this.x + this.width >= game.gameSettings().width) {
    return true;
  }
  return false;
}

Enemy.prototype.shoot = function() {
  if (Math.floor(Math.random() * Math.floor(500)) == 69) {
    var mdx = game.rows()-1;
    while (mdx >= 0 && game.enemies()[mdx][this.j] == null) mdx--;
    if (this.i == mdx) {
      game.addMissile(new Missile(this, -1));
    }
  }
}

// advance -- moves enemy down a level
Enemy.prototype.advance = function() {
  this.direction *= -1;
  this.y += this.height/4 + this.padding;
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
    var entity, enemies = game.enemies();
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
        entity = enemies[i][j];
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
    var enemies = game.enemies();
    for (var i = 0; i < game.rows(); i++) {
      for (var j = 0; j < game.cols(); j++) {
        if (enemies[i][j] == null) continue;
        enemies[i][j].x += enemies[i][j].direction;
      }
    }
  }

  return { update: _update };
})();

/* Game
 * Main control loop for the game.
 */
var game = (function() {
  var score = 0;
  var _player;
  var _enemies = [];
  var _barricades = [];
  var _gameSettings;
  var _rows = 5;
  var _cols = 11;
  var _missiles = [];
  var deadships = 0;
  var invulnTimer = 0;
  var invuln = false;
  var prepareEnemyAdvance = false;
  var gameover = false;
  var livesleft = 5;
  var _paused = false;

  var shootTimer = 0;

  // _start -- initializes game settings
  function _start() {
    _gameSettings = new GameSettings();
    _gameSettings.setDimensions(800, 600);
    _player = new Player(0);
    for (var i = 0; i < 4; i++) {
      _barricades.push(new Barricade(i));
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
        if (e.target == document.body) {
          e.preventDefault();
        }
        if (_paused) return;
        _player.move(1);
        renderer.render();
      } else if (e.key == "Escape") {
        if (e.target == document.body) {
          e.preventDefault();
        }
        window.location.href = "./index.html";
      } else if (e.keyCode == 80) {
        if (e.target == document.body) {
          e.preventDefault();
        }
        document.getElementById("paused").style.visibility = "visible";
        _paused = true;
      } else if (e.keyCode == 82) {
        if (e.target == document.body) {
          e.preventDefault();
        }
        document.getElementById("paused").style.visibility = "hidden";
        _paused = false;
      } else if (e.key == "ArrowLeft") {
        if (e.target == document.body) {
          e.preventDefault();
        }
        if (_paused) return;
        _player.move(-1);
        renderer.render();
      } else if (e.keyCode == 32) {
        if (e.target == document.body) {
          e.preventDefault();
        }
        if (shootTimer >= 20) {
          shootTimer = 0;
          _player.shoot();
        }
      }
    }
    
    for (var m = 0; m < _rows; m++) {
      entity_row  = []
      for (var n = 0; n < _cols; n++) {
        entity_row.push(new Enemy(m, n, _rows, _cols));
      }
      _enemies.push(entity_row);
    }
    window.requestAnimationFrame(this.update.bind(this));
  }

  // _update -- gets called by other objects when required to update
  function _update() {
    if (gameover) return;
    console.log(_paused);
    if (!_paused) {
    physics.update();
    shootTimer++;
    updateInvulnerability();
    updateMissiles();
    updateEnemies();
    if (prepareEnemyAdvance) advanceEnemy();
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
    _gameSettings.speed += 0.25;
    for (var m = 0; m < _rows; m++) {
      for (var n = 0; n < _cols; n++) {
        _enemies[m][n] = new Enemy(m, n+1, _rows, _cols, _gameSettings);
      }
    }
    for (var i = 0; i < _barricades.length; i++) {
      _barricades[i] = new Barricade(_gameSettings, i);
    }
  }

  // loseLife -- updates when player gets hit
  function loseLife() {
    if (invuln) {
      console.log("Already lost life");
      return;
    }
    invuln = true;
    document.getElementById("life-"+livesleft).style.visibility="hidden";
    livesleft--;
    if (livesleft == 0) _endgame();
  }

  // updateScore -- updates score when ship is destroyed
  function updateScore(m) {
    score += (_rows-m) * _gameSettings.speed * 10;
    document.getElementById("score").innerHTML = score;
  }

  // destroyShip -- controls destruction of enemy objects
  function destroyShip(m) {
    updateScore(m);
    deadships+=1;
    if (deadships == _rows*_cols) {
      deadships = 0;
      levelUp()
    }
  }

  // _endgame -- displays a "GAME OVER" screen
  function _endgame() {
    gameover = true;
    window.location.href = "./gameover.html";
  }


  function updateInvulnerability() {
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
  }

  function updateMissiles() {
    for (var m = 0; m < game.missiles().length; m++) {
      if (game.missiles()[m] != null) {
        if (!game.missiles()[m].update()) {
          game.missiles()[m] = null;
        }
      }
    }
  }

  function updateEnemies() {
    for (var m = 0; m < _rows; m++) {
      for (var n = 0; n < _cols; n++) {
        if (_enemies[m][n] == null) continue;
        _enemies[m][n].shoot();
        if (_enemies[m][n].update()) {
          prepareEnemyAdvance = true;
          break;
        }
        for (var i = 0; i < _barricades.length; i++) {
          if (_barricades[i].destroyed) continue;
          if (didHit(_enemies[m][n], _barricades[i])) {
            _barricades[i].loseDurability(_barricades[i].healthIncrement);
            _enemies[m][n] = null;
            destroyShip(m);
            break;
          }
        }
        for (var k = 0; k < game.missiles().length; k++) {
          if (_enemies[m][n] == null) break;
          if (game.missiles()[k] == null) continue;
          if (game.missiles()[k].d == 1) {
            if (didHit(game.missiles()[k], _enemies[m][n])) {
              game.missiles()[k] = null;
              _enemies[m][n] = null;
              destroyShip(m);
              break;
            } else {
              for (var i = 0; i < _barricades.length; i++) {
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
              loseLife();
              invuln = true;
            } else {
              for (var i = 0; i < _barricades.length; i++) {
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
  }

  function advanceEnemy() {
    for (var m = 0; m < _rows; m++) {
      for (var n = 0; n < _cols; n++) {
        if (_enemies[m][n] == null) continue;
        if (_enemies[m][n].advance()) {
          _endgame();
          return;
        }
      }
    }
    prepareEnemyAdvance = false;
  }

  return {
    gameSettings: function() {return _gameSettings; },
    player: function() { return _player; },
    start: _start,
    update: _update,
    enemies: function() { return _enemies; },
    barricades: function() { return _barricades; },
    rows: function() { return _rows; },
    cols: function() { return _cols; },
    missiles: function() { return _missiles },
    addMissile: _addMissile,
    paused: function() { return _paused }
  };
  renderer.render();
  window.requestAnimationFrame(this.update.bind(this));
})();
game.start();