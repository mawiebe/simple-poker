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

var allUsers = null;

function checkUser(){
  if (!allUsers || !globalUser) {
    return false;
  }
  if (!allUsers[globalUser.uid] || !allUsers[globalUser.uid].name ||
      !allUsers[globalUser.uid].email) {
    updateUser(globalUser.uid, globalUser.displayName, globalUser.email);
    return false;
  }
  return true;
}


function listUsers() {
  firebase.database().ref('test/u/').on('value', function(snapshot) {
    // on first load update user info
    if (allUsers == null && globalUser != null) {
      allUsers = snapshot.val();
      // if checkUser returns false, no need to refresh, we will update db
      // anyway and return here again.
      if (checkUser()) {
        renderUsers();
      }
    } else {
      allUsers = snapshot.val();
      renderUsers();
    }
  });
}

function unhackGame(game) {
  // Empty arrays are not stored in firebase. As a hack, storing
  // [-1] to mark empty array, and replacing it on load.
  for (i in game.draws) {
    if (game.draws[i].length == 1 && game.draws[i][0] == -1) {
      game.draws[i] = [];
    }
  }
}

var currentUserId = null;
var currentGameId = null;
var currentGame = null;

function updateUser(uid, name, email) {
  if (!allUsers) {
    console.error("Should not update users before loading them");
    return;
  }
  if (!allUsers[uid] || !allUsers[uid].name) {
    firebase.database().ref('test/u/'+uid+'/name').set(name);
  }
  if (!allUsers[uid] || !allUsers[uid].email) {
    firebase.database().ref('test/u/'+uid+'/email').set(email);
  }
}


function getGameRef() {
  if (!currentGameId) {
    return null;
  }
  return firebase.database().ref('test/g/' + currentGameId);
}

function changeGame(gameId) {
  if (currentGameId == gameId) {
    return;
  }
  if (currentGameId) {
    getGameRef().off('value');
  }
  currentGameId = gameId;
  currentGame = null;
  if (currentGameId) {
    getGameRef().on('value',
      function (snapshot) {
        if (snapshot.val()) {
          unhackGame(snapshot.val());
        }
        currentGame = snapshot.val();
        renderGame();
      });
  } else {
    renderGame();
  }
}

function changeUser(userId) {
  if (userId == currentUserId) {
    return;
  }
  if (currentUserId) {
    firebase.database().ref('test/u/' + userId + "/currentGame").off('value');
  }
  currentUserId = userId;
  if (currentUserId) {
    firebase.database().ref('test/u/' + userId + "/currentGame").on('value',
      function (snapshot) {
        if (snapshot.val()) {
          changeGame(snapshot.val());
        } else {
          changeGame(null);
        }
      });
  } else {
    changeGame(null);
  }
}

function startGame(users) {
  var game = createGame(users);
  var games = firebase.database().ref('test/g');
  var newref = games.push(game);
  var gameID = newref.key;
  for (i in game.players) {
    var valueref = firebase.database().ref(
      'test/u/' + game.players[i].id + "/currentGame");
    valueref.set(gameID);
  }
}

function exchangeCards(cards) {
  if (cards.length == 0) {
    cards = [-1];
  }
  if (currentGameId) {
    var ref = firebase.database().ref(
      'test/g/' + currentGameId + "/draws/" + currentUserId);
    ref.set(cards);
  } else {
    console.error("User does not seem to have an active game: " + userId);
  }
}
