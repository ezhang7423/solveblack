/**
 * The figure on the board
 * @param {int} number Line number
 * @param {int} offset Offset of the beginning of the figure
 * @param {int} hand The color of the shape stones
 * @param {Pattern} pattern Pattern
 */
function Figure(number, offset, hand, pattern) {
  // Line number
  this.number = number;

  // Offset of the beginning of the figure
  this.offset = offset;

  // The color of the shape stones
  this.hand = hand;

  // Shape Pattern
  this.pattern = pattern;
}

// Shape comparison function
Figure.Comparator = function (hand) {
  return function (f1, f2) {
    return (
      (f1.hand === hand ? f1.pattern.type : f1.pattern.type + 2) -
      (f2.hand === hand ? f2.pattern.type : f2.pattern.type + 2)
    );
  };
};

// Put in collection
Figure.prototype.addMoves = function (r, cols) {
  cols = cols || this.pattern.moves;
  for (var i = 0; i < cols.length; i++) {
    var square = Line.posSquare(this.number, this.offset + cols[i]);
    if (r.indexOf(square) === -1) r.push(square);
  }
};

// Build an array of fields by relative coordinates
Figure.prototype.moves = function (cols) {
  var r = [];
  cols = cols || this.pattern.moves;
  this.addMoves(r, cols);
  return r;
};

// Is the field occupied by a figure
Figure.prototype.contains = function (square, cols) {
  cols = cols || this.pattern.moves;
  for (var i = 0; i < cols.length; i++) {
    if (square === Line.posSquare(this.number, this.offset + cols[i])) {
      return true;
    }
  }
  return false;
};

// Amplification moves
Figure.prototype.gains = function () {
  return this.moves(this.pattern.gains);
};

// Amplification moves
Figure.prototype.addGains = function (r) {
  this.addMoves(r, this.pattern.gains);
};

// Closing moves
Figure.prototype.downs = function () {
  return this.moves(this.pattern.downs);
};

// Closing moves
Figure.prototype.addDowns = function (r) {
  this.addMoves(r, this.pattern.downs);
};

// Moves that break a piece
Figure.prototype.rifts = function () {
  return this.moves(this.pattern.rifts);
};

// Moves that break a piece
Figure.prototype.addRifts = function (r) {
  this.addMoves(r, this.pattern.rifts);
};

// Check if the move is on the line
Figure.prototype.onSameLine = function (square) {
  return Line.onSameLine(this.number, square);
};
