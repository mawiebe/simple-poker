// see shared.js for the schema

function login() {
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).catch(function (error) {
    // Handle Errors here.
    globalUser = null;
    var errorSummary = {
      errorCode: error.code,
      errorMessage: error.message,
      email: error.email,
      credential: error.credential,
    };

    alert("Auth error: " + JSON.stringify(errorSummary));
  });
}

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
      firebase.database().ref(this.path).off('value');
    }
    this.path = path;
    firebase.database().ref(this.path).on('value', callback);
    return true;
  }
}

// A callback to call when something changes. Client passes it to initWorld,
// which saves it in this variable. Defaults to a no-op function.
var globalOnChange = function () {}

var globalPlayerInfo = {}

function updateUserInfo(uid, name, email) {
  if (!email && globalPlayerInfo.user) {
    email = globalPlayerInfo.user.email;
  }
  firebase.database().ref(userInfoPath(uid)).update({
    name: name,
    email: email
  });
}

function createGame(callback) {
  var createGame = firebase.functions().httpsCallable('createGame');
  createGame().then(function(result) {
    callback(result.data);
  });
}

function joinGame(gid) {
  var joinGame = firebase.functions().httpsCallable('joinGame');
  joinGame({gid: gid}).then(function(result) {
    callback(result.data);
  });
}
function deal(callback) {
  var game = globalPlayerInfo.currentGame;
  if (!game || !globalPlayerInfo.currentGameId) {
    callback({error: "No game to start"});
    return;
  }
  if (game.status != GameState.WaitingForStart) {
    callback({error: "Game already started"});
    return;
  }
  if(!game.players[game.myPosition].isDealer) {
    callback({error: "Only the dealer can start the game"});
    return;
  }
  var startGame = firebase.functions().httpsCallable('startGame');
  startGame({gid: globalPlayerInfo.currentGameId}).then(function(result) {
    callback(result.data);
  });
}

function exchangeCards(discarded, callback) {
  var game = globalPlayerInfo.currentGame;
  if (!game || !globalPlayerInfo.currentGameId ||
     !game.players[game.myPosition].theirTurn) {
    callback({error: "Not your turn"});
    return;
  }
  var exchangeCards = firebase.functions().httpsCallable('exchangeCards');
  exchangeCards({
    gid: globalPlayerInfo.currentGameId,
    discarded:discarded
  }).then(function(result) {
    callback(result.data);
  });
}

// Below are 3 trackers that are invoked either when information is loaded from
// database for the first time or when it changes in database. They track
// 1) user general information 2) public information about current game
// 3) current user's private information about current game.

function curentUserInfoPath() {
  return userInfoPath(globalPlayerInfo.user.uid);
}

function currentGameInfoPath() {
  return gameInfoPath(globalPlayerInfo.currentGameId);
}

function currentPlayersGamePath() {
  return playersGamePath(globalPlayerInfo.user.uid,
                         globalPlayerInfo.currentGameId);
}


var userInfoTracker = new DbTracker(curentUserInfoPath, function (snapshot) {
  var user = globalPlayerInfo.user;

  if (!user || user.uid != snapshot.ref.parent.key) {
    console.error("Unexpected user info callback. Current user: " +
      JSON.stringify(user) +
      "Snapshot key: " + snapshot.ref.parent.key +
      "Snapshot val: " + JSON.stringify(snapshot.val()));
    return;
  }
  if (snapshot.val() == null) {
    // This will call the function again as it updates the part of DB it is
    // tied to.
    updateUserInfo(snapshot.key, user.email,user.defaultName);
  } else {
    user.email = snapshot.val().email;
    user.name = snapshot.val().name;
    globalPlayerInfo.currentGameId = snapshot.val().currentGame;
    globalPlayerInfo.currentGame = {}
    globalPlayerInfo.currentGame.exchangeCards = exchangeCards;
    // Avoiding short-circuit evaluation
    var gameUpdated = gameInfoTracker.updatePath();
    if (!playersGameTracker.updatePath() && !gameUpdated) {
      // Invoke callback even if game stayed the same - if this function was
      // called, somthing indeed changed.
      globalOnChange(globalPlayerInfo);
      return;
    }
  }
});

var gameInfoTracker = new DbTracker(currentGameInfoPath, function (snapshot) {
  // check state validity
  if (globalPlayerInfo.currentGameId != snapshot.key ||
    !globalPlayerInfo.currentGame) {
    console.error("Unexpected game info callback. CurrentGameId: " +
      globalPlayerInfo.currentGameId +
      "Current Game: " + JSON.stringify(globalPlayerInfo.currentGame) +
      "Snapshot key: " + snapshot.key +
      "Snapshot val: " + JSON.stringify(snapshot.val()));
    return;
  }
  // Load public info about the game to the global object
  if (snapshot.val()) {
    if (snapshot.val().players.length < 1) {
      console.error("Game without players");
    }
    globalPlayerInfo.currentGame.status = snapshot.val().status;
    globalPlayerInfo.currentGame.players = snapshot.val().players;
    var last =  globalPlayerInfo.currentGame.players[
      globalPlayerInfo.currentGame.players.length -1];

    // Fill in extra data that is not stored in DB.

    // Presense of draw_size says that player did their move. It's player's
    // turn if they did not make a move yet and previous player either did
    // their move or is a dealer.
    var prevDoneOrDealer = (last.isDealer || last.drawSize != null);
    for (var i in globalPlayerInfo.currentGame.players) {
      var player = globalPlayerInfo.currentGame.players[i];
      if (player.drawSize == 0) {
        // Database does not save empty array=> have to restore them manually.
        player.draw = [];
      }

      if (globalPlayerInfo.currentGame.status == GameState.WaitingForTurn &&
          prevDoneOrDealer && player.drawSize == null) {
        player.theirTurn = true;
      }
      // translate hand from numeric codes to card descriptions.
      if (player.hand) {
        var handCards = [];
        for (var i in player.hand) {
          handCards.push(getCard(player.hand[i]));
        }
        player.hand = handCards;
      }
      prevDoneOrDealer = (player.isDealer || player.drawSize != null);
    }

  }
  globalOnChange(globalPlayerInfo);

});
var playersGameTracker = new DbTracker(currentPlayersGamePath,
                                       function (snapshot) {
  // check state validity
  if (globalPlayerInfo.currentGameId != snapshot.key ||
    !globalPlayerInfo.currentGame) {
    console.error("Unexpected player's game callback. CurrentGameId: " +
      globalPlayerInfo.currentGameId +
      "Current Game: " + JSON.stringify(globalPlayerInfo.currentGame) +
      "Snapshot key: " + snapshot.key +
      "Snapshot val: " + JSON.stringify(snapshot.val()));
    return;
  }
  // Load players private info about the game to the global object
  if (snapshot.val()) {
    globalPlayerInfo.currentGame.myPosition = snapshot.val().myPosition;
    globalPlayerInfo.currentGame.myHand = []
    for (var i in snapshot.val().hand) {
      globalPlayerInfo.currentGame.myHand.push(getCard(snapshot.val().hand[i]));
    }
  }
  globalOnChange(globalPlayerInfo);
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
    globalOnChange(globalPlayerInfo);
  }
}

function initWorld(onChange) {
  globalOnChange = onChange;
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
}
