const WebSocket = require("ws");

function wsStream(url, options) {

    options = Object.assign({
        // default sream options
    }, options);

    let ws = new WebSocket(url);

    return WebSocket.createWebSocketStream(ws, options);

}

module.exports = wsStream;