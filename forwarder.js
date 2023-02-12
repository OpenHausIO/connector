const path = require("path");
const { Worker } = require("worker_threads");

const forwarder = [];

if (process.env.ENABLE_SSDP === "true") {
    forwarder.push("ssdp.js");
}

if (process.env.ENABLE_MDNS === "true") {
    forwarder.push("mdns.js");
}

if (process.env.ENABLE_MQTT === "true") {
    forwarder.push("mqtt.js");
}


console.log("Spanw forwareder worker", forwarder);

forwarder.forEach((file) => {

    let run = () => {

        let worker = new Worker(path.resolve(process.cwd(), file), {
            env: process.env
        });

        console.log(`Worker "${file}" has thread id:`, worker.threadId);

        worker.on("exit", (code) => {

            console.log(`Woker "${file}" exited:`, code);

            if (code === 0) {

                console.log("Worker exited without error, respawn anyway");

                setTimeout(() => {
                    run();
                }, process.env.RECONNECT_DELAY * 1000);

            } else {

                console.log("Worker exited error, respawn");

                setTimeout(() => {
                    run();
                }, process.env.RECONNECT_DELAY * 1000);

            }

        });

        worker.on("error", (err) => {

            console.error("err", err, "Restart worker in %sSec", process.env.RECONNECT_DELAY);

            /*
            setTimeout(() => {
                run();
            }, process.env.RECONNECT_DELAY * 1000);
            */

        });

    };

    run();

});