document.addEventListener('DOMContentLoaded', init);

let game_id;
let username;
let creator = false;
let players = [];
let self_index = -1;

function init() {
    const inputs = document.querySelectorAll('input');
    const buttons = document.querySelectorAll('.button');
    const toggle = document.querySelector('.toggle');
    const placeholder = document.querySelector('.tooltip');

    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        input.addEventListener('focus', () => {
            input.removeAttribute('class');
        });
        
        input.addEventListener('input', e => {
            if (i != 0) return; 
            e.target.value = e.target.value.toUpperCase();
        });
        
        input.addEventListener('keyup', e => {
            if (e.keyCode == 13) input.blur(), buttons[i].click();
        });
    };

    for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        button.addEventListener('click', () => {
            if (i == 0) {
                d(inputs[0].value);
                inputs[1].focus();
            };

            if (i == 1) {
                username = inputs[i].value;
                if (creator) return c(username);                
                j(game_id);
            };
        });
    };

    toggle.addEventListener('click', () => {
        const status = toggle.getAttribute('ready');
        if (status == "true") {
            toggle.setAttribute('ready', 'false');
            ws.send(JSON.stringify({ method: 'ready', body: false }));
            return;
        };

        toggle.setAttribute('ready', 'true');
        ws.send(JSON.stringify({ method: 'ready', body: true }));
    });

    placeholder.addEventListener('click', () => {
        const body = document.querySelector('.body.active');
        const new_body = document.querySelector('.body.inactive');
        body.setAttribute('class', 'body justified inactive');
        body.remove();
        new_body.setAttribute('class', 'body justified active');
        creator = true;
    });
};

const ws = new WebSocket('wss://rida.dev:6060');

ws.onopen = () => {
    console.log('WebSocket Opened');
    // ws.send(JSON.stringify({
    //     method: 'create_game',
    //     body: { username: 'rida' }
    // }));
};

ws.onmessage = message => {
    message = JSON.parse(message.data);
    console.log(message);

    if (message.method == "game_data") {
        const body = document.querySelector('.body.active');
        const new_body = document.querySelector('.body.inactive');
        body.setAttribute('class', 'body justified inactive');
        body.remove();
        new_body.setAttribute('class', 'body justified active');

        game_id = message.body;
    };

    if (message.method == "invalid_id") {
        const input = document.querySelectorAll('input')[0];
        input.value = "";
        input.setAttribute('class', 'error');
    };

    if (message.method == "status_update") {
        document.querySelectorAll('.player').forEach((player, i) => {
            if (message.body[i]) return player.setAttribute('ready', 'true');
            player.setAttribute('ready', 'false');
        });
    };

    if (message.method == "game_joined") {
        ws.game_id = message.body.id;
        const code = document.querySelector('.code');
        code.textContent = message.body.id;
        message.body.players.forEach((data, i) => {
            const list = document.querySelector('.list');
            const player = document.createElement('div');
            player.setAttribute('class', 'player');
            player.setAttribute('ready', 'false');
            if (message.body.status[i]) player.setAttribute('ready', 'true');
            const status = document.createElement('div');
            status.setAttribute('class', 'status');
            const name = document.createElement('div');
            name.textContent = data;
            name.setAttribute('class', 'name');
            player.appendChild(status);
            player.appendChild(name);
            list.appendChild(player);

            if (i != 0) newPlayer();
            if (i == message.body.players.length - 1) return;
            players.push(data);
        });
        
        const body = document.querySelector('.body.active');
        const new_body = document.querySelector('.body.inactive');
        body.setAttribute('class', 'body justified inactive');
        body.remove();
        new_body.setAttribute('class', 'body justified active');
    };
    
    if (message.method == "player_joined") {
        const list = document.querySelector('.list');
        const player = document.createElement('div');
        player.setAttribute('class', 'player');
        player.setAttribute('ready', 'false');
        const status = document.createElement('div');
        status.setAttribute('class', 'status');
        const name = document.createElement('div');
        name.textContent = message.body.username;
        name.setAttribute('class', 'name');
        player.appendChild(status);
        player.appendChild(name);
        list.appendChild(player);
        newPlayer();
        
        players.push(message.body.username);
    };

    if (message.method == "player_left") {
        const index = message.body.index;
        const listed = document.querySelectorAll('.player');
        
        players.splice(index, 1);

        if (listed.length > 0) listed[index].remove();
        const enemies = document.querySelectorAll('.enemy');
        enemies[index].remove();
    };

    if (message.method == "game_starting") {
        const body = document.querySelector('.body.active');
        const new_body = document.querySelector('.body.inactive');
        body.setAttribute('class', 'body justified inactive');
        body.remove();
        new_body.setAttribute('class', 'body active');
    };

    if (message.method == "turn") {
        const hand = document.querySelector('#player-hand');
        const enemies = document.querySelectorAll('.enemy');
        
        enemies.forEach(enemy => {
            enemy.setAttribute('class', `${enemy.getAttribute('class')} disabled`);
        });

        if (message.body.self) {
            document.querySelector('.game-text').textContent = `It is YOUR turn!`;
        } else {
            document.querySelector('.game-text').textContent = `It is ${players[message.body.index]}'s turn!`;
        };

        if (message.body.self) {
            return hand.removeAttribute('class');
        };

        hand.setAttribute('class', 'disabled');
        enemies[message.body.index].setAttribute('class', 'enemy');
    };
    
    if (message.method == "starting_hand") {
        const hand = document.querySelector('#player-hand');
        message.body.forEach(data => {
            const card = acquire(data);
            
            card.addEventListener('click', () => {
                if (card.getAttribute('class').includes('wild')) return;
                const cards = document.querySelector('#player-hand').children;
                const index = Array.prototype.indexOf.call(cards, card);

                ws.send(JSON.stringify({
                    method: 'play_card',
                    body: { index: index, id: ws.game_id }
                }))
            });
            
            hand.appendChild(card);
            hand.scrollLeft = hand.scrollWidth;
        });
    };
    
    if (message.method == "draw_cards") {
        const hand = document.querySelector('#player-hand');
        message.body.forEach((data, i) => {
            const card = acquire(data);
            
            card.addEventListener('click', () => {
                if (card.getAttribute('class').includes('wild')) return;
                const cards = document.querySelector('#player-hand').children;
                const index = Array.prototype.indexOf.call(cards, card);

                ws.send(JSON.stringify({
                    method: 'play_card',
                    body: { index: index, id: ws.game_id }
                }))
            });
            
            setTimeout(() => {
                hand.appendChild(card);
                hand.scrollLeft = hand.scrollWidth;
            }, i * 200);
        });
    };

    if (message.method == "drawn_cards") {
        const enemy = document.querySelectorAll('.enemy')[message.body.index];
        for (let i = 0; i < message.body.amount; i++) {
            setTimeout(() => {
                const card = document.createElement('div');
                card.setAttribute('class', 'new card hidden');
                enemy.appendChild(card);
            }, i * 150);
        };
    };

    if (message.method == "first_card") {
        const data = message.body;
        discard(acquire(data));
    };

    if (message.method == "card_played") {
        if (message.body.self) {
            const cards = document.querySelector('#player-hand').children;
            return discard(cards[message.body.index]);
        };

        discard(acquire(message.body.data));
        const children = document.querySelectorAll('.enemy');
        const hand = children[message.body.player];
        const card = hand.children[message.body.index];

        card.setAttribute('class', `${card.getAttribute('class')} gone`);
        setTimeout(() => card.remove(), 160);
    };
    
    if (message.method == "winner") {
        document.querySelector('.game-text').textContent = `${message.body} has won the game! Refresh to play again!`;
    };
};

