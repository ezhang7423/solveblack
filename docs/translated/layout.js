/**
 * Position
 * @param {Line []} lines Lines
 * @param {int} hand Current move
 * @param {Figure []} figures Found figures
 * @param {int} type Maximum shape pattern
 * @param {int} count The number of stones on the board
 */
function Layout(lines, hand, figures, type, count) {
  if (typeof lines === "object") {
    if (typeof figures === "object") {
      // Lines
      this.lines = lines;

      // Current move
      this.hand = hand;

      // Found shapes
      this.figures = figures;

      // Maximum shape pattern
      this.type = type;

      // The number of stones on the board
      this.count = count;
    } else {
      // Position constructor with batch record
      var moves = lines;
      this.type = hand || Pattern.ONE;

      if (moves && moves.length > 0) {
        this.count = moves.length;
        var h = Layout.BLACK;
        var ls = [];
        moves.forEach(function (move) {
          Layout.putStone(ls, move, h);
          h = h === Layout.BLACK ? Layout.WHITE : Layout.BLACK;
        }, this);
        ls.sort(Line.Comparator);
        this.lines = ls;
        this.hand = h;
        var fs = [];
        this.lines.forEach(function (line) {
          line.findFigures(fs, this.type);
        }, this);
        fs.sort(Figure.Comparator(this.hand));
        this.figures = fs;
      } else {
        this.count = 0;
        this.lines = [];
        this.figures = [];
        this.hand = BLACK;
      }
    }
  } else {
    // empty position constructor
    this.type = type || Pattern.ONE;
    this.count = 0;
    this.lines = [];
    this.figures = [];
    this.hand = BLACK;
  }
}

// Shape color
Layout.BLACK = 1;
Layout.WHITE = 0;

// Make a move
Layout.prototype.makeMove = function (square) {
  // One move can form two pieces on each line
  var fs = [];
  // Copy non-moving shapes
  this.figures.forEach(function (figure) {
    if (!figure.onSameLine(square)) {
      fs.push(figure);
    }
  }, this);
  var ls = this.addStone(square);
  var h = this.hand === Layout.BLACK ? Layout.WHITE : Layout.BLACK;
  ls.forEach(function (line) {
    if (Line.onSameLine(line.number, square)) {
      line.findFigures(fs, this.type);
    }
  }, this);
  fs.sort(Figure.Comparator(h));
  return new Layout(ls, h, fs, this.type, this.count + 1);
};

// Cancel move
Layout.prototype.backMove = function (square) {
  // One move can form two pieces on each line
  var fs = [];
  // Copy non-moving shapes
  this.figures.forEach(function (figure) {
    if (!figure.onSameLine(square)) {
      fs.push(figure);
    }
  }, this);
  var ls = this.removeStone(square);
  var h = this.hand === Layout.BLACK ? Layout.WHITE : Layout.BLACK;
  ls.forEach(function (line) {
    if (Line.onSameLine(line.number, square)) {
      line.findFigures(fs, this.type);
    }
  }, this);
  fs.sort(Figure.Comparator(h));
  return new Layout(ls, h, fs, this.type, this.count - 1);
};

// Get the color of the stone on the field. -1 if there is no stone
Layout.prototype.getStone = function (square) {
  var r = -1;
  if (this.lines.length > 0) {
    var number = square >> 4;
    // Search for existing lines
    var i = 0;
    var line = this.lines[0];
    while (line.number < 0x20) {
      if (line.number === number) {
        var offset = square & 0xf;
        return line.getStone(offset);
      }
      i++;
      line = this.lines[i];
    }
  }
  return r;
};

// Change the color of the next move
Layout.prototype.swapHand = function (type) {
  var h = this.hand === Layout.BLACK ? Layout.WHITE : Layout.BLACK;
  var fs = [];
  this.figures.forEach(function (figure) {
    if (figure.pattern.type <= type) {
      fs.push(figure);
    }
  }, this);
  fs.sort(Figure.Comparator(h));
  return new Layout(this.lines, h, fs, type, this.count);
};

