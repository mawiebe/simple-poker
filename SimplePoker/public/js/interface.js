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

  current_game: games[0],


  this.currentGame = null;
}
