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
var suitsToUse = 4;
var ranksLength = 13;
var deckSize = suitsToUse * ranksLength;

exports.deckSize = deckSize;

exports.shuffleDeck = function() {
  var cards = [...Array(deckSize).keys()]
  // for (var i = 0; i < suitsToUse*ranks.length; i++) {
  //   cards.add[i];
  // }
  shuffle(cards);
  return cards;
}

exports.shuffle = shuffle;
exports.handSize = 5;
