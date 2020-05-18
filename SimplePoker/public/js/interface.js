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

function InitWorld(onChange) {
  // This function will init firebase and create all event listenets.
  // When state of the world changes for the player, it will call onChange
  // and pass it playerInfo with updated information. In fact this function
  // will only have one playerInfo instance and will update its contents
  // before calling onChange.
}

function Login() {
  // Creates popup dialog to login with Google. When done calls onChange that
  // was passed to InitWorld, with up-to-date playerInfo.
}


playerInfo = {  // World state for a player
  // Result of loading firebase
  systemOk : true,       // null when loading, false on failure
  systemLoadError: "",

  user :  {  // null if not logged in
    uid: "1234",
    name: "Zhenya".

    setName: function(name) {}
  },

  // In version 1 it will only contain current and possibly previous game.
  // In later versions we can support several games simultaniously.
  games : {
    "4321": {
      id: "4321",
      state: GameState.WaitingForExchange,
      players: [
        {
          name: Zhenya,
          dealer: true,
          theirTurn: true,
          // During showdown this will also contain:
          //
          // hand: [{rank: 1, suit:2}, ... ]
          // handInfo: {combination: HandEnum.Flush, combinationName: "Flush"},
          // result: PlayerResult.Win
        },
        {
          name: Evgeny,
          draw: [1, 3, 4],  // indices of cards that the player exchanged
        }
      ],
      myPosition: 2,
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
    }
  },

  currentGame: games["4321"],
  previousGame: game["5678"], // Only present if current game was created from
                              // another one with identical set of players.

  newGame: function () {}, // creates a new game with only current player.
  deal: function() {},  // If current game is not started yet, and current
                        // person is the dealer, starts it.
                        // If current game is finished and the person should be
                        // the next dealer, creates a new game with the same set
                        // of players and current player as a daler, and starts
                        // it.
  joinGame: function(id) {}
};
