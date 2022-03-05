const url = require("url")
const wsStream = require("./ws-stream.js");

const socket_tcp = require("./sockets/tcp.js");
const socket_udp = require("./sockets/udp.js");
const socket_raw = require("./sockets/raw.js");
const socket_ws = require("./sockets/ws.js");

module.exports = (map, ws) => {

    console.log("ws", ws.protocol)

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

    for ([uri, { transport, settings: { host, port } }] of map) {

        // parse websocket urls
        let url1 = new url.URL(ws.url);
        let url2 = new url.URL(uri);

        // override http(s) with ws(s)
        url2.protocol = url1.protocol;

        console.log(`Bridge "%s" <-> ${transport}://${host}:${port}`, url2)

        try {

            let upstream = wsStream(url2, {
                // duplex stream options
            });

            let socket = require(`./sockets/${transport}`)(host, port);

            upstream.pipe(socket);
            socket.pipe(upstream);


        } catch (err) {

            console.error("Error happendm %s", url2, err)

        }

    }

};