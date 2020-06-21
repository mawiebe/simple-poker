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
    return {error: error};
  }
  return userInfoSnapshot.val();
}

function checkCorrectGame(public, private){
  // TODO: implement.
  // Things to check:
  //  - number of players
  //  - only one is is dealer
  //  - people exchanged in correct order.
  //  - status corresponds to presense of draws.
  //  - presense of result
  //  - what else?
  return {};
}


async function loadGame(gid) {
  // First send two requests then await both
  var privateReq =
   admin.database().ref(shared.privateGamePath(gid)).once('value');
  var public = await
   admin.database().ref(shared.gameInfoPath(gid)).once('value');
  var private = await privateReq;

  if (!public || !private || !public.val() || !private.val()) {
    return {error: "Could not find game in the database"}
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
    return {error: "Could not get user ID"};
  }
  // Make the rest of the function async to be able to wait for database
  // data.
  return new Promise(async function(resolve, reject) {
    var uid = context.auth.uid;
    var userInfoOrError = await getUserInfo(uid);
    if (userInfoOrError.error) {
      resolve(userInfo);
      return;
    }

    var playerName = userInfoOrError.name;

    var gameRef = admin.database().ref(shared.gamePrivatePath).push({
      players: [uid]
    });
    var gid = gameRef.key;
    admin.database().ref(shared.gameInfoPath(gid)).set({
      status: shared.GameState.WaitingForStart,
      players: [
        {
          name: playerName,
          isDealer: true,
        }
      ]
    });

    admin.database().ref(shared.playersGamePath(uid, gid)).set({
      myPosition: 0
    });
    admin.database().ref(shared.userInfoPath(uid)).update({
      currentGame: gid
    });

    resolve({gid: gid});
    return;
  });
});

// Create a new round of a game. It takes an ID of a finished game, and creates
// a new game with same players but who is the dealer shifts to the next player.
// Gets user ID in auth and ID of the previous game as previousGame argument.
// exports.createNextRound = functions.https.onCall((data, context) => {
//   if (!context.auth || !context.auth.uid) {
//     return {error: "Could not get user ID"};
//   }
//   var previousGame = data.previousGame;
//   if (!previousGame) {
//     return {error: "Wrong previous game ID"};
//   }
//
//   // Make the rest of the function async to be able to wait for database
//   // data.
//   return new Promise(async function(resolve, reject) {
//     var uid = context.auth.uid;
//     var oldGame = await loadGame(previousGame);
//     if (oldGame.error) {
//       resolve(oldGame);
//       return;
//     }
//     if (oldGame.public.status != shared.GameState.Showdown) {
//       resolve({error: "Can not play next round of unfinished game"});
//       return;
//     }
//
//     // TODO: check current user was in the game.
//     var deck = poker.shuffleDeck();
//     var gameRef = admin.database().ref(shared.gamePrivatePath).push({
//       players: oldGame.private.players,
//       cards: {deck: deck}
//     });
//     var gid = gameRef.key;
//
//     // Fill in public part of the game
//     var gamePub = {
//       status: GameState.WaitingForTurn,
//       players: []
//     }
//     var isDealer =
//       oldGame.public.players[oldGame.public.players.length-1].isDealer;
//     for (int i = 0; i < oldGame.public.players.length; i++) {
//       var oldPlayer = oldGame.public.players[i];
//       gamePub.players.push({
//         name: oldPlayer.name,
//         isDealer: isDealer,   // Dealer is shifted by one
//         previousResult:oldPlayer.result
//       });
//       isDealer = oldPlayer.isDealer;
//     }
//     admin.database().ref(shared.gameInfoPath(gid)).set(gamePub);
//
//     // Fill in private part of the game
//     for (var i in oldGame.private.players) {
//       var uid = oldGame.private.players[i];
//       admin.database().ref(shared.playersGamePath(uid, gid)).set({
//         myPosition: i,
//         // Theoretically we should pick every 5h card but if cards are
//         // shuffled randomly it does not matter.
//         hand: deck.slice(i*poker.handSize, (i+1)*poker.handSize);
//       });
//       admin.database().ref(shared.userInfoPath(uid)).update({
//         currentGame: gid
//       });
//     }
//     // Return ID of the new game
//     resolve({gid: gid});
//     return;
//   });
// });

// Function for a user to join a game.
// Takes user ID in auth and game ID in gid argument
exports.joinGame = functions.https.onCall((data, context) => {
  if (!context.auth || !context.auth.uid) {
    return {error: "Could not get user ID"};
  }
  var gid = data.gid;
  if (!gid) {
    return {error: "No game specified"}
  }
  // Make the rest of the function async to be able to wait for database
  // data.
  return new Promise(async function(resolve, reject) {
    var uid = context.auth.uid;
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
      resolve({error: "Can not join started game"});
      return;
    }

    var uids = game.private.players;
    if (!uids) {
      resolve({error: "Game without players"});
      return;
    }

    for (i in uids) {
      if (uids[i] == uid) {
        // Todo: switch current game
        resolve({error: "You already joined."});
        return;
      }
    }

    // Add a player uid to private game info
    var index = uids.length;
    if (!index || !Number.isInteger(index) || index < 1) {
      resolve({error : "Wrong players number: " + JSON.stringify(index)});
      return;
    }

    admin.database().ref(shared.privateGamePath(gid)).child("players").update({
        [index]: uid
    });

    admin.database().ref(shared.gameInfoPath(gid)).child("players").update({
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

// A function for a user to exchange cards. Checks that it's user's turn and
// that the user is in the game.
// Takes user ID in auth, game ID in gid argument and discarded cards in
// discarded argument
// 'discarded' should be a map with the keys being 0-based indices of discarded
// cards. E.g. {0:1, 1:1, 3:1} will discard first, second and fourth card
// in the hand. Value in the map does not matter.
// exports.exchangeCards = functions.https.onCall((data, context) => {
//   if (!context.auth || !context.auth.uid) {
//     return {error: "Could not get user ID"};
//   }
//   if (!data.gid) {
//     return {error: "No game specified"}
//   }
//   var cards = {};
//   if (data.discarded) {
//     for (var i in data.discarded) {
//       if (Number.isInteger(i) && i > 0 && i < poker.handSize) {
//         cards[i] = 1;
//       } else {
//         return {error: "Incorrect card to exchange: " + JSON.stringify(i)}
//       }
//     }
//   }
//
// });
