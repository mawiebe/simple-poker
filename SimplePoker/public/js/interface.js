const GameState = Object.freeze({
  WaitingForJoins: 0,
  WaitingForExchange: 1,
  Showdown: 2,
});

const PlayerResult = Object.freeze({
  Middle: 0,
  Win: 1,
  Lose: 2,
});


playerInfo = {  // World state for a players
  system_ok : true,  // null when loading, false on failure
  system_load_error: "",

  change_user: function(){},
  user :  {  // null if not logged in
    uid: "1234",
    name: "Zhenya".

    set_name: function(name) {}
  },

  games : [ //
    {
      id: "4321",
      state: GameState.WaitingForExchange,
      players: [
        {
          name: Zhenya,
          dealer: true,
          theirTurn: true,
          // During showdown this will also contain:
          // cards: Array of card object returned by getHand
          // combination: object returned by getCombo.
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
          rank 12,
          suit 0
        }
        //...
      ],
      exchangeCards = function(cardIndices) {}  // exchange([0, 3,4])
    }
  ],

  currentGame: games[0],
  previousGame: game[1], // Only present if current game was created from
                         // another one with identical set of players.

  newGame = function () {} // creates a new game with only current player.
  deal = function() {} // If current game is not started yet, and current person
                       // is the dealer, starts it.
                       // If current game is finished and the person should be
                       // the next dealer, creates a new game with the same set
                       // of players and current player as a daler, and starts
                       // it.
};