// Get a selection with a smaller type
Layout.prototype.alignType = function (type) {
  if (this.type === type) {
    return this;
  } else if (this.type > type) {
    var fs = [];
    this.figures.forEach(function (figure) {
      if (figure.pattern.type <= type) {
        fs.push(figure);
      }
    }, this);
    fs.sort(Figure.Comparator(this.hand));
    return new Layout(this.lines, this.hand, fs, type, this.count);
  } else {
    var fs = [];
    this.lines.forEach(function (line) {
      line.findFigures(fs, type);
    }, this);
    fs.sort(Figure.Comparator(this.hand));
    return new Layout(this.lines, this.hand, fs, type, this.count);
  }
};

// Get the main shape
Layout.prototype.top = function () {
  if (this.figures.length > 0) {
    return this.figures[0];
  } else {
    return null;
  }
};

// Position score
Layout.prototype.rate = function () {
  // Calculate the number of points obtained by decision
  var rating = 0;
  this.figures.forEach(function (figure) {
    if (figure.hand === this.hand) {
      rating = rating + figure.pattern.rating;
    } else {
      rating = rating - figure.pattern.rating;
    }
  }, this);
  return rating;
};

// Attack moves to a certain level
Layout.prototype.gains = function (type) {
  var r = [];
  this.figures.forEach(function (figure) {
    if (figure.hand === this.hand && figure.pattern.type <= type) {
      figure.gains().forEach(function (square) {
        if (r.indexOf(square) === -1) r.push(square);
      });
    }
  }, this);
  return r;
};

// Defense moves to a certain level
Layout.prototype.downs = function (type) {
  var r = [];
  this.figures.forEach(function (figure) {
    if (figure.hand !== this.hand && figure.pattern.type <= type) {
      figure.downs().forEach(function (square) {
        if (r.indexOf(square) === -1) r.push(square);
      });
    }
  }, this);
  return r;
};

// Empty fields
Layout.prototype.availables = function () {
  var r = [];
  if (this.count < 1) {
    // Only the central stone
    r.push((7 << 4) | 7);
  } else if (this.count < 2) {
    // Only 1/8 taking into account symmetries without a central stone
    var right = 15;
    for (var number = 0; number < 7; number++) {
      for (var offset = 7; offset < right; offset++) {
        r.push((number << 4) | offset);
      }
      right--;
    }
  } else {
    var e = this.lines[0];
    var i = 0;
    var number = 0;
    while (e.number < 15) {
      // Add all lines to the current
      while (number < e.number) {
        for (var offset = 0; offset < 15; offset++) {
          r.push((number << 4) | offset);
        }
        number++;
      }
      // String mask
      var probe = e.stroke;
      // Current stone number
      var offset = 0;
      while (offset < 15) {
        // Stone is missing - add to list
        if ((probe & 3) === 0) {
          r.push((number << 4) | offset);
        }
        probe >>= 2;
        offset++;
      }
      number++;
      i++;
      e = this.lines[i];
    }
    // Add all empty lines to the maximum
    while (number < 15) {
      for (var offset = 0; offset < 15; offset++) {
        r.push((number << 4) | offset);
      }
      number++;
    }
  }
  return r;
};

// Add value with sort
Layout.addLine_ = function (lines, line) {
  var len = lines.length;
  var r = lines.slice(0);
  r[len] = line;
  r.sort(Line.Comparator);
  return r;
};

// Add value with sort
Layout.addLine = function (lines, line) {
  var len = lines.length;
  var n = line;
  var r = [];
  var j = 0;
  for (var i = 0; i < len; i++) {
    var m = lines[i];
    if (j === 0 && m.number > n.number) {
      r[i] = n;
      j++;
    }
    r[i + j] = m;
  }
  if (j === 0) {
    r[len] = n;
  }
  return r;
};

