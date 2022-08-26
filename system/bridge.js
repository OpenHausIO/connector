const { EOL } = require("os");
const WebSocket = require("ws");

/**
 * @function bridge
 * Birdges a WebSocket endpoint to a network socket
 * 
 * @param {String} uri WebSocket URL endpoint
 */
function bridge(uri, settings, options) {
    try {

        let ws = new WebSocket(uri);
        let upstream = WebSocket.createWebSocketStream(ws, options);
        let stream = require(`../sockets/${settings.socket}`)(settings);

        // TODO implement "waiting for data from upstream"
        // TODO implement "waiting for data from downstream"
        upstream.on("error", (err) => {
            console.error(`Could not bridge interface ${settings.socket}://${settings.host}:${settings.port}${EOL}`, err);
        });

        stream.on("error", (err) => {
            if (["ECONNRESET", "ECONNREFUSED"].includes(err.code) && process.env.ALLOW_HALF_OPEN === "true") {

                // waiting for data from websocket connection
                // before re-try to connect
                upstream.unpipe();
                stream.unpipe();

                // create here new socket stream instance
                // NOTE Overriding steam object is stupid

                // NOTE: DRAFT!
                upstream.once("data", (chunk) => {

                    let stream = require(`../sockets/${settings.socket}`)(settings);

                    upstream.pipe(stream);
                    stream.pipe(upstream);

                    // neccassary to not loose data?!
                    stream.write(chunk);

                });

            }
        });

        upstream.pipe(stream);
        stream.pipe(upstream);

        return {
            upstream,
            stream
        };

    } catch (err) {

        console.error("Error happend %s", uri, err);

    }
}

module.exports = bridge;