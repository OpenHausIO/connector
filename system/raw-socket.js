const raw = require("raw-socket");

const logger = require("./logger.js");

let socket = null;


try {

    socket = raw.createSocket({
        protocol: raw.Protocol.ICMP
    });

    // increate if many workers
    // icmp pings should be short lived
    //socket.setMaxListeners(0);

} catch (err) {

    // sudo setcap cap_net_raw=eip $(which node)
    logger.error("Could not create ICMP raw socket - missing cap_net_raw or root?", err);
    logger.warn(`Did you executed "sudo setcap cap_net_raw=eip $(which node)"? icmp/ping needs special socket permissions`)

}


function attach(port) {

    if (!socket) {

        port.postMessage({
            type: "error",
            message: "ICMP raw socket not available on this host"
        });

        port.close();
        return;

    }

    // { start: bigint }
    let pending = null;

    const onMessage = (buffer, source) => {

        const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        const rttMs = pending ? Number(process.hrtime.bigint() - pending.start) / 1e6 : null;

        port.postMessage({
            type: "message",
            buffer: ab,
            source,
            rttMs
        }, [ab]);

    };

    const onError = (err) => {

        port.postMessage({
            type: "error",
            message: err.message
        });

    };

    socket.on("message", onMessage);
    socket.on("error", onError);

    port.once("close", () => {
        socket?.off("message", onMessage);
        socket?.off("error", onError);
    });

    port.on("message", (msg) => {
        if (msg?.type === "send") {

            const chunk = Buffer.from(msg.buffer);

            chunk.writeUInt16BE(0, 2);
            raw.writeChecksum(chunk, 2, raw.createChecksum(chunk));

            pending = {
                start: process.hrtime.bigint()
            };

            socket?.send(chunk, 0, chunk.length, msg.host, (err) => {
                if (err) {

                    port.postMessage({
                        type: "error",
                        message: err.toString()
                    });

                }
            });

        }
    });

}


module.exports = {
    socket,
    attach
};