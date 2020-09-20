const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const shared = require('./shared');
const poker = require('./poker');

async function getUserInfo(uid) {
  var userInfoSnapshot = await admin.database().ref(
    shared.userInfoPath(uid)).once('value');
  if (!userInfoSnapshot || !userInfoSnapshot.val() ||
    !userInfoSnapshot.val().name) {
    var error = "Could not find user information. Snapshot is ";
    if (userInfoSnapshot) {
      error += "not null. UserInfo is " +
        JSON.stringify(userInfoSnapshot.val());
    } else {
      error += "null";
    }
    return {
      error: error
    };
  }
  return userInfoSnapshot.val();
}

function checkCorrectGame(public, private) {
  if (!private.players || private.players.length < 1 ||
    !public.players || public.players.length < 1 ||
    private.players.length != public.players.length) {
    return {
      error: "Incorrect players length"
    }
  }
  var playersSeen = {};
  for (var i in private.players) {
    var privatePlayerInfo = private.players[i];
    if (!privatePlayerInfo || !privatePlayerInfo.uid) {
      return {
        error: "Incorrect players list"
      };
    }
    if (public.status != shared.GameState.WaitingForStart &&
      (!privatePlayerInfo.hand ||
        privatePlayerInfo.hand.length != poker.handSize)) {
      return {
        error: "Missing hand information"
      }
    }
    if (playersSeen[privatePlayerInfo.uid]) {
      return {
        error: "Player is in the game twice"
      };
    }
    playersSeen[privatePlayerInfo.uid] = 1;
  }
  var numDealers = 0;
  var numExchanged = 0;
  var previousExchanged =
      public.players[public.players.length - 1].drawSize != null;
  var previousDealer = !!public.players[public.players.length - 1].isDealer;

  var numWinners = 0;
  var numLosers = 0;
  for (var i in public.players) {
    var playerInfo = public.players[i];
    if (!playerInfo) {
      return {
        error: "Player info missing"
      };
    }
    if (playerInfo.isDealer) {
      numDealers++;
    }
    var exchanged = playerInfo.drawSize != null;
    if (exchanged) {
      numExchanged++;
    }
    if (exchanged && !previousExchanged && !previousDealer) {
      return {
        error: "player exchanged out of order"
      };
    }
    if ((playerInfo.drawSize ? playerInfo.drawSize : 0) !=
      (playerInfo.draw ? playerInfo.draw.length : 0)) {
      return {
        error: "Inconsistent draw size in database"
      };
    }

    var showdown = (public.status == shared.GameState.Showdown);
    var handExists = (playerInfo.hand != null);
    var resultExists = (playerInfo.result != null);
    if (showdown !=  handExists || showdown != resultExists) {
      return {
        error: "Hand shown at incorrect moment",
        i: i,
        showdown: showdown,
        handExists: handExists,
        resultExists: resultExists
      };
    }
    if (playerInfo.result == shared.PlayerResult.Win) {
      numWinners++;
    }
    if (playerInfo.result == shared.PlayerResult.Lose) {
      numLosers++;
    }
    previousExchanged = exchanged;
    previousDealer = playerInfo.isDealer;
  }
  if (numDealers != 1) {
    return {
      error: "Incorrect number of dealers"
    };
  }
  switch (public.status) {
  case shared.GameState.WaitingForStart:
    if (numExchanged > 0) {
      return {
        error: "Exchanged before start"
      };
    }
    break;
  case shared.GameState.WaitingForTurn:
    if (numExchanged >= public.players.length) {
      return {
        error: "Showdown did not happen"
      };
    }
    break;
  case shared.GameState.Showdown:
    if (numExchanged != public.players.length) {
      return {
        error: "Showdown happened early"
      };
    }
    if (numWinners < 1) {
      return {
        error: "No one won"
      };
    }
    // Theoretically it is possible that everyone has similar combinations.
    // In that case everyone won and no one lost.
    if (numLosers < 1 && numWinners != playerInfo.length) {
      return {
        error: "No one lost"
      };
    }
    break;
  }
  return {};
}

