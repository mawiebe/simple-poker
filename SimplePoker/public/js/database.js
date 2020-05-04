var createAndSaveGame() {
  var game = createGame();
  var games = firebase.database().ref('test/v1');
  games.push();

}

function login() {
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).then(function(result) {
    // The signed-in user info.
    globalUser = result.user;
    alert("Login successful: " +result.user.email);
  }).catch(function(error) {
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

function writeToDB() {
  firebase.database().ref('test/v1').set({
    key1: 'value1',
    key2: 'value2',
  });
}

function readFromDB() {
  var valueref = firebase.database().ref('test/v1');
  valueref.on('value', function(snapshot) {
    alert("Read: " + JSON.stringify(snapshot));
  })
}