ws.onclose = () => {

};

ws.onerror = error => {

};

function newPlayer() {
    const enemies = document.querySelector('#enemies');
    const enemy = document.createElement('div');
    enemy.setAttribute('class', 'enemy');

    for (let i = 0; i < 6; i++) {
        setTimeout(() => {
            const card = document.createElement('div');
            card.setAttribute('class', 'new card hidden');
            enemy.appendChild(card);
        }, 150 * i);
    };

    enemies.appendChild(enemy);
};

function discard(card) {
    const _class = card.getAttribute('class');
    if (_class.includes('hidden') || _class.includes('gone')) return;

    const clone = card.cloneNode(true);
    clone.setAttribute('class', `dis ${_class}`);

    card.setAttribute('class', `${_class} gone`);
    setTimeout(() => {
        card.remove();
        document.querySelector('#discard-pile').appendChild(clone);

        setTimeout(() => {
            document.querySelectorAll('#discard-pile > .card')[0].remove();
        }, 160);
    }, 160);
};

function acquire(data) {
    if (data.type == 0) {
        const card = document.createElement('div');
        card.setAttribute('class', `new card ${data.colour}`);
        const internal = document.createElement('div');
        internal.setAttribute('class', 'value');
        internal.textContent = data.value;
        card.appendChild(internal);
        
        return card;
    };

    if (data.type == 1) {
        const card = document.createElement('div');
        card.setAttribute('class', `new card ${data.colour}`);
        const internal = document.createElement('div');
        internal.setAttribute('class', 'value');
        card.appendChild(internal);

        let icon = document.createElement('i');
        if (data.action == "skip") icon.setAttribute('class', 'fas fa-ban');
        if (data.action == "reverse") icon.setAttribute('class', 'fas fa-undo');
        
        if (!icon.getAttribute('class')) {
            internal.textContent = `+${data.value.toString()}`;
        } else {
            internal.appendChild(icon);
        };

        return card;
    }

    if (data.type == 2) {
        const card = document.createElement('div');
        card.setAttribute('class', `new card wild`);
        const internal = document.createElement('div');
        internal.setAttribute('class', 'value');
        card.appendChild(internal);
        const selector = document.createElement('div');
        selector.setAttribute('class', 'selector');

        const colours = ['green', 'yellow', 'blue', 'red'];
        colours.forEach((colour, i) => {
            const ele = document.createElement('div');
            ele.setAttribute('class', colour);

            ele.addEventListener('click', () => {
                const cards = document.querySelector('#player-hand').children;
                const index = Array.prototype.indexOf.call(cards, card);

                card.setAttribute('class', `${card.getAttribute('class')} ${colours[i]}`);

                ws.send(JSON.stringify({
                    method: 'play_card',
                    body: { index: index, id: ws.game_id, colour: colours[i] }
                }));
            });

            selector.appendChild(ele);
        });

        card.appendChild(selector);

        let icon = document.createElement('i');
        if (data.action == "wild") icon.setAttribute('class', 'fas fa-palette');
        
        if (!icon.getAttribute('class')) {
            internal.textContent = `+${data.value.toString()}`;
        } else {
            internal.appendChild(icon);
        };

        if (data.colour) card.setAttribute('class', `${card.getAttribute('class')} ${data.colour}`);

        return card;
    };
}

function d(id) {
    ws.send(JSON.stringify({
        method: 'check_game',
        body: { id: id }
    }));
};

function j(id) {
    ws.send(JSON.stringify({
        method: 'join_game',
        body: { username: username, id: id }
    }));
};

function s(id) {
    ws.send(JSON.stringify({
        method: 'start_game',
        body: { id }
    }))
};

function c(username) {
    ws.send(JSON.stringify({
        method: 'create_game',
        body: { username }
    }))
};