// Add one stone to the current position
Layout.prototype.addStone = function (square) {
  var ls = this.lines.slice(0);
  Layout.putStone(ls, square, this.hand);
  ls.sort(Line.Comparator);
  return ls;
};

// Remove the stone from position
Layout.prototype.removeStone = function (square) {
  var ls = this.linse.slice(0);
  for (var direction = 0; direction < 4; direction++) {
    var number = Line.lineNumber(direction, square);
    var offset = Line.lineOffset(direction, square);
    // Search for existing lines
    var i = 0;
    while (i < ls.length) {
      var line = ls[i];
      if (line.number === number) {
        // Remove the stone from the line
        ls[i] = line.removeStone(
          offset,
          this.hand === Layout.BLACK ? Layout.WHITE : Layout.BLACK
        );
        break;
      }
      i++;
    }
  }
  // Remove extra lines
  var rs = [];
  ls.forEach(function (line) {
    if (line.stroke !== 0) {
      rs.push(line);
    }
  }, this);
  return rs;
};

// Set the stone to the desired position on all lines
Layout.putStone = function (lines, square, hand) {
  // Add lines to the directions
  for (var direction = 0; direction < 4; direction++) {
    var number = Line.lineNumber(direction, square);
    var offset = Line.lineOffset(direction, square);
    // Search for existing lines
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (line.number === number) {
        lines[i] = line.putStone(offset, hand);
        break;
      }
      i++;
    }
    // Line Not Found - Add New
    if (i === lines.length) {
      lines.push(new Line(number, offset, hand));
    }
  }
};

// The hash is the same for 8 transpositions
Layout.prototype.hashCode = function () {
  if (this.lines.length === 0) {
    return 3 * 89 * 89;
  }
  var h0 = 5;
  var h1 = 5;
  var h2 = 5;
  var h3 = 5;
  var i = 0;
  var e = this.lines[0];
  while (e.number < 0x20) {
    h0 = 37 * h0 + e.number;
    х0 = 37 * х0 + (e.stroke ^ e.inverse);
    i++;
    e = this.lines[i];
  }
  while (e.number < 0x40) {
    h2 = 37 * h2 + (e.number & 0x1f);
    h2 = 37 * h2 + (e.stroke ^ e.inverse);
    i++;
    e = this.lines[i];
  }
  i--;
  e = this.lines[i];
  while (e.number >= 0x20) {
    h3 = 37 * h3 + (14 - (e.number & 0x1f));
    h3 = 37 * h3 + (e.stroke ^ e.inverse);
    i--;
    e = this.lines[i];
  }
  while (true) {
    h1 = 37 * h1 + (14 - e.number);
    h1 = 37 * h1 + (e.stroke ^ e.inverse);
    i--;
    if (i < 0) {
      break;
    }
    e = this.lines[i];
  }
  var hash = 3;
  hash = hash * 89 + this.lines.length;
  hash = hash * 89 + (h0 ^ h1 ^ h2 ^ h3);
  return hash;
};

// Compare strings in 4 directions
Layout.checkLines = function (ls0, ofs0, ls1, ofs1, count) {
  var r = 0;
  var e = ls0[ofs0];
  var e1 = ls1[ofs1];
  if (e.number === (e1.number & 0x1f)) {
    if (e.stroke === e1.stroke) {
      r = r | 1;
    }
    if (e.stroke === e1.inverse) {
      r = r | 2;
    }
  }
  e1 = ls1[ofs1 + count - 1];
  if (e.number === 14 - (e1.number & 0x1f)) {
    if (e.stroke === e1.stroke) {
      r = r | 4;
    }
    if (e.stroke === e1.inverse) {
      r = r | 8;
    }
  }
  if (r === 0) {
    return -1;
  }
  for (var i = 1; i < count; i++) {
    e = ls0[ofs0 + i];
    e1 = ls1[ofs1 + i];
    if (e.number === (e1.number & 0x1f)) {
      if (e.stroke !== e1.stroke) {
        r = r & ~1;
      }
      if (e.stroke !== e1.inverse) {
        r = r & ~2;
      }
    } else {
      r = r & ~3;
    }
    e1 = ls1[ofs1 + count - 1 - i];
    if (e.number === 14 - (e1.number & 0x1f)) {
      if (e.stroke !== e1.stroke) {
        r = r & ~4;
      }
      if (e.stroke !== e1.inverse) {
        r = r & ~8;
      }
    } else {
      r = r & ~12;
    }
    if (r === 0) {
      return -1;
    }
  }
  return (r & 1) > 0 ? 0 : (r & 2) > 0 ? 6 : (r & 4) > 0 ? 2 : 4;
};

