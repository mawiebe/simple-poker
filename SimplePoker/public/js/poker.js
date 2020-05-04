// I guess some library should have it, but keeping it here for the test.
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

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


var globalUser = "";

var ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "0", "J", "Q", "K", "A"];
var rankNames = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King", "Ace"];

var suits = ["♠", "♥", "♦", "♣", "⛀", "⛂"];
var suitColors = ["black", "red", "red", "black", "red", "black"];
var suitNames = ["spades", "hearts", "diamonds", "clubs", "shields", "cups"];

var Rank2 = 0;
var RankAce = 12;


var handSize = 5;

function getCard(code) {
  if (code >= ranks.length*suits.length) {
    return {error: "Wrong card id"};
  }
  var rank = code % (ranks.length);
  // Note, this only works for positive integers.
  var suit = Math.floor(code / ranks.length);
  return {
    rank: rank,
    suit: suit,
    rankName: rankNames[rank],
    suitName: suitNames[suit],
    text: '<span style="color:'+suitColors[suit]+'">'+ranks[rank] + suits[suit] + '</span>',
  }
}

function draw(game, userId, cards) {
  game.draws[userId] = cards;
}

function createGame(users, suitsToUse) {
  var deckSize = suitsToUse*ranks.length;
  var cards = [...Array(deckSize).keys()]
  // for (var i = 0; i < suitsToUse*ranks.length; i++) {
  //   cards.add[i];
  // }
  shuffle(cards);

  return {
    deck: cards,
    users: users,
    draws: {}
  };
}

function getHand(game, userId) {
  var userIdx = -1;
  // If we have 4 players, then first 4*5 cards in the deck are used for the
  // initial hands, and the rest - for draw.
  var drawOffset = game.users.length*handSize;
  // Find user and find positions of their draw cardsl
  for (var idx = 0; idx < game.users.length; idx++) {
    var otherUserId = game.users[idx];
    if (otherUserId == userId) {
      userIdx = idx;
      break;
    }
    if (game.draws && game.draws[otherUserId]) {
      drawOffset += game.draws[otherUserId].length;
    }
  }
  if (userIdx == -1) {
    return {error: "user " + userId + " is not playing"};
  }
  var hand = [];
  for (var i = 0; i < handSize; i++) {
    hand.push(game.deck[userIdx + game.users.length*i]);
  }
  if (game.draws && game.draws[userId]) {
    for (var i = 0; i < game.draws[userId].length; i++ ) {
      var discardedIndex = game.draws[userId][i];
      hand [discardedIndex] = game.deck[drawOffset + i];
    }
  }
  return hand;
}

function isFlush(hand) {
  for (var i = 1; i < hand.length; i++) {
    if (hand[i].suit != hand[0].suit) {
      return false;
    }
  }
  return true;
}

function checkStraight(hand) {
  var size = hand.length;
  for (var i = 1; i < size-1; i++) {
    if (hand[i].rank != hand[i-1].rank+1) {
      return {straight: false};
    }
  }
  // Ace Low straight
  if (hand[0].rank == Rank2 && hand[size - 1].rank == RankAce) {
    return {straight: true, topCard: hand[hand.length - 2]};
  }
  if (hand[size -1].rank != hand[size-2].rank+1) {
    return {straight: false};
  }

  return {straight: true, topCard: hand[size - 1]};
}

function getCombo(handNumbers) {
  var rankMap = {};
  var hand = [];
  for (var i in handNumbers) {
    var card = getCard(handNumbers[i]);
    hand.push(card);
    if (!rankMap[card.rank]) {
      rankMap[card.rank] = 1;
    } else {
      rankMap[card.rank] = rankMap[card.rank]+1;
    }
  }
  hand.sort(function(a,b) {return a.rank - b.rank});

  var numPairs = 0;
  var hasThree = false;
  var hasFour = false;
  for (var rank in rankMap) {
    switch(rankMap[rank]) {
      case 2: numPairs++; break;
      case 3: hasThree = true; break;
      case 4: hasFour = true; break;
    }
  }
  var combo;
  if (hasFour) {
    combo = "Four"
  } else if (hasThree) {
    combo = numPairs > 0 ? "Full house" : "Three"
  } else if (numPairs > 0) {
    combo = (numPairs ==  2 ? "Two pairs" : "Pair");
  } else {
    var straight = checkStraight(hand);
    var flush = isFlush(hand);
    if (straight.straight) {
      if (flush) {
        combo = straight.topCard.rank == RankAce ? "Royal Flush" : "Straight Flush";
      } else {
        combo = "Straight";
      }
    } else if (flush) {
      combo = "Flush";
    } else {
      combo = hand[hand.length - 1].rankName + " high";
    }
  }
  return combo;
}
