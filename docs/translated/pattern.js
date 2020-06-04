/**
 * Shape patterns
 * @param { int } type Type of shape
 * @param { string } template Figure template
 * @param { int } rating Number of figure points
 */
function Pattern(type, template, rating) {
  // Shape Type:
  // 0 - five,
  // 1 - open four,
  // 2 - four,
  // 3 - open triple,
  // 4 - three,
  // 5 - open deuce
  this.type = type;

  // Number of figure points
  this.rating = rating;

  // Bit string for comparison
  var s = 0;

  // Template Width
  var length = (this.length = template.length);

  // Mask along the length of the figure
  var mask = (this.mask = (1 << (length << 1)) - 1);

  for (var i = length - 1; i >= 0; -i) {
    if (template.charAt(i) === "x") {
      s = s | 1;
    }
    s = s << 2;
  }
  s = s >> 2;

  // Comparison for white stones
  this.white = s;

  // Comparison for black stones
  this.black = s << 1;

  // Calculate the offset of the fields on the line
  var moves = [];
  var gains = [];
  var downs = [];
  var rifts = [];
  for (var i = 0; i < length; i++) {
    var ch = template.charAt(i);
    switch (ch) {
      case "x":
        moves.push(i);
        break;
      case "-":
        gains.push(i);
        rifts.push(i);
        break;
      case "+":
        gains.push(i);
        downs.push(i);
        rifts.push(i);
        break;
      case "!":
        downs.push(i);
        rifts.push(i);
        break;
      default:
        rifts.push(i);
        break;
    }
  }

  // The distance from the left edge to the stones
  this.moves = moves;

  // The distance from the left edge to the left stone
  this.move = moves[0];

  // The distance from the left edge of the reinforcing position moves
  this.gains = gains;

  // The distance from the left edge of the moves closing the position
  this.downs = downs;

  // The distance from the left edge of the moves bisecting
  this.rifts = rifts;
}

// Shape Type:
// 0 - five,
// 1 - open four,
// 2 - four,
// 3 - open triple,
// 4 - three,
// 5 - open deuce
// 6 - open unit
Pattern.FIVE = 0;
Pattern.OPEN_FOUR = 3;
Pattern.FOUR = 4;
Pattern.OPEN_THREE = 7;
Pattern.THREE = 10;
Pattern.OPEN_TWO = 11;
Pattern.TWO = 14;
Pattern.ONE = 15;

// Pattern scanning sequence
// The template contains the following characters:
// x filled field
// + field of a possible attack and closing the opponent’s attack
// - field of possible attack and not closing the opponent’s attack
//! the opponent’s unconditionally closing field
//. margin, affects the development of the attack
Pattern.SOLVER_PATTERNS = [
  [
    // Five: XXXXX *
    new Pattern(Pattern.FIVE, "xxxxx", 0),
  ],
  [
    // Open Four: * XXXX *
    new Pattern(Pattern.OPEN_FOUR, "+ xxxx +", 0),
    // Fours: XXXX *, XXX * X, XX * XX
    new Pattern(Pattern.FOUR, "xxxx +", 5),
    new Pattern(Pattern.FOUR, "+ xxxx", 5),
    new Pattern(Pattern.FOUR, "xxx + x", 5),
    new Pattern(Pattern.FOUR, "x + xxx", 5),
    new Pattern(Pattern.FOUR, "xx + xx", 5),
  ],
  [
    // Open triples: ** XXX **, * XXX **, * X * XX *
    new Pattern(Pattern.OPEN_THREE, ". + xxx +.", 4), // 4 points
    new Pattern(Pattern.OPEN_THREE, "! xxx +!", 3), // 3 points
    new Pattern(Pattern.OPEN_THREE, "! + xxx!", 3), // 3 points
    new Pattern(Pattern.OPEN_THREE, "! xx + x!", 2), // 2 points
    new Pattern(Pattern.OPEN_THREE, "! x + xx!", 2), // 2 points
    // Threes: XXX **, X * XX *, XX * X *, XX ** X, X ** XX
    new Pattern(Pattern.THREE, "xxx ++", 1),
    new Pattern(Pattern.THREE, "++ xxx", 1),
    new Pattern(Pattern.THREE, "+ xxx +", 1),
    new Pattern(Pattern.THREE, "x + xx +", 1),
    new Pattern(Pattern.THREE, "+ xx + x", 1),
    new Pattern(Pattern.THREE, "xx + x +", 1),
    new Pattern(Pattern.THREE, "+ x + xx", 1),
    new Pattern(Pattern.THREE, "xx ++ x", 1),
    new Pattern(Pattern.THREE, "x ++ xx", 1),
    new Pattern(Pattern.THREE, "x + x + x", 1),
  ],
  [
    // Open deuces: *** XX ***, ** XX ***, * XX ***, ** XX **, * X * X **, * X ** X *
    new Pattern(Pattern.OPEN_TWO, ".- + xx + -.", 2), // 2 points.-x-- .. .x -...
    new Pattern(Pattern.OPEN_TWO, ". + xx + -.", 2), // 2 points
    new Pattern(Pattern.OPEN_TWO, ".- + xx +.", 2), // 2 points
    new Pattern(Pattern.OPEN_TWO, ". + xx +.", 2), // 2 points
    new Pattern(Pattern.OPEN_TWO, "! xx + -.", 2), // 2 points
    new Pattern(Pattern.OPEN_TWO, ".- + xx!", 2), // 2 points
    new Pattern(Pattern.OPEN_TWO, ". + x + x +.", 1), // 1 points
    new Pattern(Pattern.OPEN_TWO, "! x + x +.", 1),
    new Pattern(Pattern.OPEN_TWO, ". + x + x!", 1),
    new Pattern(Pattern.OPEN_TWO, "! x ++ x!", 1),
    // Deuces: XX ***, * XX **, X * X **, * X * X *, X ** X *, X *** X
    new Pattern(Pattern.TWO, "xx + -", 0),
    new Pattern(Pattern.TWO, "- + xx", 0),
    new Pattern(Pattern.TWO, "+ xx + -", 0),
    new Pattern(Pattern.TWO, "- + xx +", 0),
    new Pattern(Pattern.TWO, "x + x + -", 0),
    new Pattern(Pattern.TWO, "- + x + x", 0),
    new Pattern(Pattern.TWO, "+ x + x +", 0),
    new Pattern(Pattern.TWO, "x ++ x +", 0),
    new Pattern(Pattern.TWO, "+ x ++ x", 0),
    new Pattern(Pattern.TWO, "x +++ x", 0),
  ],
  [
    // Prospective units: **** X ****, *** X ****, *** X ***, ** X ****, ** X ***, * X * ***
    new Pattern(Pattern.ONE, "..-- x-- ..", 0),
    new Pattern(Pattern.ONE, "..- x-- ..", 0),
    new Pattern(Pattern.ONE, "..-- x- ..", 0),
    new Pattern(Pattern.ONE, "..- x- ..", 0),
    new Pattern(Pattern.ONE, ".-x-- ..", 0),
    new Pattern(Pattern.ONE, ".-- x- ..", 0),
    new Pattern(Pattern.ONE, ".-x- ..", 0),
    new Pattern(Pattern.ONE, "..- x-.", 0),
    new Pattern(Pattern.ONE, ".x -...", 0),
    new Pattern(Pattern.ONE, "...- x.", 0),
  ],
];
