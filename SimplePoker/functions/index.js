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


// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.createGame = functions.https.onCall((data, context) => {
  if (!context.auth || !context.auth.uid) {
    return {error: "Could not get user ID"};
  }
  // Make the rest of the function async to be able to wait for database
  // data.
  return new Promise(async function(resolve, reject) {
    var uid = context.auth.uid;
    var userInfoOrError = getUserInfo(uid);
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
  });
});

exports.createNextRound = functions.https.onCall((data, context) => {
  if (!context.auth || !context.auth.uid) {
    return {error: "Could not get user ID"};
  }
  var previousGame = data.previousGame;
  if (!previousGame) {
    return {error: "Wrong previous game ID"};
  }

  return new Promise(async function(resolve, reject) {
    var uid = context.auth.uid;
    var oldGame = loadGame(previousGame);
    if (oldGame.error) {
      resolve(oldGame);
    }
    if (oldGame.public.status != GameState.Showdown) {
      resolve({error: "Can not play next round of unfinished game"});
    }
    // TODO: check current user was in the game.
    var deck = poker.shuffleDeck();
    var gameRef = admin.database().ref(shared.gamePrivatePath).push({
      players: oldGame.private.players,
      cards: {deck: deck}
    });
    var gid = gameRef.key;
    var gamePub = {
      status: GameState.WaitingForTurn;
      players: []
    }
    var isDealer =
      oldGame.public.players[oldGame.public.players.length-1].isDealer;
    for (int i = 0; i < oldGame.public.players.length; i++) {
      var oldPlayer = oldGame.public.players[i];
      gamePub.players.push({
        name: oldPlayer.name,
        isDealer: isDealer,   // Dealer is shifted by one
        previousResult:oldPlayer.result
      });
      isDealer = oldPlayer.isDealer;
    }
    admin.database().ref(shared.gameInfoPath(gid)).set(gamePub);
    for (var i in oldGame.private.players) {
      var uid = oldGame.private.players[i];
      admin.database().ref(shared.playersGamePath(uid, gid)).set({
        myPosition: i,
        // Theoretically we should pick every 5h card but if cards are
        // shuffled randomly it does not matter.
        hand: deck.slice(i*poker.handSize, (i+1)*poker.handSize);
      });
      admin.database().ref(shared.userInfoPath(uid)).update({
        currentGame: gid
      });
    }

    resolve({gid: gid});
  }
