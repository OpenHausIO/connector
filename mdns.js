const dgram = require("dgram");
const url = require("url");
const WebSocket = require("ws");

process.env = Object.assign({
    BACKEND_URL: "http://localhost:8080",
    BACKEND_PROTOCOL: "http"
}, process.env);

let uri = new url.URL(process.env.BACKEND_URL);
uri.protocol = (process.env.BACKEND_PROTOCOL === "https" ? "wss" : "ws");
uri.pathname = "/api/mdns";
const ws = new WebSocket(uri);


const socket = dgram.createSocket({
    type: "udp4",
    reuseAddr: true
});

ws.on("close", (code) => {
    console.log(`Disconnected from ${ws.url}`);
    socket.close(() => {
        process.exit(code);
    });
});

socket.on("listening", () => {

    const address = socket.address();
    console.log(`server listening ${address.address}:${address.port}`);

    console.log("mdnsm udp server listening");

    socket.on("message", (msg, rinfo) => {
        console.log("mdns, Message", msg, rinfo);
        ws.send(msg);
    });

    socket.addMembership("224.0.0.251");

});

ws.on("message", (msg) => {
    console.log("Send message to multicast addr");
    socket.send(msg, 0, msg.length, 5353, "224.0.0.251");
});

ws.on("open", () => {

    console.log(`Connected to  ${ws.url}`);

    // bind socket
    socket.bind(5353, "0.0.0.0");

});