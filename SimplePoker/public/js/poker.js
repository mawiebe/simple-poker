// I guess some library should have it, but keeping it here for the test.
function shuffle(array) {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

var globalPlayer = "";

var ranks = [
  "2", "3", "4", "5", "6", "7", "8", "9", "X", "J", "Q", "K", "A"
];
var rankNames = [
  "2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King", "Ace"
];

var suits = [
  "♠", "♥", "♦", "♣", "⛀", "⛂"
];
var suitColors = [
  "black", "red", "red", "black", "red", "black"
];
var suitNames = [
  "spades", "hearts", "diamonds", "clubs", "shields", "cups"
];

var Rank2 = 0;
var RankAce = 12;

var handSize = 5;

function getCard(code) {
  if (code >= ranks.length * suits.length) {
    return {
      error: "Wrong card id"
    };
  }
  var rank = code % (ranks.length);
  // Note, this only works for positive integers.
  var suit = Math.floor(code / ranks.length);
  return {
    rank: rank,
    suit: suit,
    rankName: rankNames[rank],
    suitName: suitNames[suit],
    text: '<span style="color:' + suitColors[suit] + '">' + ranks[rank] + suits[
      suit] + '</span>'
  }
}

function createGame(players, suitsToUse) {
  if (!suitsToUse) {
    suitsToUse = 4;
  }
  var deckSize = suitsToUse * ranks.length;
  var cards = [...Array(deckSize).keys()]
  // for (var i = 0; i < suitsToUse*ranks.length; i++) {
  //   cards.add[i];
  // }
  shuffle(cards);

  return {
    deck: cards,
    players: players,
    draws: {}
  };
}

function getResults(game) {
  if (!game.draws) {
    return null;
  }
  var players = [];
  var maxCombo = null;
  var minCombo = null;

  for (var i in game.players) {
    var playerId = game.players[i].id;
    if (!game.draws[playerId]) {
      return null;
    }
    var hand = getHand(game, playerId);
    var combo = getCombo(hand);
    maxCombo = (maxCombo == null || compareCombos(combo, maxCombo) > 0 ? combo: maxCombo);
    minCombo = (minCombo == null || compareCombos(combo, minCombo) < 0 ? combo: minCombo);
    players.push({
      name: game.players[i].name,
      id: game.players[i].id,
      hand: hand,
      combo: combo
    });
  }
  for (var i in players) {
    if (compareCombos(players[i].combo, maxCombo) == 0) {
      players[i].wins = true;
    }
    if (compareCombos(players[i].combo, minCombo) == 0) {
      players[i].loses = true;
    }
  }

  return players;
}


function getHand(game, playerId) {
  var playerIdx = -1;
  // If we have 4 players, then first 4*5 cards in the deck are used for the
  // initial hands, and the rest - for draw.
  var drawOffset = game.players.length * handSize;
  // Find player and find positions of their draw cardsl
  for (var idx = 0; idx < game.players.length; idx++) {
    var otherPlayerId = game.players[idx].id;
    if (otherPlayerId == playerId) {
      playerIdx = idx;
      break;
    }
    if (game.draws && game.draws[otherPlayerId]) {
      drawOffset += game.draws[otherPlayerId].length;
      count = 1;
    }
  }
  if (playerIdx == -1) {
    return {
      error: "player " + playerId + " is not playing"
    };
  }
  var hand = [];
  for (var i = 0; i < handSize; i++) {
    hand.push(game.deck[playerIdx + game.players.length * i]);
  }
  if (game.draws && game.draws[playerId]) {
    for (var i = 0; i < game.draws[playerId].length; i++) {
      count = 1;
      var discardedIndex = game.draws[playerId][i];
      hand[discardedIndex] = game.deck[drawOffset + i];
    }
  }
  return hand;
}

const HandEnum = Object.freeze({
  HighCard: 0,
  Pair: 1,
  TwoPairs: 2,
  Three: 3,
  Straight: 4,
  Flush: 5,
  FullHouse: 6,
  Four: 7,
  StraightFlush: 8
});

// Internal utility function for getCombo
function checkFlush(hand, significantRanks) {
  for (var i = 1; i < hand.length; i++) {
    if (hand[i].suit != hand[0].suit) {
      // Not flush
      return null;
    }
  }
  return {
    combination: HandEnum.Flush,
    combinationName: "Flush",
    significantRanks: significantRanks
  };
}

// Internal utility function for getCombo
function checkFlushStraight(hand, significantRanks) {
  var flushResult = checkFlush(hand, significantRanks);

  var size = hand.length;
  // Check for ace Low straight. If low card is 2 and high card is ace,
  // we only need to check low 4 cards for being consecutive.
  if (hand[0].rank == Rank2 && hand[size - 1].rank == RankAce) {
    size--;
  }

  for (var i = 1; i < size; i++) {
    if (hand[i].rank != hand[i - 1].rank + 1) {
      // Not straight => whatever flush result returned
      return flushResult;
    }
  }
  var topRank = hand[size - 1].rank;

  return {
    combination: flushResult ?
      HandEnum.StraightFlush : HandEnum.Straight,
    combinationName: flushResult ?
      (
        topRank == RankAce ?
        "Royal Flush" :
        "Straight Flush") : "Straight",
    significantRanks: [topRank]
  }
}

// Internal utility function for getCombo
function checkSameRanks(ranksInfo) {
  if (ranksInfo.hasFour) {
    return {
      combination: HandEnum.Four,
      combinationName: "Four",
      significantRanks: ranksInfo.significantRanks
    };
  }
  if (ranksInfo.hasThree) {
    if (ranksInfo.numPairs > 0) {
      return {
        combination: HandEnum.FullHouse,
        combinationName: "Full house",
        significantRanks: ranksInfo.significantRanks
      };
    } else {
      return {
        combination: HandEnum.Three,
        combinationName: "Three",
        significantRanks: ranksInfo.significantRanks
      };
    }
  }
  if (ranksInfo.numPairs > 0) {
    if (ranksInfo.numPairs > 1) {
      return {
        combination: HandEnum.TwoPairs,
        combinationName: "Two pairs",
        significantRanks: ranksInfo.significantRanks
      };
    } else {
      return {
        combination: HandEnum.Pair,
        combinationName: "Pair",
        significantRanks: ranksInfo.significantRanks
      };
    }
  }
  return null;
}

// Collects information about ranks and how they repeat
function collectRanks(hand) {
  var significantRanks = [];

  var numPairs = 0;
  var lowComboRank = -1; // [lower] pair rank for full house, two pairs or pair
  var highComboRank = -1; // rank for three or forur of a kind, or higher pair
  var hasThree = false;
  var hasFour = false;

  // We actively rely on the fact that array is sorted by rank.
  var count = 1; // size of current group of similar ranks.
  for (var i = 1; i <= hand.length; i++) {
    if (i < hand.length && hand[i].rank == hand[i - 1].rank) {
      // For matching cards we skip putting their rank in significantRanks
      count++;
    } else {
      // Non-matching card. Process previous group first.
      var rank = hand[i - 1].rank;
      switch (count) {
      case 1:
        // significantRanks will contain all non-matching ranks in descending
        // order.
        significantRanks.unshift(rank);
        break;
      case 2:
        if (numPairs == 0) {
          lowComboRank = rank;
        } else {
          highComboRank = rank;
        }
        numPairs++;
        break;
      case 3:
        hasThree = true;
        highComboRank = rank;
        break;
      case 4:
        hasFour = true;
        highComboRank = rank;
        break;
      }
      // Then processs the card itself
      count = 1;
    }
  }

  // Add ranks of combinations in the beginning of significantRanks.
  if (lowComboRank >= 0) {
    significantRanks.unshift(lowComboRank);
  }
  if (highComboRank >= 0) {
    significantRanks.unshift(highComboRank);
  }
  return {
    hasFour: hasFour,
    hasThree: hasThree,
    numPairs: numPairs,
    significantRanks: significantRanks
  }
}

//  Takes a hand as integer array and returns a object with the properties:
//  combination - HandEnum value describing the combination
//  combinationName - name for the combination
//  significantRanks - array of rank of cards in the order of significance for
//                     comparing hands.
//
// Details on significantRanks:
// For same-rank combinations (2, 2+2, 3, 3+2, 4) it will first contain ranks
// of repeating cards (3 first for 3+2, higher first for 2+2), then other cars
// in descending order. For flush and "high card" it will just contain all
// ranksin decending order. For street and street-flush it will only contain
// rank of the high card.
function getCombo(handNumbers) {
  if (handNumbers.length != handSize) {
    throw ("Hand should have 5 cards");
  }
  // Convert integer to card structures
  var hand = [];
  for (var i in handNumbers) {
    var card = getCard(handNumbers[i]);
    hand.push(card);
  }

  hand.sort(function (a, b) {
    return a.rank - b.rank
  });

  // Collect how many pairs/threes/fours the hand has
  var ranksInfo = collectRanks(hand);
  var significantRanks = ranksInfo.significantRanks;

  // Theoretically if it is flush and 2/3 of a kind, we should prefer
  // flush. But practically, this is only possible with wildcards, and
  // this algorithm does not support wildcards anyway
  var sameRankResult = checkSameRanks(ranksInfo);
  if (sameRankResult) {
    return sameRankResult;
  }

  var flushStraightResult = checkFlushStraight(hand, significantRanks);
  if (flushStraightResult) {
    return flushStraightResult;
  }

  return {
    combination: HandEnum.HighCard,
    combinationName: hand[hand.length - 1].rankName + " high",
    significantRanks: significantRanks
  };
}

function compareCombos(a, b) {
  if (a.combination != b.combination) {
    return a.combination - b.combination;
  }
  if (a.significantRanks.length != b.significantRanks.length) {
    console.error(
      "Mismatching lengths: " + JSON.stringify(a) + JSON.stringify(b));
  }
  for (var i = 0; i < a.significantRanks.length && i < b.significantRanks
    .length; i++) {
    if (a.significantRanks[i] != b.significantRanks[i]) {
      return a.significantRanks[i] - b.significantRanks[i];
    }
  }
  return 0;
}
