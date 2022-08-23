const url = require("url");
const {
    Worker
} = require("worker_threads");

const MAPPINGS = new Map();


async function spawn(url2, settings) {

    if (MAPPINGS.has(url2)) {
        console.log("Terminating exisitng bridge!", url2);
        await MAPPINGS.get(url2).terminate();
    }

    let worker = new Worker("./bridge.js", {
        workerData: {
            upstream: String(url2),
            settings,
            options: {}
        }
    });

    worker.on("error", (err) => {
        console.log("Worker error", err);
        MAPPINGS.delete(url2);
    });

    worker.on("exit", (code) => {
        console.log(`Bridge ${url2} <-> ${settings.socket}://${settings.host}:${settings.port} finished`, code);
        MAPPINGS.delete(url2);
    });

    MAPPINGS.set(url2, worker);
    return Promise.resolve();

}


module.exports = (map, ws) => {

    MAPPINGS.forEach(async (worker) => {
        console.log("Termoinate worker", worker.threadId);
        await worker.terminate();
    });

    console.log("ws protocol: %s, map:", ws.protocol, map);

    ws.on("message", (msg) => {

        // parse data
        msg = JSON.parse(msg);

        // handle only device specifiy events.
        // Like added & updated devices rsp. interfaces
        if (msg.component === "devices" && ["add", "update"].includes(msg.event)) {

            console.log("Handle updated/added devices", msg);

            msg.data.interfaces.forEach((iface) => {

                // parse websocket urls
                let url1 = new url.URL(ws.url);
                let url2 = new url.URL(`${process.env.BACKEND_URL}/api/devices/${msg.data._id}/interfaces/${iface._id}`);

                url2.protocol = url1.protocol;

                spawn(url2, iface.settings);

            });

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

        console.log(`Bridge ${url2} <-> ${settings.socket}://${settings.host}:${settings.port}`);

        spawn(url2, settings);

    }

};