function checkUserInGame(uid, userGameInfo, game) {
  if (!userGameInfo) {
    return {
      error: "User not in the game" +
        JSON.stringify(userGameInfo) + " vs " + uid + " vs " + gid
    };
  }
  var index = userGameInfo.myPosition;
  if (game.private.players[index].uid != uid) {
    return {
      error: "Inconsistent user information"
    }
  }
  // Check that user did not try to cheat with cards.
  if (!!game.private.players[index].hand !=
    !!userGameInfo.hand) {
    return {
      error: "Inconsistent hand information"
    };
  }
  if (userGameInfo.hand) {
    var gameHand = game.private.players[index].hand;
    if (userGameInfo.hand.length != gameHand.length) {
      return {
        error: "Inconsistent hand information - length"
      };
    }
    for (i = 0; i < gameHand.length; i++) {
      if (userGameInfo.hand[i] != gameHand[i]) {
        return {
          error: "Inconsistent hand information - card"
        };
      }
    }
  }
  return {}
}

async function loadGame(gid) {
  // First send two requests then await both
  var privateReq =
    admin.database().ref(shared.privateGamePath(gid)).once('value');
  var public = await
  admin.database().ref(shared.gameInfoPath(gid)).once('value');
  var private = await privateReq;

  if (!public || !private || !public.val() || !private.val()) {
    return {
      error: "Could not find game in the database"
    }
  }
  var check = checkCorrectGame(public.val(), private.val());
  if (check.error) {
    return check;
  }
  return {
    public: public.val(),
    private: private.val()
  }
}

// Exported functions below

// Create empty game. It will wait for the players to join.
// Gets user ID in auth and no arguments.
exports.createGame = functions.https.onCall((data, context) => {
  if (!context.auth || !context.auth.uid) {
    return {
      error: "Could not get user ID"
    };
  }
  var uid = context.auth.uid;
  // Make the rest of the function async to be able to wait for database
  // data.
  return new Promise(async function (resolve, reject) {
    var userInfoOrError = await getUserInfo(uid);
    if (userInfoOrError.error) {
      resolve(userInfo);
      return;
    }

    var playerName = userInfoOrError.name;

    var gameRef = admin.database().ref(shared.gamePrivatePath).push({
      players: [{
        uid: uid
      }]
    });
    var gid = gameRef.key;
    admin.database().ref(shared.gameInfoPath(gid)).set({
      status: shared.GameState.WaitingForStart,
      players: [{
        name: playerName,
        isDealer: true,
      }]
    });

    admin.database().ref(shared.playersGamePath(uid, gid)).set({
      myPosition: 0
    });
    admin.database().ref(shared.userInfoPath(uid)).update({
      currentGame: gid
    });

    resolve({
      gid: gid
    });
    return;
  });
});

// Shuffles a deck and calculates player' cars.
// Poulates newCards{.deck, .deckPosition} and players[]{.uid, .hand}
function deal(newCards, oldPlayers, newPlayers) {
  newCards.deck = poker.shuffleDeck();
  newCards.deckPosition = oldPlayers.length * poker.handSize;

  for (var i = 0; i < oldPlayers.length; i++) {
    newPlayers[i] = {
      uid : oldPlayers[i].uid,
      // Theoretically we should pick every 5h card but if cards are
      // shuffled randomly it does not matter.
      hand: newCards.deck.slice(i * poker.handSize, (i + 1) * poker.handSize)
    };
  }
}

// Shuffles a deck and fills in cards in database. Also change game's status
// in DB to WaitingForTurn.
function dealAndSave(gid, game) {
  var newCards = {};
  var playersHands = [];
  deal(newCards, game.private.players, playersHands);
  admin.database().ref(shared.privateGamePath(gid))
    .child("cards").set(newCards);
  // Fill in users' cards.
  for (var i = 0; i < playersHands.length; i++) {
    admin.database().ref(shared.privateGamePath(gid))
      .child("players").child(i).child("hand").set(playersHands[i].hand);
    admin.database().ref(shared.playersGamePath(playersHands[i].uid, gid))
      .child("hand").set(playersHands[i].hand);
  }

  admin.database().ref(shared.gameInfoPath(gid)).child("status").set(
    shared.GameState.WaitingForTurn);
}

