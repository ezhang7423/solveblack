/**
 * Vertices of the graph
 * @param { Line [] } lines Lines
 * @param { int } hand Current move
 * @param { Figure [] } figures Found figures
 * @param { int } type Maximum shape pattern
 * @param { int } count The number of stones on the board
 * @param { int } attacker Attacking side
 */
function Vertex(lines, hand, figures, type, count, attacker) {
  if (lines instanceof Layout) {
    var layout = lines;
    Layout.call(
      this,
      layout.lines,
      layout.hand,
      layout.figures,
      layout.type,
      layout.count
    );
  } else {
    Layout.apply(this, arguments.slice(0, arguments.length - 1));
  }
  // attacking side
  this.attacker = arguments[arguments.length - 1];

  // Solution Status
  // Zero - unknown, positive - win, negative - lose
  // The number of moves before losing or winning is one less than the state
  this.state = 0;

  // Position Perspective
  this.rating = 0;

  // Solution moves
  this.edges = null;
}

// Inheritance
Vertex.prototype = Object.create(Layout.prototype);
Vertex.prototype.constructor = Vertex;

// Make a position estimate
Vertex.estimate = function (
  layout,
  attacker,
  alledges,
  computetarget,
  estimatedepth
) {
  var root = new Vertex(layout.alignType(Pattern.OPEN_TWO), attacker);
  root.prepare();
  computetarget = computetarget || 35;
  var target = computetarget - root.count + 1;
  estimatedepth = estimatedepth || 17;
  var count = Math.max(Math.min(target - 2, estimatedepth), 0);
  for (var level = 0; level <= count; level++) {
    root.estimate(level, alledges, computetarget);
    if (root.state !== 0) {
      break;
    }
  }
  if (
    (attacker === layout.hand && root.state < 0) ||
    (attacker !== layout.hand && root.state > 0)
  ) {
    root.state = 0;
  }
  if (Math.abs(root.state) > target) {
    root.state = 0;
  }
  return root;
};

// Get calculated moves
Vertex.prototype.moves = function () {
  if (this.edges === null) {
    if (this.state > 0) {
      if (this.state < 4) {
        return this.gains(Pattern.FOUR);
      } else if (this.state < 6) {
        return this.gains(Pattern.OPEN_THREE);
      }
    } else if (this.state < 0) {
      if (this.state > -5) {
        return this.downs(Pattern.OPEN_FOUR);
      }
    }
  } else {
    var r = [];
    if (this.edges.length > 0) {
      var top = this.edges[0].vertex;
      this.edges.some(function (e) {
        if (e.vertex.state !== top.state) {
          return true;
        }
        r.push(e.square);
      });
    }
    return r;
  }
  return null;
};

// Prepare a position estimate
Vertex.prototype.prepare = function () {
  var top = this.top();
  if (top !== null) {
    // Your move: five, four, or open three
    if (top.hand === this.hand) {
      switch (top.pattern.type) {
        // Victory
        case Pattern.FIVE:
          this.state = 1;
          break;
        // Pobeda odnim hodom
        case Pattern.OPEN_FOUR:
        case Pattern.FOUR:
          this.state = 2;
          break;
        // Victory in three moves
        case Pattern.OPEN_THREE:
          this.state = 4;
          break;
        case Pattern.THREE:
        case Pattern.OPEN_TWO:
          // We attack - there will be a continuation
          this.state = this.attacker === this.hand ? 0 : 1;
          break;
        // No shapes to continue
        default:
          this.state = this.attacker === this.hand ? -1 : 1;
      }
    } else {
      // Strange move
      switch (top.pattern.type) {
        // lose
        case Pattern.FIVE:
          this.state = -1;
          break;
        // lose in two moves
        case Pattern.OPEN_FOUR:
          this.state = -3;
          break;
        // We will defend ourselves
        case Pattern.FOUR:
        case Pattern.OPEN_THREE:
          this.state = 0;
          break;
        // No shapes to continue
        default:
          this.state = this.attacker === this.hand ? -1 : 1;
      }
    }
  } else {
    // No shapes to continue
    this.state = this.attacker === this.hand ? -1 : 1;
  }
  // calculate the rating
  this.rating = this.rate();
};

