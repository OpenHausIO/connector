const dgram = require("dgram");
const url = require("url");
const WebSocket = require("ws");

process.env = Object.assign({
    BACKEND_URL: "http://localhost:8080",
    BACKEND_PROTOCOL: "http"
}, process.env);

const logger = require("./system/logger.js");
const log = logger.create("forwarder/mdns");

let uri = new url.URL(process.env.BACKEND_URL);
uri.protocol = (process.env.BACKEND_PROTOCOL === "https" ? "wss" : "ws");
uri.pathname = "/api/mdns";
uri.search = `x-auth-token=${process.env.AUTH_TOKEN}`;
const ws = new WebSocket(uri);


const socket = dgram.createSocket({
    type: "udp4",
    reuseAddr: true
});

ws.on("close", (code) => {
    log.debug(`Disconnected from ${ws.url}`);
    socket.close(() => {
        process.exit(code);
    });
});

socket.on("listening", () => {

    const address = socket.address();
    log.info(`Server listening udp://${address.address}:${address.port}`);

    socket.on("message", (msg, rinfo) => {
        log.trace("Message on udp socket received", msg, rinfo);
        ws.send(msg);
    });

    socket.addMembership("224.0.0.251");

});

ws.on("message", (msg) => {
    log.trace("Send message to multicast addr", msg);
    socket.send(msg, 0, msg.length, 5353, "224.0.0.251");
});

ws.on("open", () => {

    log.info(`Connected to ${ws.url}`);

    // bind socket
    socket.bind(5353, "0.0.0.0");

});