// Create a new round of a game. It takes an ID of a finished game, and creates
// a new game with same players but who is the dealer shifts to the next player.
// Gets user ID in auth and ID of the previous game as previousGame argument.
exports.createNextRound = functions.https.onCall((data, context) => {
  if (!context.auth || !context.auth.uid) {
    return {error: "Could not get user ID"};
  }
  var previousGame = data.previousGame;
  if (!previousGame) {
    return {error: "Wrong previous game ID"};
  }

  // Make the rest of the function async to be able to wait for database
  // data.
  return new Promise(async function(resolve, reject) {
    var oldGame = await loadGame(previousGame);
    if (oldGame.error) {
      resolve(oldGame);
      return;
    }
    if (oldGame.public.status != shared.GameState.Showdown) {
      resolve({error: "Can not play next round of unfinished game"});
      return;
    }

    var players = [];
    var newCards = {};
    // Populates newCards{.deck, .deckPosition} and players[]{.uid, .hand}
    // with freshly dealt cards.
    deal(newCards, oldGame.private.players, players);

    // Create game and fill in private[hidden from players] part of the game.
    var gameRef = admin.database().ref(shared.gamePrivatePath).push({
      cards: newCards,
      players: players
    });
    var gid = gameRef.key;

    // Fill in public part of the game
    var gamePub = {
      status: shared.GameState.WaitingForTurn,
      players: []
    }
    var isDealer =
        oldGame.public.players[oldGame.public.players.length-1].isDealer;
    for (var i = 0; i < oldGame.public.players.length; i++) {
      var oldPlayer = oldGame.public.players[i];
      var player = {
        name: oldPlayer.name,  // TODO: pick fresh name from DB.
        previousResult:oldPlayer.result
      };
      if (isDealer) {
        player.isDealer = true;
      }
      gamePub.players.push(player);
      // Dealer is shifted by one
      isDealer = oldPlayer.isDealer;
    }
    admin.database().ref(shared.gameInfoPath(gid)).set(gamePub);

    // Fill in user's private information about the game
    for (var i = 0; i < players.length; i++) {
      var uid = players[i].uid;
      admin.database().ref(shared.playersGamePath(uid, gid)).set({
        myPosition: i,
        hand: players[i].hand
      });
      admin.database().ref(shared.userInfoPath(uid)).update({
        currentGame: gid
      });
    }
    // Return ID of the new game
    resolve({gid: gid});
    return;
  });
});


// Function for a user to join a game.
// Takes user ID in auth and game ID in gid argument
exports.joinGame = functions.https.onCall((data, context) => {
  if (!context.auth || !context.auth.uid) {
    return {
      error: "Could not get user ID"
    };
  }
  var uid = context.auth.uid;
  var gid = data.gid;
  if (!gid) {
    return {
      error: "No game specified"
    }
  }

  // Make the rest of the function async to be able to wait for database
  // data.
  return new Promise(async function (resolve, reject) {
    var userInfoOrError = await getUserInfo(uid);
    if (userInfoOrError.error) {
      resolve(userInfo);
      return;
    }

    var game = await loadGame(gid);
    if (game.error) {
      resolve(game);
      return;
    }

    if (game.public.status != shared.GameState.WaitingForStart) {
      resolve({
        error: "Can not join started game"
      });
      return;
    }

    for (var i in game.private.players) {
      if (game.private.players[i].uid == uid) {
        // Todo: switch current game
        resolve({
          error: "You already joined."
        });
        return;
      }
    }


    var index = game.private.players.length;
    // For standard 52 deck max number of players is 6, i.e. index = 6 is
    // already too many.
    // 1.5 coefficient is because we can shuffle the draw pile once, which
    // allows us to use it twice, so if we give out X cards to players,
    // we need X/2 extra to allow them to exchange all their cards.
    if ((index + 1) * poker.handSize * 1.5 > poker.deckSize) {
      var maxPlayers = Math.floor(poker.deckSize / poker.handSize /
        1.5);
      resolve({
        error: "Can not have more than " + maxPlayers + " players"
      });
      return;
    }

    // Add a player uid to private game info
    admin.database().ref(shared.privateGamePath(gid)).child("players")
      .update({
        [index]: {
          uid: uid
        }
      });

    admin.database().ref(shared.gameInfoPath(gid)).child("players")
      .update({
        [index]: {
          name: userInfoOrError.name,
        }
      });

    admin.database().ref(shared.playersGamePath(uid, gid)).set({
      myPosition: index
    });
    admin.database().ref(shared.userInfoPath(uid)).update({
      currentGame: gid
    });

    resolve({});
    return;
  });
});

