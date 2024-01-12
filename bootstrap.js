const url = require("url");
const WebSocket = require("ws");
const request = require("./request.js");
const logger = require("./system/logger.js");

// retry flags
var crashed = false;
var counter = 0;

function bootstrap() {
    Promise.all([

        // fetch devices from api
        new Promise((resolve, reject) => {
            request(`${process.env.BACKEND_URL}/api/devices`, (err, data) => {
                if (err) {

                    reject(err);

                } else {

                    let { body } = data;
                    let map = new Map();

                    body.filter(({ enabled }) => {
                        return enabled;
                    }).forEach(({ _id, interfaces }) => {
                        interfaces.filter((iface) => {

                            // filter only for ehternet interfaces
                            return iface.type === "ETHERNET";

                        }).forEach((iface) => {

                            // map ws endpoint with interface obj
                            map.set(`${process.env.BACKEND_URL}/api/devices/${_id}/interfaces/${iface._id}`, iface);

                        });
                    });

                    resolve(map);

                }
            });
        }),

        // connect to websocket events
        new Promise((resolve, reject) => {

            let uri = new url.URL(process.env.BACKEND_URL);
            uri.protocol = (process.env.BACKEND_PROTOCOL === "https" ? "wss" : "ws");
            uri.pathname = "/api/events";
            uri.search = `x-auth-token=${process.env.AUTH_TOKEN}`;

            let ws = new WebSocket(uri);

            ws.on("open", () => {

                logger.debug(`WebSocket connected to: ${ws.url}`);

                resolve(ws);

            });

            ws.on("error", (err) => {
                //console.error("Websocket", err);
                reject(err);
            });

            ws.on("close", (code) => {
                if (code === 1006) {

                    retry();

                } else {

                    console.warn("WebSocket (event) conneciton closed", code);

                }
            });

        })

    ]).then(([map, ws]) => {

        // reset flags
        counter = 0;
        crashed = false;

        logger.debug("Read to bridge traffic");

        require("./forwarder.js");
        require("./handler.js")(map, ws);

    }).catch((err) => {
        if (err.code === "ECONNREFUSED") {

            retry();

        } else {

            console.error(err);
            process.exit(1);

        }
    });
}


function retry() {

    if (!crashed) {

        logger.warn("Backend %s not reachable, retry attempt %d...", process.env.BACKEND_URL, counter + 1);

        setTimeout(() => {

            counter += 1;
            crashed = false;

            bootstrap();

        }, Number(process.env.RECONNECT_DELAY * 1000) || 3000);

    }

    crashed = true;

}

bootstrap();

