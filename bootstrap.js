const { readFileSync, existsSync } = require("fs");
const os = require("os");
const pkg = require("./package.json");

const WebSocket = require("ws");
const request = require("./helper/request.js");
const logger = require("./system/logger.js");
const Allowlist = require("./system/class.allowlist.js");

const rewriteURL = require("./helper/rewrite-url.js");
const mappings = Object.create(null);


// retry flags
var crashed = false;
var counter = 0;
var whitelist = null;


try {
    if (!existsSync(process.env.ALLOWLIST_PATH)) {

        logger.warn(`allowlist.json does not exists, skip.`);

    } else {

        const content = readFileSync(process.env.ALLOWLIST_PATH);
        whitelist = JSON.parse(content);

    }
} catch (err) {

    logger.warn(err, "Could not read/parse allowlist.json");

}


// 1) fetch devices / interfaes
// 2) setup ws connections to /events & /system/connector
// 3) listen for changes in evetns & update interface settings
// 4) listen for bridge connections & spawn cli worker/child process

function bootstrap() {

    request(`${process.env.BACKEND_URL}/api/devices`).then((result) => {

        logger.debug(`Fetched ${process.env.BACKEND_URL}/api/devices`);

        if (result.status !== 200) {
            logger.error("HTTP Status != 200;", result.status, result);
            process.exit(1);
        }



        mappings.i2d = new Map();
        mappings.i2s = new Map();
        mappings.url2iface = new Map();
        //mappings.connections = 0;
        mappings.info = Object.create(null);

        // build interface/device mapping
        result.body.filter((device) => {

            return device.enabled;

        }).forEach((device) => {

            //console.log("device", device)

            device.interfaces.forEach((iface) => {

                let { _id, settings } = iface;
                mappings.i2d.set(_id, device);
                mappings.i2s.set(_id, settings);

                // legacy map for "handler.js"
                // remove in furtuher versions
                mappings.url2iface.set(`${process.env.BACKEND_URL}/api/devices/${device._id}/interfaces/${_id}`, iface);

            });

        });

        return Promise.resolve(mappings);

    }).then((mappings) => {
        return Promise.all([

            // pass down mapping object
            Promise.resolve(mappings),

            // connecto to /api/events
            new Promise((resolve, reject) => {

                let ws = new WebSocket(rewriteURL(`${process.env.BACKEND_URL}/api/events?intents[]=add&intents[]=update&intents[]=remove`), {
                    headers: {
                        "x-auth-token": process.env.AUTH_TOKEN
                    }
                });

                ws.once("open", () => {
                    logger.debug(`WebSocket connected to "${ws.url}"`);
                    resolve(ws);
                });

                ws.once("error", (err) => {
                    logger.error(`WebSocket error for "${ws.url}":`, err);
                    reject(err);
                });

                ws.once("close", (code) => {
                    logger.error(`WebSocket connection closed to "${ws.url}", code:`, code);
                    retry();
                });

            }),

            // connect to /api/system/connector
            new Promise((resolve, reject) => {

                if (process.env.BRIDGE_SOCKETS !== "true") {
                    return resolve(null);
                }

                mappings.info = {
                    version: pkg.version,
                    whitelist,
                    hostname: os.hostname(),
                    interfaces: Object.entries(os.networkInterfaces()).flatMap(([name, addresses]) => {
                        return addresses.filter(addr => {
                            return !addr.internal && addr.family === "IPv4";
                        }).map((addr) => {
                            return {
                                name,
                                address: addr.address,
                                netmask: addr.netmask,
                                mac: addr.mac
                            };
                        });
                    }),
                    connections: 0,
                };

                let ws = new WebSocket(rewriteURL(`${process.env.BACKEND_URL}/api/system/connector`), {
                    headers: {
                        "x-auth-token": process.env.AUTH_TOKEN
                    }
                });

                ws.once("open", () => {

                    logger.debug(`WebSocket connected to "${ws.url}"`);

                    let json = JSON.stringify({
                        event: "info",
                        info: mappings.info
                    });

                    ws.send(json);
                    resolve(ws);

                });

                ws.once("error", (err) => {
                    logger.error(`WebSocket error for "${ws.url}":`, err);
                    reject(err);
                });

                ws.once("close", (code) => {
                    logger.error(`WebSocket connection closed to "${ws.url}", code:`, code);
                    retry();
                });

            }),

            // build/load allow list
            new Allowlist().load()

        ]);
    }).then(([mappings, events, connector, allowlist]) => {

        // reset flags
        counter = 0;
        crashed = false;

        logger.info("Ready to bridge traffic");

        if (process.env.BRIDGE_SOCKETS === "true") {
            require("./socket.js")(mappings, connector, allowlist); // new bridiging
        }

        if (process.env.BRIDGE_LEGACY === "true") {
            //require("./events.js")(mappings, events);
            require("./handler.js")(mappings.url2iface, events); // legacy bridiging
        }

        // without this, the connececto does not detect interfaces changes or new added ones
        require("./events.js")(mappings, events);
        require("./forwarder.js");

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

        }, Number(process.env.RECONNECT_DELAY * 1000));

    }

    crashed = true;

}

bootstrap();