#! /usr/bin/node

const {
    isMainThread,
    workerData
} = require("worker_threads");

const optimist = require("optimist");

const bridge = require("./system/bridge.js");

// TODO Handle cli args and use as "standalone"
// Usage: bridge.js --upstream="..." --socket="tcp" --host="192.168.125.24" --port="443" --settings='{"foo": "bar"}' --options='{"bar": "baz"}'

// TODO If host&port are missing read/write from/to stdin/stdout
// Usefull for serial communiction or debugging

// TODO dont work like that, chaning looks terrible ugly...
optimist.describe("upstream", "WebSocket upstream to backend");
optimist.describe("socket", "Network socket type: tcp|udp|raw");
optimist.describe("host", "Host to with connect to");
optimist.describe("port", "Host port to with connect to");
optimist.describe("settings", "Settings object from interface as json string");
optimist.describe("options", "Duplex stream optinos passed to WebSocket.createWebSocketStream");


const { argv } = optimist.default({
    upstream: null,
    socket: "tcp",
    host: null,
    port: null,
    settings: "{}",
    options: "{}"
});


// override arguments with json parsed string
argv.settings = JSON.parse(argv.settings);
argv.options = JSON.parse(argv.options);


// check arguments if used as cli client
if (isMainThread && (!argv.upstream || !argv.host || !argv.port)) {
    console.log("Specify more arguments!");
    process.exit(1);
}


// global var for events
const STREAMS = {
    upstream: null,
    downstream: null
};


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