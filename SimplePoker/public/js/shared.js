// This file should be idential between
//  /public/js/shared.js
//  /functions/shared.js
//
// TODO(zhenya): figure out how to properly share between backend and hosting in
// firebase or use symlinks in git.

// Database schema:
// /user/ - user information. Writable by user themself, readable by admin.
// /user/$uid/info={name, email, currentGame} - information
// /user/$uid/game/$gid/{hand, myPosition} - current game
//
// /game-admin/$gid - private information about the game. Only visible to admin.
//                    gid is generated here as the key.
// /game-admin/$gid/cards = {deck,deckPosition, discard, discardShuffle} - cards
// /game-admin/$gid/players/$player_nr = {uid, hand}
//
// /game-pub/$gid/ - public info about game. Read-only for everyone, writeable
//                   by admin. Gid is taken by the game above
//    ={status}.
//    Statuses
//    - Waiting for people to join
//    - waiting for a turn
//    - showdown
// /game-pub/$gid/players/$player_nr - information about the player.
//                                     Keyed by number 0-player-count
//   = {name, draw, drawSize, isDealer,
//      previousResult, [filled for showdown] hand, combination, result}
//   - presence of drawSize means that user finished their turn. We can
//     not rely on presense of draw_cc because empty array is stored as null.
//   - draw is an array of indices of exchanged cards

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

function userInfoPath(uid) {
  return 'user/' + uid + '/info';
}

const gamePubPath = 'game-pub/';

function gameInfoPath(gid) {
  return gamePubPath + gid;
}

function playersGamePath(uid, gid) {
  return 'user/' + uid + '/game/' + gid;
}

const gamePrivatePath = 'game-admin/';

function privateGamePath(gid) {
  return gamePrivatePath + gid;
}

if (typeof exports !== 'undefined' && exports) {
  exports.GameState = GameState;
  exports.PlayerResult = PlayerResult;
  exports.userInfoPath = userInfoPath;
  exports.gamePubPath = gamePubPath;
  exports.gameInfoPath = gameInfoPath;
  exports.playersGamePath = playersGamePath;
  exports.gamePrivatePath = gamePrivatePath;
  exports.privateGamePath  = privateGamePath;
}
