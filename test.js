const {
    isMainThread,
    Worker
} = require("worker_threads");

const raw = require("raw-socket");


if (isMainThread && process.argv[2] !== "--direct") {

    let worker = new Worker(__filename, {
        env: process.env
    });

    worker.once("online", () => {
        console.log("[main] Worker online");
    });

    worker.once("error", (err) => {
        console.log("[main] Worker error", err);
    });

    worker.once("exit", (code) => {
        console.log("[main] Worker exited", code);
    });

} else {
    try {

        console.log("[worker] send ping");

        let socket = raw.createSocket({
            protocol: raw.Protocol.ICMP
        });

        // without this, no "Speicherzugriffsfehler"/"Memory access error" error is printed
        // worker exit with code 0, no error/hint printed
        console.log("socket created");

        socket.on("message", (buffer, source) => {
            console.log(`[worker] response recieved answer from ${source}`, buffer);
        });

        // ICMP echo (ping) request
        var buffer = Buffer.from([
            0x08, 0x00, 0x00, 0x00, 0x00, 0x01, 0x0a, 0x09,
            0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68,
            0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70,
            0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x61,
            0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69
        ]);

        raw.writeChecksum(buffer, 2, raw.createChecksum(buffer));

        socket.send(buffer, 0, buffer.length, "8.8.8.8", (error) => {
            if (error) {
                console.log("[worker] ping error", error.toString());
            } else {
                console.log(`[worker] ping send to 8.8.8.8`);
            }
        });

    } catch (err) {

        console.log(err);

    }
}