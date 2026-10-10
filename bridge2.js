#! /usr/bin/node

const { EOL } = require("os");
const {
    isMainThread,
    workerData,
    parentPort
} = require("worker_threads");

const minimist = require("minimist");


const argv = minimist(process.argv, {
    boolean: ["help"],
    default: {
        upstream: "",
        socket: "tcp",
        host: "",
        port: ""
    }
});


if (!isMainThread) {

    // arguments passed via workerData
    // patch argv object with passed data
    Object.assign(argv, workerData);

}


// check arguments if used as cli client or spawend via worker thread
if ((isMainThread && (!argv.upstream || !argv.host)) || argv.help || (!argv.port && argv.socket !== "raw")) {
    console.group("Usage of bridge.js as cli tool:", EOL);
    console.log(`bridge.js --upstream="ws://example.com" --host="127.0.0.1" --port="8080" --socket="tcp"`);
    console.log(`bridge.js --upstream="ws://open-haus.lan/api/foo/bar" --host="172.16.0.11" --socket="udp" --port="53"`);
    console.log(`bridge.js --upstream="ws://127.0.0.1:8080/api/devices/663fc49985397fe02064d60d/interfaces/663fc4a06a1e907dd8e86f0e" --socket="tcp" --host="127.0.0.1" --port="8123"`);
    console.log(`bridge.js --upstream="ws://127.0.0.1:8080/api/devices/663fc4b0490a00181d03486c/interfaces/663fc4b5d6cf46265f713ba4" --host="192.168.2.1" --socket="raw"`, EOL);
    console.log("--upstream\tWebSocket upstream endpoint");
    console.log("--socket\tNetwork socket type: tcp|udp|raw");
    console.log("--host\tHost to connect to");
    console.log("--port\tHost port to connect to");
    console.log("");
    process.exit(1);
}

//console.log(`bridge2.js --upstream="${argv.upstream}" --host="${argv.host}" --port="${argv.port}" --socket="${argv.socket}"`);



if (!isMainThread) {

    let { ws } = require("./system/socket.js")({
        upstream: argv.upstream,
        host: argv.host,
        port: argv.port,
        socket: argv.socket
        // options = new WebSocket(..., options);
        // pass/build x-auth-token header
    });

    ws.on("close", () => {
        process.exit(0);
    });

    parentPort.on("message", (msg) => {
        if (msg === "disconnect") {

            ws.close(() => {
                process.exit(0);
            });

        }
    });

} else {

    // the cli tool "bridge.js" makes no sense anymore.
    // since the backend is switched to a request/response socket creation
    // BUT: It could be helpful to start the connector in a single/filter mode
    // E.g. listen on a specific interface for bridge requests
    // implement here the ws connection to ws://<host>:<port>/api/system/connector
    // and listen for bridge requests and do the job

    /*
    let worker = new Worker(__filename);

    process.once("SIGINT", () => {
        worker.postMessage("disconnect");
    });
    */

}