// Function for a dealer to start a game when everyone joined.
// Takes user ID in auth and game ID in gid argument
exports.startGame = functions.https.onCall((data, context) => {
  if (!context.auth || !context.auth.uid) {
    return {
      error: "Could not get user ID"
    };
  }
  var gid = data.gid;
  if (!gid) {
    return {
      error: "No game specified"
    }
  }
  var uid = context.auth.uid;
  // Make the rest of the function async to be able to wait for database
  // data.
  return new Promise(async function (resolve, reject) {
    var game = await loadGame(gid);
    if (game.error) {
      resolve(game);
      return;
    }

    var userGameInfo = (await admin.database().ref(
      shared.playersGamePath(uid, gid)).once('value')).val();
    var checkUser = checkUserInGame(uid, userGameInfo, game);
    if (checkUser.error) {
      resolve(checkUser);
      return;
    }

    if (game.public.status != shared.GameState.WaitingForStart) {
      resolve({
        error: "Game already started"
      });
      return;
    }

    var index = userGameInfo.myPosition;
    if (!game.public.players[index].isDealer) {
      resolve({
        error: "Only dealer can start the game"
      });
      return;
    }
    dealAndSave(gid, game);
    resolve({});
    return;
  });
});

// This function assumes all inputs are sanitized, consistent and correct.
// uid - user ID
// gid - game ID
// index - user's position in game
// cards - Map {<card_to_exchange_index>-> 1}
// drawSize - number of cards to exchange
// game - {private, public} -snapshots of database from loadGame()
function exchangeCardsImpl(uid, gid, index, draw, drawSize, game) {
  // No cards to exchange, just record the turn.
  if (drawSize == 0) {
    admin.database().ref(shared.gameInfoPath(gid)).child("players")
      .child(index).child("drawSize").set(drawSize);
    return {};
  }

  // make local copy of game variables we will/might change.
  var cards = game.private.players[index].hand
  var deckPosition = game.private.cards.deckPosition;
  var discardShuffle = game.private.cards.discardShuffle;
  var discard =
      game.private.cards.discard ?
          game.private.cards.discard.slice() : [];
  // Note, cards is a map where keys are indices of cards to discard.
  for (var i in draw) {
    var oldCard = cards[i];
    if (deckPosition >= game.private.cards.deck.length) {
      // We ran out of cards, going through shuffled discard.
      if (!discardShuffle) {
        // Shuffle discard if we have not done that yet.
        discardShuffle = poker.shiffe(discard);
        discard = [];
      }
      var dspos = deckPosition - game.private.cards.deck.length;
      if (dspos >= discardShuffle.length) {
        return { error: "We somehow ran out of cards"};
      }
      cards[i] = discardShuffle[dpos];
    } else {
      // getting cards from deck
      cards[i] = game.private.cards.deck[deckPosition];
    }
    discard.push(oldCard);
    deckPosition++;
  }

  // Update private game information with new index of the deck and discard pile
  admin.database().ref(shared.privateGamePath(gid))
    .child("cards").update({
      deckPosition: deckPosition,
      discard: discard
    });
  // Save shuffled discard pile
  if (discardShuffle && !game.private.cards.discardShuffle) {
    admin.database().ref(shared.privateGamePath(gid))
      .child("cards").update({
        discardShuffle: discardShuffle
      });
  }
  // Update player's cards in private game dataset.
  admin.database().ref(shared.privateGamePath(gid))
    .child("players").child(index).child("hand").set(cards);
  // Update player's cards in private player's dataset.
  admin.database().ref(shared.playersGamePath(uid, gid)).child("hand").set(
    cards);
  // Update public game information with player's draw. Has to be the last to
  // avoid other players making move too early
  admin.database().ref(shared.gameInfoPath(gid)).child("players")
    .child(index).update({
      drawSize: drawSize,
      draw: Object.keys(draw)
    });

  return {}
}

