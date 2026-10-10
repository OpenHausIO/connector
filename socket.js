const { URLSearchParams } = require("url");
const { Worker, MessageChannel } = require("worker_threads");

const rewriteURL = require("./helper/rewrite-url.js");
const logger = require("./system/logger.js");
//const icmpSystem = require("./system/icmp.js");
const { attach } = require("./system/raw-socket.js");

//module.exports = (mappings, ws, { whitelist, allowlist }) => {
module.exports = (mappings, ws, allowlist) => {

    let workers = new Set();
    //let intervall = null;

    ws.on("message", async (msg) => {
        try {

            // feedback
            logger.verbose("Message from backend for bidrigin interface", msg);

            let { iface, type, socket, uuid } = JSON.parse(msg);

            // TODO: drop `socket=true` and check instead if `iface.type=ETHERNET`
            if (type === "request" && mappings.i2d.has(iface) && socket) {

                let sp = new URLSearchParams();

                sp.set("socket", "true");
                sp.set("uuid", uuid);
                sp.set("type", "response");
                sp.set("x-auth-token", process.env.AUTH_TOKEN);


                let upstream = `${process.env.BACKEND_URL}/api/devices/${mappings.i2d.get(iface)?._id || mappings.i2d.get(iface)}/interfaces/${iface}`;
                let { host, port, socket } = mappings.i2s.get(iface);

                if (!host || !port || !socket) {
                    logger.warn(`Could not get host=${host}/port=${port}/socket=${socket} for interface "${iface}" in mappings`);
                    return;
                }

                /*
                let allowed = await new Promise((resolve) => {

                    if (whitelist.length === 0) {
                        logger.debug(`Empty allowlist.json - abort connection bridging for host "${host}"`);
                        return resolve(false);
                    }

                    if (whitelist.includes(host)) {

                        resolve(true);

                    } else if (net.isIP(host)) {

                        resolve(allowlist.check(host));

                    } else {

                        dns.lookup(host, (err, addr) => {
                            if (err) {

                                logger.warn(err, `Could not resolve hostname "${err}"`);
                                resolve(false);

                            } else {

                                resolve(allowlist.check(addr));

                            }
                        });

                    }

                });
                */

                logger.verbose(`check allowlist, ${host} = ${await allowlist.includes(host)}`);

                if (!await allowlist.includes(host)) {
                    logger.warn(`Host "${host}" is not in allowlist.json whitelist. Abort connection!`);
                    return;
                }

                const transferList = [];

                const workerData = {
                    upstream: `${rewriteURL(upstream)}?${sp.toString()}`,
                    host,
                    port,
                    socket
                };

                if (socket === "icmp") {

                    // ein MessageChannel pro Worker: port1 bleibt im Main-Thread
                    // und wird an den shared ICMP-Socket gehaengt, port2 wandert
                    // (per transfer!) in den Worker
                    const { port1, port2 } = new MessageChannel();

                    attach(port1);
                    workerData.icmpPort = port2;
                    transferList.push(port2);

                }

                let worker = new Worker("./bridge2.js", {
                    workerData,
                    transferList,
                    env: process.env
                });

                worker.info = {
                    host,
                    port,
                    socket
                };

                worker.once("online", () => {

                    logger.debug("Worker spawend for url %s", upstream);
                    mappings.info.connections += 1;

                    let json = JSON.stringify({
                        event: "info",
                        info: mappings.info
                    });

                    ws.send(json);

                });

                worker.once("exit", (code) => {

                    logger.debug("Worker exited with code %d: %s", code, upstream);
                    mappings.info.connections -= 1;

                    let json = JSON.stringify({
                        event: "info",
                        info: mappings.info
                    });

                    ws.send(json);
                    workers.delete(worker);

                });

                worker.once("error", (err) => {

                    console.error("Worker died", err, upstream);

                    mappings.info.connections -= 1;

                    let json = JSON.stringify({
                        event: "info",
                        info: mappings.info
                    });

                    ws.send(json);
                    workers.delete(worker);

                });

                workers.add(worker);

            } else {

                // feedback
                logger.debug("Invalid request", {
                    type,
                    "i2d-has": mappings.i2d.has(iface),
                    uuid,
                    socket,
                    iface,
                    mappings
                });

            }
        } catch (err) {

            logger.error(err, "Could not parse or handle bridge request");

        }
    });

    ["close", "error"].forEach((event) => {
        ws.once(event, () => {

            logger.warn("WS connection to /connector closed, terminate workers, event=%s", event);

            // why close? if the ws connection is dropped
            // there should also be the ws conenction in the workers closed
            // so they must exit on their own
            // instead do here a "force cleanup" after x amount of time
            setTimeout(() => {

                logger.info("Terminate %d reamaing active worker", workers.size);

                //clearInterval(intervall);

                Array.from(workers).forEach((worker) => {
                    worker.terminate();
                    workers.delete(worker);
                });

            }, 1);

        });
    });

    /*
    intervall = setInterval(() => {

        let byIface = {};

        Array.from(workers).forEach(({ info }) => {
            let key = info.host + ":" + info.port;
            byIface[key] = (byIface[key] || 0) + 1;
        });

        console.log();
        console.log();
        console.group("Active Worker Debug");
        console.log(workers);
        console.log("Active workers by target:", byIface);
        console.log(`length=${workers.size}`);
        console.groupEnd();

    }, 60_000);
    */

};