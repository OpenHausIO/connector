const { Duplex } = require("stream");
const raw = require("raw-socket");

// this file handles raw network sockets
// the protocol implemtnation is done on the server side
const logger = require("../system/logger.js");

module.exports = ({ host, port }) => {

    let socket = raw.createSocket({
        protocol: raw.Protocol.ICMP
    });

    let stream = new Duplex({
        write(chunk, encoding, cb) {

            console.log("Write to device", `raw://${host}:${port}`, chunk);

            socket.send(chunk, 0, chunk.length, host, (error) => {
                console.log("Writen to devoce");
                if (error)
                    console.log(error.toString());

                cb(error);
            });


        },
        read(size) {
            logger.verbose(`raw://${host}:${port} Read called`, size);
        },
        end(chunk) {
            if (chunk) {
                socket.send(chunk, 0, chunk.length, host, (error) => {
                    if (error)
                        console.log(error.toString());
                });
            }
            socket.close();
        }
    });

    socket.on("error", (err) => {
        logger.error(`[error] raw://${host}:${port}`, err);
    });

    socket.on("close", () => {
        logger.debug(`[closed] raw://${host}:${port}`);
    });

    socket.on("message", (buffer, source) => {
        if (source === host) {
            console.log("received " + buffer.length + " bytes from " + source);
            stream.push(buffer);
        }
    });

    return stream;

};