function updateWinnerLoserInfo(info, idx, combo, isWinner) {
  if (!info.combo) {
    info.combo = combo;
    info.indices = {[idx]:1};
    return;
  }
  var cmp = poker.compareCombos(info.combo, combo);
  // After inverting the comparison result if we are counting winners,
  // the rest of the code can works as if we are counting losers.
  if (isWinner) {
    cmp = -cmp;
  }

  if (cmp == 0) {
    // Add this player to the winers/losers list.
    info.indices[idx] = 1;
  } else if (cmp > 0) {
    // Replase the winning/losing combination and players
    info.combo = combo;
    info.indices = {[idx]:1};
  }
}

function finishGame(game, gid) {
  var combos = {};

  // counters containing combo=/*object returned by getCombo*/ and
  // indices = {i->1} for all indicies that won or lost.
  var loserInfo = {}, winnerInfo = {};

  for (var i in game.private.players) {
    var hand = game.private.players[i].hand;
    var combo = poker.getCombo(hand);
    combos[i] = combo;
    updateWinnerLoserInfo(loserInfo, i, combo, false);
    updateWinnerLoserInfo(winnerInfo, i, combo, true);
  }
  for (var i in game.private.players) {
    var result;
    if (winnerInfo.indices[i]) {
      result = shared.PlayerResult.Win;
    } else if (loserInfo.indices[i]) {
      result = shared.PlayerResult.Lose;
    } else {
      result = shared.PlayerResult.Middle;
    }
    // Update public game information with player's draw. Has to be the last to
    // avoid other players making move too early
    admin.database().ref(shared.gameInfoPath(gid)).child("players")
      .child(i).update({
        result: result,
        hand: game.private.players[i].hand,
        combination: combos[i]
      });
  }
  admin.database().ref(shared.gameInfoPath(gid)).child("status").set(
    shared.GameState.Showdown);
}

// A function for a user to exchange cards. Checks that it's user's turn and
// that the user is in the game.
// Takes user ID in auth, game ID in gid argument and discarded cards in
// discarded argument
// 'discarded' should be a map with the keys being 0-based indices of discarded
// cards. E.g. {0:1, 1:1, 3:1} will discard first, second and fourth card
// in the hand. Value in the map does not matter.
exports.exchangeCards = functions.https.onCall((data, context) => {
  if (!context.auth || !context.auth.uid) {
    return {
      error: "Could not get user ID"
    };
  }
  if (!data.gid) {
    return {
      error: "No game specified"
    }
  }
  var gid = data.gid;
  var cards = {};
  var drawSize = 0;
  // Sanitize input amnd convert it from array to map {index->1}
  if (data.discarded) {
    for (var idx in data.discarded) {
      var i = data.discarded[idx];
      if (Number.isInteger(i) && i >= 0 && i < poker.handSize && !cards[i]) {
        cards[i] = 1;
        drawSize++;
      } else {
        return {
          error: "Incorrect card to exchange: " + JSON.stringify(i)
        }
      }
    }
  }
  var uid = context.auth.uid;
  // Make the rest of the function async to be able to wait for database
  // data.
  return new Promise(async function (resolve, reject) {
    var game = await loadGame(gid);
    if (game.error) {
      resolve(game);
      return;
    }

    var userGameInfo = (await admin.database().ref(
      shared.playersGamePath(uid, gid)).once('value')).val();
    var checkUser = checkUserInGame(uid, userGameInfo, game);
    if (checkUser.error) {
      resolve(checkUser);
      return;
    }

    if (game.public.status != shared.GameState.WaitingForTurn) {
      resolve({
        error: "Game has not started yet or already finished"
      });
      return;
    }

    var index = userGameInfo.myPosition;
    if (game.public.players[index].drawSize != null) {
      resolve({
        error: "You already exchanged cards"
      });
      return;
    }
    var prev =
      (index == 0 ? game.public.players.length - 1 : index -1);
    if (game.public.players[prev].drawSize == null &&
      !game.public.players[prev].isDealer) {
      resolve({
        error: "It's not your turn"
      });
      return;
    }

    var result = exchangeCardsImpl(uid, gid, index, cards, drawSize, game);
    if (result.error) {
      resolve (result);
      return;
    }
    // Dealer made the turn - game done.
    if (game.public.players[index].isDealer) {
      finishGame(game, gid);
    }
    resolve (result);
    return;
  });


});
