function testDraw() {
  var errors = [];
  var users = [{id:'123', name:'zhenya'}, {id:'456', name:'misha'}];
  var game = createGame(users, 4);

  draw(game, '456', [0, 3]);
  draw(game, '123', [2, 3, 4]);

  var zhand = getHand(game, '123');
  var mhand = getHand(game, '456');
  // Zhenya's non-swapped cards
  expect(zhand[0] == game.deck[0], "Z1", errors);
  expect(zhand[1] == game.deck[2], "Z2", errors);
  // Zhenya first to draw, so he gets cards 11-13
  expect(zhand[2] == game.deck[10], "ZDraw1", errors);
  expect(zhand[3] == game.deck[11], "ZDraw2", errors);
  expect(zhand[4] == game.deck[12], "ZDraw3", errors);

  // Misha's non-swapped cards
  expect(mhand[1] == game.deck[3], "M2", errors);
  expect(mhand[2] == game.deck[5], "M3", errors);
  expect(mhand[4] == game.deck[9], "M5", errors);

  // Misha is second to draw, so he gets cards 14 and 15
  expect(mhand[0] == game.deck[13], "MDraw1", errors);
  expect(mhand[3] == game.deck[14], "MDraw2", errors);

  return errors;
}

function getCardId(card) {
  var rank = -1,
    suit = -1;
  for (var i = 0; i < ranks.length; i++) {
    if (card.charAt(0) == ranks[i].charAt(0)) {
      rank = i;
      break;
    }
  }
  for (var i = 0; i < suits.length; i++) {
    if (card.charAt(1) == suits[i].charAt(0)) {
      suit = i;
      break;
    }
  }
  if (rank == -1 || suit == -1) {
    throw "Could not parse " + card;
  }
  return suit * ranks.length + rank;
}

function parseHand(cards) {
  var hand = [];
  for (var i in cards) {
    hand.push(getCardId(cards[i]));
  }
  return hand;
}

function checkCombo(hand, expectedCombo, expectedName, expectedRanks, testName,
                    errors) {
  var combo = getCombo(parseHand(hand));
  expect(combo.combinationName == expectedName, testName + "-Name", errors,
    combo);
  expect(combo.combination == expectedCombo, testName + "-Combo", errors,
  combo);
  var sameRanks = (combo.significantRanks.length == expectedRanks.length);
  for (var i = 0; sameRanks && i < expectedRanks.length; i++) {
    sameRanks = (ranks[combo.significantRanks[i]] == expectedRanks[i]);
  }
  expect(sameRanks, testName + "-Ranks", errors, combo);
}

function testCombo() {
  var errors = [];
  checkCombo(["4♠", "4♥", "4♦", "4♣", "A♣"],
    HandEnum.Four, "Four", ["4", "A"], "Four", errors);

  checkCombo(["3♠", "3♥", "3♦", "2♣", "2♣"],
    HandEnum.FullHouse, "Full house", ["3", "2"], "Full house", errors);

  checkCombo(["3♠", "3♥", "3♦", "2♣", "4♣"],
    HandEnum.Three, "Three", ["3", "4", "2"], "Three", errors);

  checkCombo(["3♠", "3♥", "X♦", "2♣", "2♣"],
    HandEnum.TwoPairs, "Two pairs", ["3", "2", "X"], "Two Pairs", errors);

  checkCombo(["3♠", "4♥", "X♦", "2♣", "2♣"],
    HandEnum.Pair, "Pair", ["2", "X", "4", "3"], "Pair", errors);

  checkCombo(["3♠", "7♥", "5♦", "6♣", "4♣"],
    HandEnum.Straight, "Straight", ["7"], "Straight", errors);

  checkCombo(["A♠", "2♥", "3♦", "4♣", "5♣"],
    HandEnum.Straight, "Straight", ["5"], "Straight-A-low", errors);

  checkCombo(["X♠", "J♥", "Q♦", "K♣", "A♣"],
    HandEnum.Straight, "Straight", ["A"], "Straight-A-high", errors);

  checkCombo(["9♠", "X♠", "J♠", "Q♠", "K♠"],
    HandEnum.StraightFlush, "Straight Flush", ["K"], "Straight Flush", errors);

  checkCombo(["X♠", "J♠", "Q♠", "K♠", "A♠"],
    HandEnum.StraightFlush, "Royal Flush", ["A"], "Royal Flush", errors);

  checkCombo(["9♠", "J♠", "Q♠", "K♠", "A♠"],
    HandEnum.Flush, "Flush", ["A", "K", "Q", "J", "9"], "Flush", errors);

  checkCombo(["9♠", "J♥", "Q♠", "K♠", "A♠"],
    HandEnum.HighCard, "Ace high", ["A", "K", "Q", "J", "9"], "Ace high",
    errors);

  return errors;
}

function testCompare() {
  var errors = [];
  // straight vs three
  var straight = getCombo(parseHand(["3♠", "7♥", "5♦", "6♣", "4♣"]));
  var three = getCombo(parseHand(["3♠", "3♥", "3♦", "2♣", "4♣"]));

  expect(compareCombos(straight, three) > 0, "Straight vs 3", errors);
  expect(compareCombos(three, straight) < 0, "3 vs Straight", errors);

  // Also straight, but smaller
  var straight2 = getCombo(parseHand(["3♠", "2♥", "5♦", "6♣", "4♣"]));
  expect(compareCombos(straight, straight2) > 0, "Straight7 vs Straight6",
    errors);
  expect(compareCombos(straight2, straight) < 0, "Straight6 vs Straight7",
    errors);

  // Also straight, but different suits
  var straight3 = getCombo(parseHand(["3♥", "7♦", "5♣", "6♠", "4♠"]));
  expect(compareCombos(straight, straight3) == 0, "Straight7 vs Straight7",
    errors);

  var pair4heart = getCombo(parseHand(["4♠", "4♥", "3♦", "2♣", "A♣"]));
  // Smaller than above because K < A
  var pair4diamond = getCombo(parseHand(["4♦", "4♣", "7♦", "8♣", "K♣"]));
  expect(compareCombos(pair4heart, pair4diamond) > 0, "Pairs high first",
    errors);
  expect(compareCombos(pair4diamond, pair4heart) < 0, "Pairs low first",
  errors);

  // Same as pair4heart
  var pair4diamond2 = getCombo(parseHand(["4♦", "4♣", "3♣", "2♦", "A♦"]));
  expect(compareCombos(pair4heart, pair4diamond2) == 0, "Pairs same", errors);
  return errors;
}
