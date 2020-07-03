// Not a real code, just an explanation of data representation.

const GameState = Object.freeze({
  WaitingForStart: 0,   // For new games. Accepting players until dealer
                        // presses "deal"
  WaitingForTurn: 1,    // Waiting for a player to make their turn
  Showdown: 2,          // Game finished.
});

const PlayerResult = Object.freeze({
  Middle: 0,
  Win: 1,
  Lose: 2,
});

function initWorld(onChange) {
  // This function will init firebase and create all event listenets.
  // When state of the world changes for the player, it will call onChange
  // and pass it playerInfo with updated information. In fact this function
  // will only have one playerInfo instance and will update its contents
  // before calling onChange.
}

function login() {
  // Creates popup dialog to login with Google. When done calls onChange that
  // was passed to InitWorld, with up-to-date playerInfo.
}


playerInfo = {  // World state for a player
  // Result of loading firebase
  systemOk : true,       // null when loading, false on failure
  systemLoadError: "",

  user :  {  // null if not logged in
    uid: "1234",
    name: "Zhenya",
    email: "etsurinov@gmail.com"

    setName: function(name) {}
  },

  // In version 1 we only have one game
  // In later versions we can support several games simultaniously.
  currentGameId: "4321",
  currentGame: {
    state: GameState.WaitingForTurn,
    players: [
      {
        name: Zhenya,
        isDealer: true,
        theirTurn: true,
        previousResult: PlayerResult.Win,
        // During showdown this will also contain:
        //
        // hand: [{rank: 1, suit:2}, ... ]
        // handInfo: {combination: HandEnum.Flush, combinationName: "Flush"},
        // result: PlayerResult.Win
      },
      {
        name: Evgeny,
        draw: [1, 3, 4],  // indices of cards that the player exchanged
        previousResult: PlayerResult.Lose,
      }
    ],
    myPosition: 1,
    myHand: [
      {
        rank: 0, // 2♥, see ranks[] and suits[] in poker.js
        suit: 1
      },
      {
        rank:12,
        suit: 0
      }
      //...
    ],
    exchangeCards: function(cardIndices) {}  // exchange([0, 3,4])
  },


  newGame: function () {}, // creates a new game with only current player.
  deal: function() {},  // If current game is not started yet, and current
                        // person is the dealer, starts it.
                        // If current game is finished and the person should be
                        // the next dealer, creates a new game with the same set
                        // of players and current player as a daler, and starts
                        // it.
  joinGame: function(id) {}
};
