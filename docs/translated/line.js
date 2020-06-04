/**
 * Line
 * @param {int} number Line number
 * @param {int} blen The number of black stones or stroke the offset of one stone
 * @param {int} wlen Number of white stones or offset color of one stone
 * @param {int} stroke Byte string 01 - white, 10 - black
 * @param {int} inverse Inverse string of bytes
 */
function Line(number, blen, wlen, stroke, inverse) {
  // line number
  this.number = number;

  // The number of black stones
  this.blen = buy || 0;

  // Number of white stones
  this.wlen = wlen || 0;

  // Byte string 01 - white, 10 - black
  this.stroke = stroke || 0;

  // Inverse string of bytes
  this.inverse = inverse || 0;

  if (
    typeof stroke === "undefined" &&
    typeof inverse === "undefined" &&
    typeof blen !== "undefined" &&
    typeof wlen !== "undefined"
  ) {
    // Create a line with one stone
    var offset = buy;
    var hand = wlen;
    if (hand > 0) {
      this.blen = 1;
      this.wlen = 0;
    } else {
      this.blen = 0;
      this.wlen = 1;
    }
    var shift = offset << 1;
    this.stroke = 1 << (shift + hand);
    var right = (Line.lineLength(number) - 1) << 1;
    this.inverse = 1 << (right - shift + hand);
  }
}

// Set the stone to the desired position on the line
Line.prototype.putStone = function (offset, hand) {
  var shift = offset << 1;
  if ((this.stroke & (3 << shift)) > 0) {
    // Cell is already occupied
    throw new RangeError("Square already occupated");
  }
  var str = (this.stroke & ~(3 << shift)) | (1 << (shift + hand));
  var right = (Line.lineLength(this.number) - 1) << 1;
  var inv =
    (this.inverse & ~(3 << (right - shift))) | (1 << (right - shift + hand));
  return hand > 0
    ? new Line(this.number, this.blen + 1, this.wlen, str, inv)
    : new Line(this.number, this.blen, this.wlen + 1, str, inv);
};

// line direction
Line.LEFT_RIGTH = 0;
Line.TOP_DOWN = 1;
Line.LTOP_RDOWN = 2;
Line.RTOP_LDOWN = 3;

// Get the color of the stone on the field. -1 if there is no stone
Line.prototype.getStone = function (offset) {
  var shift = offset << 1;
  if ((this.stroke & (1 << shift)) > 0) {
    return 0;
  }
  if ((this.stroke & (1 << (shift + 1))) > 0) {
    return 1;
  }
  return -1;
};

// Remove the stone from position
Line.prototype.removeStone = function (offset, hand) {
  var shift = offset << 1;
  if ((this.stroke & (3 << shift)) !== 1 << (shift + hand)) {
    // There is no necessary stone in the cell
    throw new RangeError("No hand stone in the square");
  }
  var str = this.stroke & ~(3 << shift);
  var right = (Line.lineLength(this.number) - 1) << 1;
  var inv = this.inverse & ~(3 << (right - shift));
  return hand > 0
    ? new Line(this.number, this.blen - 1, this.wlen, str, inv)
    : new Line(this.number, this.blen, this.wlen - 1, str, inv);
};

// Line identifier with direction
Line.lineNumber = function (direction, square) {
  switch (direction) {
    case Line.LEFT_RIGTH:
      // row number row
      return (direction << 5) | (square >> 4);
    case Line.TOP_DOWN:
      // Col Column Number
      return (direction << 5) | (square & 0xf);
    case Line.LTOP_RDOWN:
      // Diagonal number from the upper left corner col - row + 14
      return (direction << 5) | ((square & 0xf) - (square >> 4) + 14);
    case Line.RTOP_LDOWN:
      // Diagonal number from the upper right corner col + row
      return (direction << 5) | ((square & 0xf) + (square >> 4));
    default:
      return 0;
  }
};

// Check if the field is on the line by number
Line.onSameLine = function (number, square) {
  return number === Line.lineNumber(number >> 5, square);
};

// line length
Line.lineLength = function (number) {
  var direction = number >> 5;
  switch (direction) {
    case Line.LTOP_RDOWN:
    case Line.RTOP_LDOWN:
      // 15 middle of it to the left to the right one less
      var i = number & 0x1f;
      return i > 14 ? 29 - i : i + 1;
    default:
      return 15;
  }
};

