#! /usr/bin/node

const { EOL } = require("os");
const {
    isMainThread,
    workerData,
    parentPort
} = require("worker_threads");

const minimist = require("minimist");

const bridge = require("./system/bridge.js");

// TODO Handle cli args and use as "standalone"
// Usage: bridge.js --upstream="..." --socket="tcp" --host="192.168.125.24" --port="443" --settings='{"foo": "bar"}' --options='{"bar": "baz"}'

// TODO If host&port are missing read/write from/to stdin/stdout
// Usefull for serial communiction or debugging
const argv = minimist(process.argv, {
    boolean: ["help"],
    default: {
        upstream: null,
        socket: "tcp",
        host: null,
        port: null,
        settings: "{}",
        options: "{}"
    }
});


// override arguments with json parsed string
argv.settings = JSON.parse(argv.settings);
argv.options = JSON.parse(argv.options);


// check arguments if used as cli client
if ((isMainThread && (!argv.upstream || !argv.host || !argv.port)) || argv.help) {
    console.group("Usage of bridge.js as cli tool:", EOL);
    console.log(`bridge.js --upstream="http://example.com" --host="127.0.0.1" --port="8080"`, EOL);
    console.log("--upstream\tWebSocket upstream to backend");
    console.log("--socket\tNetwork socket type: tcp|udp|raw");
    console.log("--host\tHost to connect to");
    console.log("--port\tHost port to connect to");
    console.log("[--settings]\tSettings object from interface as json string");
    console.log("[--options]\tDuplex stream optinos passed to WebSocket.createWebSocketStream");
    console.log("");
    process.exit(1);
}


// NOTE add `&& require.main.filename === __filename` to check?!
if (isMainThread && argv.upstream && argv.host && argv.port) {

    let settings = Object.assign({
        host: argv.host,
        port: argv.port,
        socket: argv.socket
    }, argv.settings);

    let options = Object.assign({
        // duplex stream options
        // passed to WebSocket.createWebSocketStream
    }, argv.options);

    // bridge the websocket stream to underlaying network socket
    bridge(argv.upstream, settings, options);

} else {

    // deconstruct arguments
    let { upstream, settings, options } = workerData;

    // bridge the websocket stream to underlaying network socket
    let ws = bridge(upstream, settings, options);

    parentPort.on("message", (msg) => {

        console.log("Received msg from parent", msg);

        if (msg === "disconnect") {

            ws.once("close", () => {
                process.exit(0);
            });

            ws.close();

        }
    });

}