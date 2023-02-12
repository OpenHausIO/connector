const net = require("net");
const url = require("url");
const WebSocket = require("ws");

process.env = Object.assign({
    BACKEND_URL: "http://localhost:8080",
    BACKEND_PROTOCOL: "http"
}, process.env);

let uri = new url.URL(process.env.BACKEND_URL);
uri.protocol = (process.env.BACKEND_PROTOCOL === "https" ? "wss" : "ws");
uri.pathname = "/api/mqtt";
const ws = new WebSocket(uri);


const socket = new net.Socket();

ws.on("close", (code) => {
    console.log(`Disconnected from ${ws.url}`, code);
    socket.destroy();
});

socket.on("connect", () => {

    const address = socket.address();
    console.log(`server listening ${address.address}:${address.port}`);

    console.log("mqtt socket server connected");

    socket.on("data", (data) => {
        console.log("mqtt, Message", data);
        ws.send(data);
    });

});

ws.on("message", (data) => {
    console.log("Send message to mqtt broker");
    socket.write(data);
});

ws.on("open", () => {

    console.log(`Connected to  ${ws.url}`);

    // bind socket
    socket.connect(process.env.MQTT_PORT, process.env.MQTT_HOST);

});