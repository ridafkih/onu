const WebSocket = require("ws");
const express = require("express");

const http = require("http");
const path = require("path");
const app = express();
const server = http.createServer(app);

app.use("/", express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

server.listen(8080);
const wss = new WebSocket.Server({ server });

wss.on("listening", () =>
  console.log(`[NOTICE]: Onu Live on ws://localhost:8080/`),
);
wss.on("connection", (ws) => {
  const player = new Player(ws);
  player.initialize();
});

let games = [];

function locate(id) {
  const index = games.findIndex((x) => x.id == id);
  return games[index];
}

function Game() {
  const game = this;

  this.started = false;
  this.over = false;
  this.id;
  this.stack = 0;
  this.pile = []; // ... new discard pile
  this.deck = new Deck(); // ... call deck constructor
  game.deck.generate(true); // ... generate shuffled deck

  this.reversals = 0;

  this.players = {
    current: 0,
    list: [],
    add: (player) => {
      if (game.started) return player.send("in_progress");
      if (game.players.list.length >= 6) return player.send("game_full");
      game.players.list.forEach((p) =>
        p.send("player_joined", { id: player.id, username: player.username }),
      );
      game.players.list.push(player);
      player.send("game_joined", {
        id: game.id,
        players: game.players.list.map((x) => x.username || "unknown_player"),
        status: game.players.list.map((x) => x.ready),
      });
    },
    remove: (player) => {
      const index = game.players.list.findIndex((x) => x == player);
      if (index == -1) return console.error("[ERROR]: Player Cannot Leave");
      player.game.players.list.forEach((p) => {
        const index = p.opponents().indexOf(player);
        p.send("player_left", { index });
      });

      game.players.list.splice(index, 1);
      if (index == game.players.current) game.turn();
      if (game.players.list.length == 1) game.win(game.players.list[0]);
    },
    next: () => {
      let index = game.players.current;
      if (game.reversals % 2 == 0) {
        index++;
      } else {
        index--;
      }

      if (!game.players.list[index]) {
        index = game.players.list.length - 1;
        if (game.reversals % 2 == 0) index = 0;
      }
      return game.players.list[index];
    },
  };

  this.play = (player, card, index) => {
    if (game.over) return;
    const c = game.players.current;
    const p = game.players.list.findIndex((x) => x == player);

    if (c > game.players.list.length - 1) game.players.current = p;
    if (c != p) return console.log(game.players.current, p);

    if (card.action == "reverse") game.reversals++;

    console.log(`${player.username} has played a ${card.colour} card.`);
    player.send("card_played", { self: true, data: card, index: index });
    game.players.list.forEach((p) => {
      if (player.id == p.id) return;
      const player_index = p.opponents().findIndex((x) => x.id == player.id);
      p.send("card_played", {
        self: false,
        data: card,
        index: index,
        player: player_index,
      });
    });

    game.pile.push(card);
    player.hand.splice(index, 1);

    // ... if players has no cards remaining, they win!
    if (player.hand.length == 0) return game.win(player);

    if (card.action == "draw") {
      game.stack += card.value;

      const next = game.players.next();
      const last = game.pile[game.pile.length - 1];
      const stackable = next.hand.findIndex(
        (x) => x.value === last.value && x.action == "draw",
      );

      if (stackable == -1) {
        next.card.pull(game.stack);
        game.stack = 0;
        return game.turn(2);
      } else {
        return game.turn();
      }
    }

    if (card.action == "skip") return game.turn(2);
    game.turn();
  };

  // ... skip turns, or end a turn
  this.turn = (value) => {
    if (game.over) return;
    if (!value) value = 1;
    for (i = 0; i < value; i++) {
      if (game.reversals % 2 == 0) {
        game.players.current++;
      } else {
        game.players.current--;
      }

      if (!game.players.list[game.players.current]) {
        game.players.current = game.players.list.length - 1;
        if (game.reversals % 2 == 0) game.players.current = 0;
      }
    }

    game.update();
    game.startTurn();
  };

  this.start = () => {
    if (game.started || game.over) return;
    game.started = true;
    game.update();

    game.players.list.forEach((player) => {
      player.send("game_starting");
      const starting_cards = 6;
      player.hand = game.deck.deal(starting_cards);
      player.send("starting_hand", player.hand);
    });

    const card = game.deck.deal(1)[0];

    const colours = ["red", "green", "blue", "yellow"];
    if (card.type == 2)
      card.colour = colours[Math.floor(Math.random() * colours.length)];

    game.pile.push(card);
    game.players.list.forEach((player) => player.send("first_card", card));

    game.startTurn();
    console.log(
      `${game.id} has just been started with ${game.players.list.length} players!`,
    );
  };

  this.startTurn = () => {
    if (game.over) return;
    // ... check to see if the now-player can play a card
    const current = game.players.current;
    const player = game.players.list[current];
    if (!player) return;

    let can_play = false;
    player.hand.forEach((card) => {
      if (playable(game, card)) can_play = true;
    });

    // ... if they cannot, pick up a card for them.
    setTimeout(() => {
      if (!can_play) player.card.pull();
      player.hand.forEach((card) => {
        if (playable(game, card)) can_play = true;
      });
    }, 1000);

    // if they still cannot play, skip their turn.
    setTimeout(() => {
      if (!can_play) game.turn();
    }, 1500);
  };

  this.win = (winner) => {
    if (game.over) return;
    const players = game.players.list;
    console.log(`${winner.username} has just won game ${game.id}`);
    game.over = true;
    players.forEach((p) => {
      p.send("winner", winner.username);
    });
  };

  this.update = () => {
    game.players.list.forEach((p, i) => {
      const current = game.players.current;
      const player = game.players.list[current];
      const index = p.opponents().findIndex((x) => x.id == player.id);

      if (i == current) return p.send("turn", { self: true, index: null });
      p.send("turn", { self: false, index: index });
    });
  };

  // ... generate an id for the game until a unique identifier is found.
  this.initialize = () => {
    const id = (Math.random() + 1).toString(36).substring(7).toUpperCase();
    const i = games.findIndex((x) => x.id == id);
    if (i != -1) return game.initialize();
    game.id = id;
    games.push(game);

    console.log(`Game Created with ID ${game.id}`);
  };
}

function Player(ws) {
  if (!ws)
    return console.error("[ERROR]: No WebSocket Present to Build Player");

  const player = this;

  this.id;
  this.username;
  this.admin = false;
  this.ready = false;

  this.hand = [];
  this.game;

  // ... attempt to join the game using an id, and username
  this.join = (game_id, username) => {
    if (!game_id || !username)
      return console.error("[ERROR]: Missing Game Join Data");
    const game = locate(game_id);
    if (!game) return console.error("[ERROR]: Invalid Game ID");

    player.game = game;
    player.username = username;
    player.game.players.add(player);

    console.log(`${player.username} has joined ${game.id}`);
  };

  this.leave = () => {
    if (!player.game) return;
    player.game.deck.return(player.hand);
    player.game.players.remove(player);

    player.hand = [];
    player.admin = false;
    player.game, (player.id = null);
  };

  this.opponents = () => {
    const list = player.game.players.list;
    const index = list.findIndex((x) => x.id == player.id);
    let arr = list.map((x) => x.id);
    arr.splice(index, 1);
    arr.forEach((id, i) => {
      const original = list[list.findIndex((x) => x.id == id)];
      arr[i] = original;
    });
    return arr;
  };

  this.card = {
    pull: (amount) => {
      if (!amount) amount = 1;
      const cards = player.game.deck.deal(amount);
      cards.forEach((card) => player.hand.push(card));
      player.send("draw_cards", cards);
      player.game.players.list.forEach((p) => {
        if (player == p) return;
        const index = p.opponents().findIndex((x) => x.id == player.id);
        p.send("drawn_cards", { amount, index });
      });
    },
    play: (index, colour) => {
      const game = player.game;
      const card = player.hand[index];
      if (!card) return;

      if (colour && card.type == 2) card.colour = colour;
      if (card.type == 2 && !colour) return;
      if (playable(game, card)) return game.play(player, card, index);
    },
  };

  // ... send message through the websocket
  this.send = (method, body) => {
    if (!ws) return console.error("[ERROR]: WebSocket Not Connected");
    if (!method)
      return console.error("[ERROR]: Method for WebSocket Message Missing");
    ws.send(JSON.stringify({ method, body }));
  };

  // ... generate an id for the player until a unique identifier is found.
  this.initialize = () => {
    const id = (Math.random() + 1).toString(36).substring(7).toUpperCase();
    if (!player.game) return (player.id = id);

    const i = player.game.players.list.findIndex((x) => x.id == id);
    if (i == -1) return (player.id = id);

    player.initialize();
  };

  // >> WEBSOCKET HANDLER
  ws.on("open", () => {
    console.log("[NOTICE]: Player Connected");
    // pretend here that they sent a request to create a new game
  });

  ws.on("close", () => {
    player.leave();
  });

  ws.on("message", (message) => {
    message = parseJson(message);
    const method = message.method,
      body = message.body;

    if (!method) return;

    if (method == "ready") {
      const players = player.game.players.list;
      if (message.body === true) player.ready = true;
      if (message.body === false) player.ready = false;
      players.forEach((player) => {
        player.send(
          "status_update",
          players.map((x) => x.ready),
        );
      });

      const ready = players.filter((x) => x.ready);
      if (ready.length == players.length && players.length > 1)
        setTimeout(player.game.start, 2000);
    }

    if (method == "create_game") {
      if (!body) return;
      if (!body.username) return console.error("No Username Provided");
      const game = new Game();
      game.initialize();

      body.username = body.username.slice(0, 14);
      player.username = body.username;
      player.game = game;
      player.admin = true;
      game.players.add(player);
    }

    if (method == "check_game") {
      if (!body) return;
      if (!body.id) return console.error("Missing Information");
      if (player.game) return console.error("User Already in Game");
      const game = locate(body.id);
      if (!game) return player.send("invalid_id");
      if (game.started) return player.send("in_progress");
      player.send("game_data", game.id);
    }

    if (method == "join_game") {
      if (!body) return;
      if (!body.id || !body.username)
        return console.error("Missing Information");
      if (player.game) return console.error("User Already in Game");
      const game = locate(body.id);
      if (!game) return player.send("invalid_id");
      body.username = body.username.slice(0, 14);

      player.game = game;
      player.username = body.username;
      game.players.add(player);
    }

    if (method == "play_card") {
      if (!body) return;
      player.card.play(body.index, body.colour);
    }
  });
}

function Deck() {
  const deck = this;
  this.cards = [];

  // ... generate deck, and push to the constructors cards property
  this.generate = (shuffled) => {
    const colours = ["red", "green", "blue", "yellow"];

    for (let i = 0; i < 10; i++) {
      colours.forEach((colour) => {
        deck.cards.push({ type: 0, colour: colour, value: i.toString() });
        if (i > 0)
          deck.cards.push({ type: 0, colour: colour, value: i.toString() });
      });
    }

    colours.forEach((colour) => {
      for (i = 0; i < 2; i++) {
        deck.cards.push({ type: 1, colour: colour, action: "draw", value: 2 });
        deck.cards.push({ type: 1, colour: colour, action: "reverse" });
        deck.cards.push({ type: 1, colour: colour, action: "skip" });
      }
    });

    for (i = 0; i < 4; i++) {
      deck.cards.push({ type: 2, action: "draw", value: 4 });
      deck.cards.push({ type: 2, action: "wild" });
    }

    // ... shuffle the deck at the end of the creation if (shuffled) is passed in.
    if (shuffled) deck.shuffle();
  };

  // ... shuffle the cards using the Fischer-Yates algorithm.
  this.shuffle = () => {
    var m = deck.cards.length,
      t,
      i;
    while (m) {
      i = Math.floor(Math.random() * m--);
      t = deck.cards[m];
      deck.cards[m] = deck.cards[i];
      deck.cards[i] = t;
    }
  };

  // ... pull a defined amount of cards from the deck, and remove them from the
  // cards property of the constructor
  this.deal = (value) => {
    return deck.cards.splice(0, value);
  };

  this.return = (cards) => {
    cards.forEach((card) => deck.cards.push(card));
    deck.shuffle();
  };
}

// Game Verifications, Functions, etc.
function playable(game, card) {
  const discarded = game.pile[game.pile.length - 1];

  if (!card || !discarded) return false;

  if (game.stack > 0 && card.action != "draw" && card.value !== discarded.value)
    return false;

  if (card.type == 3 && !card.colour) return false;

  if (card.action == discarded.action && card.value === discarded.value)
    return true;

  if (card.colour == discarded.colour || card.type == 2) return true;

  return false;
}

// Various Other Functions
function parseJson(payload) {
  try {
    return JSON.parse(payload);
  } catch (e) {
    return { method: null, body: null };
  }
}
