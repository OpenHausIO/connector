#! /usr/bin/node

const { EOL } = require("os");
const {
    isMainThread,
    workerData
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


// global var for events
const STREAMS = {
    upstream: null,
    downstream: null
};


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
    let br = bridge(argv.upstream, settings, options);

    // attach to global vars
    STREAMS.upstream = br.upstream;
    STREAMS.downstream = br.stream;

} else {

    // deconstruct arguments
    let { upstream, settings, options } = workerData;

    // bridge the websocket stream to underlaying network socket
    let br = bridge(upstream, settings, options);

    // attach to global vars
    STREAMS.upstream = br.upstream;
    STREAMS.downstream = br.stream;

}


// handle returned streams
Object.keys(STREAMS).forEach((key) => {

    // exit codes explained:
    // 1 = general error, e.g. insueffecnt cli arguments
    // 100 = downstream error (host/device)
    // 200 = upstream error (backend)

    let stream = STREAMS[key];

    stream.on("close", () => {
        console.log("stream close called");
        process.exit(0);
    });

    stream.on("error", (err) => {
        console.error(err);
        process.exit(1);
    });

    stream.on("end", () => {
        console.log("stream ended");
        process.exit(0);
    });

});