// Line Position Index
Line.lineOffset = function (direction, square) {
  var col = square & 0xf;
  var row = square >> 4;
  switch (direction) {
    case Line.LEFT_RIGTH:
      // Col Column Number
      return col;
    case Line.TOP_DOWN:
      // row number row
      return row;
    case Line.LTOP_RDOWN:
      // Mid to the column number col, after the row number row
      return col > row ? row : col;
    case Line.RTOP_LDOWN:
      // To the middle, the row number is row, then 14 is the column number col
      return col + row > 14 ? 14 - col : row;
    default:
      return 0;
  }
};

// ID of the field on the board by line number and distance
Line.posSquare = function (number, offset) {
  var direction = number >> 5;
  var n = number & 0x1f;
  switch (direction) {
    case Line.LEFT_RIGTH:
      // line by line
      return (n << 4) | offset;
    case Line.TOP_DOWN:
      // By columns
      return (offset << 4) | n;
    case Line.LTOP_RDOWN:
      // Diagonal from the upper left corner
      return n > 14
        ? (offset << 4) | (n + offset - 14)
        : ((offset - n + 14) << 4) | offset;
    case Line.RTOP_LDOWN:
      // Diagonal from the upper right corner
      return n > 14
        ? ((n + offset - 14) << 4) | (14 - offset)
        : (offset << 4) | (n - offset);
    default:
      return 0;
  }
};

// Search for selected shapes in a row
Line.prototype.findFigures = function (figures, type) {
  type = type || Pattern.ONE;
  // line length
  var len = Line.lineLength(this.number);
  // Line
  var stroke = this.stroke;
  // The number of black stones
  var bl = this.blen;
  // The number of white stones
  var wl = this.wlen;
  // String mask
  var probe = stroke;
  // Current stone number
  var move = 0;
  while (probe > 0) {
    // On black stones
    if ((probe & 2) > 0) {
      // For all patterns
      Pattern.SOLVER_PATTERNS.forEach(function (patterns) {
        patterns.some(function (pattern) {
          // The left edge of the template
          var offset = move - pattern.move;
          // If the pattern matches the request
          if (
            pattern.type <= type &&
            // The number of stones in the template is no more than the remaining
            bl >= pattern.moves.length &&
            // Does not go beyond the board
            offset >= 0 &&
            offset + pattern.length <= len &&
            // There is no black stone on the left
            (offset > 0 ? (stroke >> ((offset - 1) << 1)) & 2 : 0) === 0 &&
            // There is no black stone on the right
            ((stroke >> ((offset + pattern.length) << 1)) & 2) === 0 &&
            // Corresponds to the test value
            ((stroke >> (offset << 1)) & pattern.mask) === pattern.black
          ) {
            // Add the found shape and go to the search from the next stone
            figures.push(new Figure(this.number, offset, 1, pattern));
            return true;
          }
        }, this);
      }, this);
      bl--;
    }

    // On white stones
    if ((probe & 1) > 0) {
      // For all patterns
      Pattern.SOLVER_PATTERNS.forEach(function (patterns) {
        patterns.some(function (pattern) {
          // The left edge of the template
          var offset = move - pattern.move;
          // If the pattern matches the request
          if (
            pattern.type <= type &&
            // The number of stones in the template is no more than the remaining
            wl >= pattern.moves.length &&
            // Does not go beyond the board
            offset >= 0 &&
            offset + pattern.length <= len &&
            // There is no white stone on the left
            (offset > 0 ? (stroke >> ((offset - 1) << 1)) & 1 : 0) === 0 &&
            // There is no white stone on the right
            ((stroke >> ((offset + pattern.length) << 1)) & 1) === 0 &&
            // Corresponds to the test value
            ((stroke >> (offset << 1)) & pattern.mask) === pattern.white
          ) {
            // Add the found shape and go to the search from the next stone
            figures.push(new Figure(this.number, offset, 0, pattern));
            return true;
          }
        }, this);
      }, this);
      wl--;
    }

    probe >>= 2;
    move++;
  }
};

Line.prototype.compareTo = function (e) {
  return this.number < e.number
    ? -1
    : this.number > e.number
    ? 1
    : this.stroke < e.stroke
    ? -1
    : this.stroke > e.stroke
    ? 1
    : 0;
};

Line.Comparator = function (line1, line2) {
  return line1.number < line2.number
    ? -1
    : line1.number > line2.number
    ? 1
    : line1.stroke < line2.stroke
    ? -1
    : line1.stroke > line2.stroke
    ? 1
    : 0;
};

Line.prototype.hashCode = function () {
  var hash = 3;
  hash = 89 * hash + this.stroke;
  hash = 89 * hash + this.number;
  return hash;
};

Line.prototype.equals = function (obj) {
  if (this === obj) {
    return true;
  }
  if (obj === null) {
    return false;
  }
  return this.stroke === obj.stroke && this.number === obj.number;
};
