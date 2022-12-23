const { EOL } = require("os");
const { finished } = require("stream");
const WebSocket = require("ws");

/**
 * @function bridge
 * Birdges a WebSocket endpoint to a network socket
 * 
 * @param {String} uri WebSocket URL endpoint
 */
function bridge(uri, settings, options) {
    try {

        options = Object.assign({
            end: false
        }, options);

        let ws = new WebSocket(uri);

        ws.on("close", () => {
            console.log("Disconnected from WebSocket", ws.url);
        });

        ws.on("open", () => {
            console.log("Connected to WebSocket", ws.url);
        });

        let upstream = WebSocket.createWebSocketStream(ws, options);

        finished(upstream, {
            //readable: true,
            //writable: true,
            //end: true
        }, (err) => {
            console.log("Upstream is useless", err);
        });


        function loop(chunk = null) {

            // See comment further down.
            // "Explanation why pipe is not used"
            //upstream.unpipe();
            upstream.removeAllListeners();

            let stream = require(`../sockets/${settings.socket}`)(settings);

            if (chunk) {
                stream.write(chunk);
            }

            upstream.on("data", (chunk) => {
                stream.write(chunk);
            });

            stream.on("data", (chunk) => {
                upstream.write(chunk);
            });

            stream.on("end", () => {
                console.log("downstream ended", process.env.AUTOCONNECT);

                if (process.env.AUTOCONNECT === "true") {

                    console.log("Stream eded, waiting for websocket data to open again, ws.readyState:", ws.readyState);

                    // NOTE: DRAFT!
                    // NOTE: First tests looks promising 
                    upstream.once("data", (chunk) => {
                        loop(chunk);
                    });

                }
            });

            stream.on("error", (err) => {
                if (["ECONNRESET", "ECONNREFUSED"].includes(err.code) && process.env.ALLOW_HALF_OPEN === "true") {

                    console.log("Coult not connect, half open:", process.env.ALLOW_HALF_OPEN, err);

                    // NOTE: DRAFT!
                    // NOTE: First tests looks promising 
                    upstream.once("data", (chunk) => {
                        loop(chunk);
                    });

                }
            });

            // NOTE: Explanation why pipe is not used
            // pipe breaks something in the backend
            // when tcp socket is closed (Raspberry with ConBee/Zigbee Gateway), it breaks the http/websocket server
            // the whole backend need to to be restarted, inkl. connector & frontend.
            // perhaps this is not a node/ws problem per se. problem lays deeper in the kernel/tcp stack?!
            // occurs on Ubuntu 18.04 x64 LTS 5.4.0-126-generic #142~18.04.1-Ubuntu
            // see: https://github.com/OpenHausIO/backend/issues/198
            //upstream.pipe(stream, { end: false });
            //stream.pipe(upstream, { end: false });

        }

        loop();

        upstream.on("error", (err) => {
            console.error(`Could not bridge interface ${settings.socket}://${settings.host}:${settings.port}${EOL}`, err);
        });

        return ws;

    } catch (err) {

        console.error("Error happend %s", uri, err);

    }
}

module.exports = bridge;