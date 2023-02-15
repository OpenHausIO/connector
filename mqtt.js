const net = require("net");
const url = require("url");
const WebSocket = require("ws");

process.env = Object.assign({
    BACKEND_URL: "http://localhost:8080",
    BACKEND_PROTOCOL: "http"
}, process.env);

const logger = require("./system/logger.js");
const log = logger.create("forwarder/mqtt");

let uri = new url.URL(process.env.BACKEND_URL);
uri.protocol = (process.env.BACKEND_PROTOCOL === "https" ? "wss" : "ws");
uri.pathname = "/api/mqtt";
const ws = new WebSocket(uri);


const socket = new net.Socket();

ws.on("close", (code) => {
    log.debug(`Disconnected from ${ws.url}`, code);
    socket.destroy();
});

socket.on("connect", () => {

    log.info(`Client connected to tcp://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`);

    socket.on("data", (data) => {
        log.trace("Message on tcp socket received", data);
        ws.send(data);
    });

});

ws.on("message", (data) => {
    log.trace("Send message to tcp socket", data);
    socket.write(data);
});

ws.on("open", () => {

    log.info(`Connected to ${ws.url}`);

    // bind socket
    socket.connect(process.env.MQTT_PORT, process.env.MQTT_HOST);

});