function initListeners() {
  var usersRef = firebase.database().ref('user/');
  usersRef.on('child_changed', function(data) {
    // Use data.key and data.val
    user = data.val();

     // newGameRequested is either "<new>" for an empty game or gameId if user
     // just wants another round with the same people. The latter is only
     // allowed if
    if (user.info.newGameRequested) {
      createNewGame(data.key, user.info.newGameRequested);
    }
    if (// todo: check null
      user.game[user.info.currentGame].yourTurn &&
      user.game[user.info.currentGame].turnDone) {
        // Need to double-check it's user's turn.
        updateGame();
      }

  });
}
