// Schema thoughts (not yet implemented)
// /user/ - user information. Writable by user themself, readable by admin.
// /user/$uid/info={name, email, currentGame} - information
// /user/$uid/game/$gid/{id, hand, draw, ready_for_next_round} - current game
//
// /game-admin/$gid - private information about the game. Only visible to admin.
//                    gid is generated here as the key.
// /game-admin/$gid/cards = {deck, discard_shuffle} - cards
// /game-admin/$gid/players/$player_nr = {uid, draw_copy}
//
// /game-pub/$gid/ - public info about game. Read-only for everyone, writeable
//                   by admin. Gid is taken by the game above
//    ={status, next_game_id}.
//    Statuses
//    - Waiting for people to join
//    - waiting for a turn
//    - showdown
//    - waiting for people to decide about the next game.
// /game-pub/$gid/players/$player_nr - information about the player.
//                                     Keyed by number 0-player-count
//   = {name, draw_size, draw_cc, hand[filled for showdown]}
//   - draw_copy needed so that users don't change the draw later.
//   - presence of draw_size means that user finished their turn. We can
//     not rely on presense of draw_cc because empty array is stored as null.
//


// TODO: notion of rotating dealer