// Cell transformation
Layout.transSquare = function (square, transCode, back) {
  switch (transCode) {
    case 1:
      return ((square & 0xf) << 4) | (square >> 4);
    case 2:
      return ((14 - (square >> 4)) << 4) | (square & 0xf);
    case 3:
      if (back) {
        return ((14 - (square & 0xf)) << 4) | (square >> 4);
      } else {
        return ((square & 0xf) << 4) | (14 - (square >> 4));
      }
    case 4:
      return ((14 - (square >> 4)) << 4) | (14 - (square & 0xf));
    case 5:
      return ((14 - (square & 0xf)) << 4) | (14 - (square >> 4));
    case 6:
      return (square & 0xf0) | (14 - (square & 0x0f));
    case 7:
      if (back) {
        return ((square & 0xf) << 4) | (14 - (square >> 4));
      } else {
        return ((14 - (square & 0xf)) << 4) | (square >> 4);
      }
    default:
      return square;
  }
};

// Get the transposition number
Layout.prototype.transCode = function (layout) {
  if (layout === null) {
    return -1;
  }
  var ls = layout.lines;
  if (ls.length !== this.lines.length) {
    return -1;
  }
  // Empty positions are the same
  if (this.lines.length === 0) {
    return 0;
  }
  // Without changing directions
  var n = 0;
  var e = this.lines[0];
  while (e.number < 0x20) {
    n++;
    e = this.lines[n];
  }
  var n1 = 0;
  var e1 = ls[0];
  while (e1.number < 0x20) {
    n1++;
    e1 = ls[n1];
  }
  if (n === n1) {
    var r = checkLines(this.lines, 0, ls, 0, n);
    if (r >= 0) {
      return r;
    }
  }
  // With replacement of directions
  var m1 = 0;
  while (e1.number < 0x40) {
    m1++;
    e1 = ls[n1 + m1];
  }
  if (n === m1) {
    var r = checkLines(this.lines, 0, ls, n1, n);
    if (r >= 0) {
      return r + 1;
    }
  }
  return -1;
};

Layout.transMultiple = (function () {
  var mirror = [6, 3, 4, 1, 2, 7, 0, 5];
  var turn = [0, 3, 2, 1, 2, 1, 0, 3];
  var rotate0 = [0, 3, 4, 7];
  var rotate1 = [6, 5, 2, 1];

  return function (tranCode1, tranCode2) {
    // Mirror Image
    if (
      tranCode2 === 6 ||
      tranCode2 === 5 ||
      tranCode2 === 2 ||
      tranCode2 === 1
    ) {
      tranCode1 = mirror[tranCode1];
    }
    // Number of turns
    var rotor = (turn[tranCode1] + turn[tranCode2]) % 4;
    if (
      tranCode1 === 6 ||
      tranCode1 === 5 ||
      tranCode1 === 2 ||
      tranCode1 === 1
    ) {
      return rotate1[rotor];
    } else {
      return rotate0[rotor];
    }
  };
})();

// Equality Given Transpositions
Layout.prototype.equals = function (obj) {
  if (this === obj) {
    return true;
  }
  if (obj === null) {
    return false;
  }
  if (this.hand !== obj.hand) {
    return false;
  }
  return transCode(obj) >= 0;
};
