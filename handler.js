const url = require("url");
const {
    Worker
} = require("worker_threads");
const logger = require("./system/logger.js");

const MAPPINGS = new Map();


async function spawn(url2, settings) {

    if (MAPPINGS.has(url2)) {
        logger.verbose("Terminating exisitng bridge!", url2);
        await MAPPINGS.get(url2).terminate();
    }

    let worker = new Worker("./bridge.js", {
        workerData: {
            upstream: String(url2),
            settings,
            options: {}
        },
        env: process.env
    });

    worker.on("error", (err) => {
        logger.error("Worker error", err);
        MAPPINGS.delete(url2);
    });

    worker.on("exit", (code) => {
        logger.debug(`Bridge ${url2} <-> ${settings.socket}://${settings.host}:${settings.port} finished`, code);
        MAPPINGS.delete(url2);
    });

    logger.debug(`Bridge ${url2} <-> ${settings.socket}://${settings.host}:${settings.port}`);

    MAPPINGS.set(url2, worker);
    return Promise.resolve();

}


module.exports = (map, ws) => {

    /* eslint-disable  no-unused-vars */
    let pendingPromises = Array.from(MAPPINGS).map(([url, worker]) => {
        logger.verbose("Terminate worker", worker.threadId);
        return worker.terminate();
    });

    Promise.all(pendingPromises).then(() => {

        ws.on("message", (msg) => {

            // parse data
            msg = JSON.parse(msg);

            // handle only device specifiy events.
            // Like added & updated devices rsp. interfaces
            if (msg.component === "devices") {

                let device = null;

                if (msg.event === "add") {
                    device = msg.args[0];
                } else if (msg.event === "update") {
                    device = msg.args[0];
                }

                //console.log("Handle updated/added devices", msg);
                if (["add", "update", "remove"].includes(msg.event)) {
                    device.interfaces.forEach((iface) => {

                        // parse websocket urls
                        let url1 = new url.URL(ws.url);
                        let url2 = new url.URL(`${process.env.BACKEND_URL}/api/devices/${device._id}/interfaces/${iface._id}`);

                        // set ws endpoint protocol
                        url2.protocol = url1.protocol;

                        if (msg.event === "add") {

                            // bridge added device
                            spawn(url2.toString(), iface.settings);

                        } else if (msg.event === "update") {

                            logger.debug(`iface ${iface._id} updated, wait 1.5s`);

                            // get worker instance from mapping
                            // send "shutdown" message to it
                            // listen for the exit event with code 0
                            // respawn worker

                            let worker = MAPPINGS.get(url2.toString());

                            if (!worker) {
                                return;
                            }

                            worker.once("exit", (code) => {
                                if (code === 0) {

                                    setTimeout(() => {

                                        // bridge updated device again
                                        spawn(url2.toString(), iface.settings);

                                    }, 1500);

                                }
                            });

                            // tell the worker to disconnect from ws endpoint
                            worker.postMessage("disconnect");

                        } else if (msg.event === "remove") {

                            // terminate bridiging for removed device
                            // TODO: Gracefullt shutodwn like in updated 
                            //MAPPINGS.get(url2.toString()).terminate();
                            let worker = MAPPINGS.get(url2.toString());
                            worker.postMessage("disconnect");

                            setTimeout(() => {
                                worker.terminate();
                            }, 5000);

                        }

                    });
                }

            }

        });

        for (let [uri, { settings }] of map) {

            // parse websocket urls
            let url1 = new url.URL(ws.url);
            let url2 = new url.URL(uri);

            // override http(s) with ws(s)
            url2.protocol = url1.protocol;

            //console.log(`Bridge ${url2} <-> ${settings.socket}://${settings.host}:${settings.port}`);

            spawn(url2.toString(), settings);

        }

    }).catch((err) => {

        logger.error("Could not terminate all worker", err);
        process.exit(1);

    });

};