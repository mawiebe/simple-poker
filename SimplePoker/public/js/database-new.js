// Schema thoughts (not yet implemented)
// /user/ - user information. Writable by user themself, readable by admin.
// /user/$uid/info={name, email, currentGame} - information
// /user/$uid/game/$gid/{hand, draw} - current game
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


// A callback to call when something changes. Client passes it to initWorld,
// which saves it in this variable. Defaults to a no-op function.
var globalOnChange = function () {}


function DbTracker(callback) {
  this.callback = callback;
  this.setPath = function(path) {
    if (this.path == path) {
      return;
    }
    if (this.path) {
      firebase.database.ref(this.path).off('value');
    }
    this.path = path;
    firebase.database.ref(this.path).on('value', callback);
  }
}

var userInfoTracker = new DbTracker(function(snapshot){});
var gameInfoTracker = new DbTracker(function(snapshot){});
var playersGameTracker = new DbTracker(function(snapshot){});

var currenUserTrackingvar currenUserTracking

function userInfoPath(uid) {
  return 'user/' + uid + '/info';
}

function gameInfoPath(gid) {
  return 'game-pub/' + gid;
}

function playersGamePath(uid, gid) {
  return 'user/' + uid + '/game/' + gid;
}


var globalPlayerInfo = {}


function setUserInfo(uid, email, name) {
  userInfoRef(uid).update({
    email: email,
    name: name
  });
}

function User(uid, email) {
  this.uid = uid;
  this.email = email;
  this.updateName = function (newName) {
    setUserInfo(this.uid, this.email, newName);
  }
}

// Invoked when user logs in/changes login.
function onUserChange(uid, email, defaultName) {
  if (globalPlayerInfo.user && globalPlayerInfo.user.uid == uid) {
    return; // already correct  information, nothing to do.
  }

  if (globalPlayerInfo.user) {
    userInfoRef(globalPlayerInfo.user.uid).off('value');
  }

  globalPlayerInfo.user = new User(uid, email);

  userInfoRef(globalPlayerInfo.user.uid).on('value', function (snapshot) {
    if (snapshot.val() == null) {
      setUserInfo(uid, email, defaultName); // This will call the function
      // again as it updates the part
      // of DB it is tied to.
    } else {
      globalPlayerInfo.user.name = snapshot.val().name;
      globalPlayerInfo.user.email = snapshot.val().email;
      onPlayerInfoChange(snapshot.val().currentGame);
    }
  });
}

// Invoked when player's data is change in the database.
function onPlayerInfoChange(newGameId) {
  if (newGameId == globalPlayerInfo.currentGameId) {
    // Invoke callback even if game stayed the same - if this function was
    // called, somthing indeed changed.
    globalOnChange(globalPlayerInfo);
    return;
  }

  if (globalPlayerInfo.currentGameId) {
    gameInfoRef(globalPlayerInfo.currentGameId).off('value');
  }
  globalPlayerInfo.currentGameId = newGameId;
  globalPlayerInfo.currentGame = {};
  globalPlayerInfo.currentGame.exchangeCards = function(cards) {
    exchangeCards(globalPlayerInfo.currentGameId, cards);
  }


  gameInfoRef(globalPlayerInfo.currentGameId).on('value', function(snapshot) {
    if (snapshot.val()) {
      globalPlayerInfo.currentGame.state = snapshot.val().state;
      globalPlayerInfo.currentGame.players = snapshot.val().players;
    }
    globalOnChange(globalPlayerInfo);
  });


  // TODO: load user/game and game-pub/

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
      let features = ['auth', 'database', 'messaging', 'storage'].filter(
        feature => typeof app[feature] === 'function');
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
