const path = require("path");
const { Worker } = require("worker_threads");

const logger = require("./system/logger.js");
const log = logger.create("forwarder");

const forwarder = [];

if (process.env.ENABLE_SSDP === "true") {
    log.debug("SSDP Enabled");
    forwarder.push("ssdp.js");
}

if (process.env.ENABLE_MDNS === "true") {
    log.debug("MDNS Enabled");
    forwarder.push("mdns.js");
}

if (process.env.ENABLE_MQTT === "true") {
    log.debug("MQTT Enabled");
    forwarder.push("mqtt.js");
}

forwarder.forEach((file) => {

    let run = () => {

        let worker = new Worker(path.resolve(process.cwd(), file), {
            env: process.env
        });

        log.verbose(`Worker "${file}" has thread id:`, worker.threadId);

        worker.on("exit", (code) => {

            log.debug(`Woker "${file}" exited:`, code);

            if (code === 0) {

                log.verbose("Worker exited without error, respawn anyway");

                setTimeout(() => {
                    run();
                }, process.env.RECONNECT_DELAY * 1000);

            } else {

                log.warn("Worker exited with error, respawn");

                setTimeout(() => {
                    run();
                }, process.env.RECONNECT_DELAY * 1000);

            }

        });

        worker.on("error", (err) => {
            log.error(`Error in worker "${file}"`, err);
        });

    };

    run();

});