// Build child nodes
Vertex.prototype.expand = function (alledges, computetarget) {
  // Calculate possible moves
  var moves = [];
  var top = this.top();
  // By threat level
  switch (top.pattern.type) {
    // Try to make forced moves and defend
    case Pattern.FOUR:
      moves = this.downs(Pattern.FOUR);
      break;
    // Try to attack and / or defend
    case Pattern.OPEN_THREE:
      moves = this.gains(Pattern.THREE);
      this.downs(Pattern.OPEN_THREE).forEach(function (square) {
        if (moves.indexOf(square) === -1) {
          moves.push(square);
        }
      }, this);
      break;
    default:
      // Try to attack - we are the attacking side
      moves = this.gains(Pattern.OPEN_TWO);
  }
  this.edges = [];
  moves.some(function (square) {
    // Create an edge with a vertex
    var e = this.makeEdge(square);
    // Check for sufficient search depth
    var target = computetarget - this.count + 1;
    if (Math.abs(e.vertex.state) > target) {
      e.vertex.state = 0;
      e.vertex.edges = null;
    }
    // Winning move is enough
    if (!alledges && e.vertex.state < 0) {
      this.edges = [e];
      return true;
    }
    this.edges.push(e);
  }, this);
  this.check();
};

// Create vertex
Vertex.prototype.makeMove = function (square) {
  var layout = Layout.prototype.makeMove.call(this, square);
  return new Vertex(layout, this.attacker);
};

// Create an edge with a vertex
Vertex.prototype.makeEdge = function (square) {
  var v = this.makeMove(square);
  v.prepare();
  return new Edge(square, v);
};

// Evaluation of the execution of forced moves
Vertex.prototype.estimate = function (level, alledges, computetarget) {
  // Build a child level
  if (this.state === 0 && this.edges === null && level > 0) {
    this.expand(alledges, computetarget);
  }
  // Iterate call the child level
  if (this.state === 0 && this.edges !== null && level > 1) {
    // Call the rating of the position one level lower in ranking order
    this.edges.some(function (e) {
      var v = e.vertex;
      // Only one move needed per level below
      v.estimate(level - 1, false, computetarget);
      // A winning move was found or an unplayed option was found for defense
      if (
        !alledges &&
        (v.state < 0 ||
          // Here is faster looking for victory if! = WIN and faster protection
          (this.attacker !== this.hand && v.state === 0))
      ) {
        return true;
      }
    }, this);
    this.check();
  }
};

// Check the status of child nodes
Vertex.prototype.check = function () {
  if (this.edges !== null && this.edges.length > 0 && this.state !== -128) {
    // Sort child nodes by rating
    this.edges.sort(Edge.Comparator);
    // Choose the best node from the children
    var top = this.edges[0].vertex;
    if (this.attacker === this.hand) {
      if (top.state < 0 && top.state !== -128) {
        // Winning move found
        this.state = -top.state + 1;
        // Leave the position with the best move
        var es = [];
        this.edges.some(function (edge) {
          if (edge.vertex.state !== top.state) {
            return true;
          }
          es.push(edge);
        }, this);
        this.edges = es;
      } else if (top.state > 0) {
        // Enumeration of options is completed, there is no win
        this.state = -1;
        this.edges = null;
      }
    } else {
      if (top.state < 0 && top.state !== -128) {
        // Draw found
        this.state = 1;
        this.edges = null;
      } else if (top.state > 0) {
        // Enumeration of moves completed, position lost
        this.state = -top.state - 1;
        // Leave the positions with the best move and having children
        var es = [];
        this.edges.forEach(function (edge) {
          if (edge.vertex.edges !== null || edge.vertex.state === top.state) {
            es.push(edge);
          }
        }, this);
        this.edges = es;
      }
    }
  }
};

// State comparison
// A lower value corresponds to the shortest win or
// unknowns with a high rating or the longest loss
Vertex.prototype.compareTo = function (v) {
  if (v === null) {
    return -1;
  }
  if (v.state === this.state) {
    return this.rating - v.rating;
  }
  if ((v.state >= 0 && this.state <= 0) || (v.state <= 0 && this.state >= 0)) {
    return this.state - v.state;
  } else {
    return v.state - this.state;
  }
};

Vertex.Comparator = function (v1, v2) {
  if (v1 === null) {
    return v2 === null ? 0 : 1;
  }
  return v1.compareTo(v2);
};
