const url = require("url");
const wsStream = require("./ws-stream.js");

/**
 * @function bridge
 * Birdges a WebSocket endpoint to a network socket
 * 
 * @param {String} uri WebSocket URL endpoint
 */
function bridge(uri, settings) {
    try {

        let retry = false;

        let upstream = wsStream(uri);
        let stream = require(`./sockets/${settings.socket}`)(settings);

        //@TODO implement "waiting for data from upstream"
        // if socket stream closes (successful)
        // re-create one or wait for upstream data?

        upstream.on("error", (err) => {
            console.error("Could not bridge interface", settings, err);
        });

        upstream.on("close", () => {
            if (!retry) {

                retry = true;

                setTimeout(() => {

                    stream.end();
                    bridge(uri, settings);

                }, Number(process.env.RECONNECT_DELAY));

            }
        });

        stream.on("close", () => {
            if (!retry) {

                retry = true;

                setTimeout(() => {

                    upstream.end();
                    bridge(uri, settings);

                }, Number(process.env.RECONNECT_DELAY));

            }
        });

        upstream.pipe(stream);
        stream.pipe(upstream);

    } catch (err) {

        console.error("Error happend %s", uri, err);

    }
}

module.exports = (map, ws) => {

    console.log("ws protocol: %s, map:", ws.protocol, map);

    ws.on("message", (data) => {

        // parse data
        data = JSON.parse(data);

        // handle only device specifiy events.
        // Like added & updated devices rsp. interfaces
        if (data.component === "devices" && ["added", "updated"].includes(data.event)) {

            console.log("Handle updated/added devices", data);

        } else {

            //console.log("[event]", data);

        }

    });

    for (let [uri, { settings }] of map) {

        // parse websocket urls
        let url1 = new url.URL(ws.url);
        let url2 = new url.URL(uri);

        // override http(s) with ws(s)
        url2.protocol = url1.protocol;

        console.log(`Bridge "%s" <-> ${settings.socket}://${settings.host}:${settings.port}`, url2);

        bridge(url2, settings);

    }

};