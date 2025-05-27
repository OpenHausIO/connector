const WebSocket = require("ws");

const logger = require("./logger.js");

// maps os syscall codes to ws codes
// https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
const ERROR_CODE_MAPPINGS = {
    ECONNREFUSED: 4001,     // -111
    ECONNRESET: 4002,       // -104
    EADDRINUSE: 4003,       // -98
    EADDRNOTAVAIL: 4004,    // -99
    ETIMEDOUT: 4005,        // -110
    EHOSTUNREACH: 4006,     // -113
    ENETUNREACH: 4007,      // -101
    ENOTFOUND: 4008,        // -3008
    EPERM: 4009,            // -1
    EACCES: 4010,           // -13
    EPIPE: 4011,            // -32
    EINVAL: 4012,           // -22
    ENOENT: 4013            // -2
};

// rename file to "bridge.js"?
// rename upstream to url
module.exports = ({ upstream: url, options = {}, socket: proto, host, port }) => {

    // 1) connect to websocket endpoint
    // 2) wait for connection to be open
    // 3) call/create network socket
    // 4) forward data between ws & socket
    // 5) listen for errors on socket
    // 6) close ws connection with network socket error
    // 7) exit process

    let ws = new WebSocket(url, options);
    let stream = WebSocket.createWebSocketStream(ws);

    ws.once("close", (code) => {
        logger.verbose("ws closed", url, `${proto}://${host}:${port}`, code);
    });

    ws.once("open", () => {

        logger.verbose("ws opend", url, `${proto}://${host}:${port}`);

        let socket = require(`../sockets/${proto}.js`)({
            host,
            port
        });

        socket.once("error", (err) => {

            logger.verbose("socket error, close ws socket", err);
            ws.close(ERROR_CODE_MAPPINGS[err.code], err.code);

        });

        socket.once("close", () => {
            logger.verbose("socket close, close ws socket");
            ws.close();
        });

        stream.pipe(socket);
        socket.pipe(stream);

    });

    return {
        ws,
        stream
    };

};