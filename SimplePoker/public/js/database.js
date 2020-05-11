function login() {
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).then(function (result) {
    // The signed-in user info.
    globalUser = result.user;
    alert("Login successful: " + result.user.email);
  }).catch(function (error) {
    // Handle Errors here.
    globalUser = "";
    var errorSummary = {
      errorCode: error.code,
      errorMessage: error.message,
      email: error.email,
      credential: error.credential,
    };

    alert("Auth error: " + JSON.stringify(errorSummary));
  });

}

function getGameId(userId, done) {
  var valueref = firebase.database().ref('test/u/' + userId + "/currentGame");
  valueref.once('value', done);
}

function getGame(userId, done) {
  getGameId(userId, function (snapshot) {
    if (!snapshot.val() || !snapshot.val().id) {
      done(null);
    } else {
      firebase.database().ref('test/g/' + snapshot.val().id)
        .once('value', function (snapshot) {
          var game = snapshot.val();
          if (game) {
            // Empty arrays are not stored in firebase. As a hack, storing
            // [-1] to mark empty array, and replacing it on load.
            for (i in game.draws) {
              if (game.draws[i].length == 1 && game.draws[i][0] == -1) {
                game.draws[i] = [];
              }
            }
          }
          done(game);
        });
    }
  })
}

function startTestGame(done) {
  var game = createGame(
    [{
        id: "<redacted for git>",
        name: "Zhenya"
      },
      {
        id: "<redacted for git>",
        name: "Evgeny"
      }
    ]); // evgeny.tsurinov@
  var games = firebase.database().ref('test/g');
  var newref = games.push(game);
  var gameID = newref.key;
  for (i in game.players) {
    var valueref = firebase.database().ref(
      'test/u/' + game.players[i].id + "/currentGame");
    valueref.set({
      id: gameID
    }, done);
  }
}

function exchangeCards(userId, cards, done) {
  if (cards.length == 0) {
    cards = [-1];
  }
  getGameId(userId, function (snapshot) {
    if (snapshot.val() && snapshot.val().id) {
      var ref = firebase.database().ref(
        'test/g/' + snapshot.val().id + "/draws/" + userId);
      ref.set(cards, done);
    } else {
      console.error("User does not seem to have an active game: " +userId);
      done(null);
    }
  });
}
