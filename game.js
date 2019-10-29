// Game Entities

// Missile Object
function Missile() {
  this.x = game.player().x + game.player().width/2 - 2;
  this.y = game.player().y;
  this.width = 4;
  this.height = game.player().height/2;
  this.direction = 3;
}

Missile.prototype.update = function() {
  this.y -= this.direction;
  if (this.y <= -this.height) {
    return false;
  }
  return true;
}

// Player Object
function Player(x) {
  this.x = x;
  this.y = 180;
  this.width = 20;
  this.height = 20;
}

Player.prototype.move = function(d) {
  if (this.x+d < 0 || this.x+this.width+d > game.gameFieldWidth()) {
    return;
  }
  this.x += d;
}

Player.prototype.shoot = function() {
  game.addMissile(new Missile());
}

// Enemy Object
function Enemy(x, y) {
  this.x = x;
  this.y = y;
  this.i = -1;
  this.j = -1;
  this.width = 10;
  this.height = 6;
  this.direction = -1;
}

Enemy.prototype.update = function() {
  if (this.x <= 0 || this.x + this.width >= game.gameFieldWidth()) {
    return true;
  }
  return false;
}

Enemy.prototype.advance = function() {
  this.direction *= -1;
  this.y += 10;
  if (this.y + this.height >= game.player().y+4) {
    return true
  }
  return false
}

// Renderer
var renderer = (function () {
  function _drawEnemy(context, enemy) {
    context.fillStyle = "red";
    context.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  }

  function _drawPlayer(context, player) {
    context.fillStyle = "blue";
    context.fillRect(player.x, player.y, player.width, player.height);
  }

  function _drawMissile(context, missile) {
    context.fillStyle = "green";
    context.fillRect(missile.x, missile.y, missile.width, missile.height);
  }

  function _render() {
    var player = game.player();
    var canvas = document.getElementById("game-layer");
    var context = canvas.getContext("2d");
    context.fillStyle =  "gray";
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
          _drawEnemy(context, entity);
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

// Physics Object
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

// Game Object
var game = (function() {
  var _player = new Player(0);
  var _gameFieldHeight = 200;
  var _gameFieldWidth = 200;
  var _entities = [];
  var leftLimit = 0;
  var rightLimit = 200;
  var _rows = 5;
  var _cols = 8;
  var movementLength = 10;
  var _missiles = [];
  var deadships = 0;

  function _start() {
    document.onkeydown = function(e) {
      if(e.key == "ArrowRight") {
        _player.move(movementLength);
        renderer.render();
      } else if (e.key == "ArrowLeft") {
        _player.move(-movementLength);
        renderer.render();
      } else if (e.keyCode == 32) {
        _player.shoot();
      }
      
    }
    for (var m = 0; m < _rows; m++) {
      entity_row  = []
      for (var n = 0; n < _cols; n++) {
        entity_row.push(new Enemy(5 + (15 * n), 5 + (11 * m)));
      }
      _entities.push(entity_row);
    }
    window.requestAnimationFrame(this.update.bind(this));
  }

  function _update() {
    physics.update();
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
        if (_entities[m][n].update()) {
          setReverse = true;
          break;
        }
        for (var k = 0; k < game.missiles().length; k++) {
          if (_entities[m][n] == null) break;
          if (game.missiles()[k] == null) continue;
          if (game.missiles()[k].x < _entities[m][n].x+_entities[m][n].width && 
              game.missiles()[k].x > _entities[m][n].x &&
              game.missiles()[k].y < _entities[m][n].y+_entities[m][n].height &&
              game.missiles()[k].y > _entities[m][n].y) {
                game.missiles()[k] = null;
                _entities[m][n] = null;
                deadships+=1;
                if (deadships == 40) {
                  _endgame();
                  return;
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

  function _addMissile(missile) {
    _missiles = _missiles.filter(function (e) {
      return e != null;
    });
    _missiles.push(missile);
  }

  function _endgame() {
    var canvas = document.getElementById("game-layer");
    var context = canvas.getContext("2d");
    context.fillStyle = "gray";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "black";
    context.font = "30px Arial";
    context.textAlign = "center";
    context.fillText("Game Over", canvas.width/2, canvas.height/2);
  }

  return {
    gameFieldHeight: function() { return _gameFieldHeight; },
    gameFieldWidth: function() { return _gameFieldWidth; },
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