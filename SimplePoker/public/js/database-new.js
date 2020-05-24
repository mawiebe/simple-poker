// Schema thoughts (not yet implemented)
// /user/ - user information. Writable by user themself, readable by admin.
// /user/$uid/info={name, email, currentGame} - information
// /user/$uid/game/$gid/{hand, myPosition} - current game
//
// /game-admin/$gid - private information about the game. Only visible to admin.
//                    gid is generated here as the key.
// /game-admin/$gid/cards = {deck, discard_shuffle} - cards
// /game-admin/$gid/players/$player_nr = {uid, draw_copy}
//
// /game-pub/$gid/ - public info about game. Read-only for everyone, writeable
//                   by admin. Gid is taken by the game above
//    ={status}.
//    Statuses
//    - Waiting for people to join
//    - waiting for a turn
//    - showdown
//    - waiting for people to decide about the next game.
// /game-pub/$gid/players/$player_nr - information about the player.
//                                     Keyed by number 0-player-count
//   = {name, draw, draw_size, isDealer, hand[filled for showdown],
//      previousLoser, previousWinner}
//   - draw_copy needed so that users don't change the draw later.
//   - presence of draw_size means that user finished their turn. We can
//     not rely on presense of draw_cc because empty array is stored as null.
//

// Tool that helps to track a part of a database and switch to another part
// when needed.
function DbTracker(pathGetter, callback) {
  this.callback = callback;
  // returns whether any changes were made
  this.updatePath = function () {
    var path = pathGetter();
    if (this.path == path) {
      return false;
    }
    if (this.path) {
      firebase.database.ref(this.path).off('value');
    }
    this.path = path;
    firebase.database.ref(this.path).on('value', callback);
    return true;
  }
}

// A callback to call when something changes. Client passes it to initWorld,
// which saves it in this variable. Defaults to a no-op function.
var globalOnChange = function () {}

function userInfoPath() {
  return 'user/' + globalPlayerInfo.user.uid + '/info';
}

function gameInfoPath() {
  return 'game-pub/' + globalPlayerInfo.currentGameId;
}

function playersGamePath() {
  return 'user/' + globalPlayerInfo.user.uid + '/game/' +
    globalPlayerInfo.currentGameId;
}

var globalPlayerInfo = {}

function updateUserInfo(uid, email, name) {
  firebase.database.ref(userInfoPath(uid)).update({
    email: email,
    name: name
  });
}

function exchangeCards(cards) {
  // TODO: call server
}

// Below are 3 trackers that are invoked either when information is loaded from
// database for the first time or when it changes in database. They track
// 1) user general information 2) public information about current game
// 3) current user's private information about current game.

var userInfoTracker = new DbTracker(userInfoPath, function (snapshot) {
  var user = globalPlayerInfo.user;

  if (!user || user.uid != snapshot.key()) {
    console.error("Unexpected user info callback. Current user: " +
      JSON.stringify(user) +
      "Snapshot key: " + snapshot.key() +
      "Snapshot val: " + JSON.stringify(snapshot.val()));
    return;
  }
  if (snapshot.val() == null) {
    // This will call the function again as it updates the part of DB it is
    // tied to.
    updateUserInfo(snapshot.key(), user.email,user.defaultName);
  } else {
    user.email = snapshot.val().email;
    user.name = snapshot.val().name;
    globalPlayerInfo.currentGameId = snapshot.val().currentGame;
    globalPlayerInfo.currentGame = {}
    globalPlayerInfo.currentGame.exchangeCards = exchangeCards;
    if (!gameInfoTracker.updatePath() && !playersGameTracker.updatePath()) {
      // Invoke callback even if game stayed the same - if this function was
      // called, somthing indeed changed.
      globalOnChange(globalPlayerInfo);
      return;
    }
  }
});

var gameInfoTracker = new DbTracker(gameInfoPath, function (snapshot) {
  // check state validity
  if (globalPlayerInfo.currentGameId != snapshot.key() ||
    !globalPlayerInfo.currentGame) {
    console.error("Unexpected game info callback. CurrentGameId: " +
      globalPlayerInfo.currentGameId +
      "Current Game: " + JSON.stringify(globalPlayerInfo.currentGame) +
      "Snapshot key: " + snapshot.key() +
      "Snapshot val: " + JSON.stringify(snapshot.val()));
    return;
  }
  // Load public info about the game to the global object
  if (snapshot.val()) {
    globalPlayerInfo.currentGame.status = snapshot.val().status;
    globalPlayerInfo.currentGame.players = snapshot.val().players;
  }

});
var playersGameTracker = new DbTracker(playersGamePath, function (snapshot) {
  // check state validity
  if (globalPlayerInfo.currentGameId != snapshot.key() ||
    !globalPlayerInfo.currentGame) {
    console.error("Unexpected player's game callback. CurrentGameId: " +
      globalPlayerInfo.currentGameId +
      "Current Game: " + JSON.stringify(globalPlayerInfo.currentGame) +
      "Snapshot key: " + snapshot.key() +
      "Snapshot val: " + JSON.stringify(snapshot.val()));
    return;
  }
  // Load players private info about the game to the global object
  if (snapshot.val()) {
    globalPlayerInfo.currentGame.myPosition = snapshot.val().myPosition;
    globalPlayerInfo.currentGame.myHand = []
    for (x in snapshot.val().hand) {
      globalPlayerInfo.currentGame.myHand.push(getCard(snapshot.val().hand[x]));
    }
  }
});


function User(uid, email, defaultName) {
  this.uid = uid;
  this.email = email;
  // Todo: think whether I can just use name. If not, I should probably
  // change email handling too.
  this.defaultName = defaultName;
  this.updateName = function (newName) {
    updateUserInfo(this.uid, this.email, newName);
  }
}

// Invoked when user logs in/changes login.
function onUserChange(uid, email, defaultName) {
  if (!globalPlayerInfo.user || uid != globalPlayerInfo.uid) {
    globalPlayerInfo.user = new User(uid, email, defaultName);
  }

  // if updatePath returns true, no need for refresh - it will happen on
  // result from DB.
  if (!userInfoTracker.updatePath()) {
    globalOnChange(globalPlayerInfo());
  }
}

function initWorld(onChange) {
  document.addEventListener('DOMContentLoaded', function () {
    // // 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
    // // The Firebase SDK is initialized and available here!
    //
    firebase.auth().onAuthStateChanged(user => {
      onUserChange(user.uid, user.email, user.displayName);
    });
    // firebase.database().ref('/path/to/ref').on('value', snapshot => { });
    // firebase.messaging().requestPermission().then(() => { });
    // firebase.storage().ref('/path/to/ref').getDownloadURL().then(() => { });
    //
    // // 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

    try {
      let app = firebase.app();
      globalOnChange(globalPlayerInfo);
    } catch (e) {
      console.error(e);
      globalPlayerInfo.systemOk = false;
      globalPlayerInfo.systemLoadError =
        'Error loading the Firebase SDK, check the console.';
      globalOnChange(globalPlayerInfo);
    }
  });

}
