const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const shared = require('./shared');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.createGame = functions.https.onCall((data, context) => {
  if (!context.auth || !context.auth.uid) {
    return {error: "Could not get user ID"};
  }

  return new Promise(async function(resolve, reject) {
    var uid = context.auth.uid;
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
      resolve({error: error});
      return;
    }
    var playerName = userInfoSnapshot.val().name;

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

// exports.createNextRound = functions.https.onCall((data, context) => {
//   if (!context.auth || !context.auth.uid) {
//     return {error: "Could not get user ID"};
//   }
//   var previousGame = data.previousGame;
//   if (!previousGame) {
//     return {error: "Wrong previous game ID"};
//   }
//
//   return new Promise(async function(resolve, reject) {
//     var uid = context.auth.uid;
//
//     // Start both request then wait for both to let them run in parallel
//     var privateGamePromise =
//       admin.database().ref(shared.privateGamePath(gid)).once('value');
//     var gamePubInfoPromise =
//       admin.database().ref(shared.gameInfoPath(gid)).once('value');
//
//     var privateSnapshot = await privateGamePromise;
//     if (!privateSnapshot || !privateSnapshot.val()) {
//       resolve("Could not find the game (#1)")
//       return;
//     }
//     // Make sure it was one of the players who requested to create the new game
//     var found = false;
//     for(var x in privateSnapshot.val().players) {
//       if (privateSnapshot.val().players[x] == u)
//     }
