const dgram = require("dgram");
const { Duplex } = require("stream");

module.exports = ({ host, port }) => {

    const logger = require("../system/logger.js");
    let socket = dgram.createSocket("udp4");

    let stream = new Duplex({
        write(chunk, encoding, cb) {
            socket.send(chunk, cb);
        },
        read(size) {
            logger.verbose(`udp://${host}:${port} Read called`, size);
        },
        end(chunk) {
            if (chunk) {
                socket.send(chunk);
            }
            socket.close();
        }
    });

    socket.on("error", (err) => {
        logger.error(`[error] udp://${host}:${port}`, err);
    });

    socket.on("close", () => {
        logger.debug(`[closed] udp://${host}:${port}`);
    });

    socket.on("connect", () => {
        logger.info(`[connected] udp://${host}:${port}`);
    });

    // or use a dirty merge?!
    //Object.assign({}, socket, stream);

    socket.on("message", (msg) => {
        stream.push(msg);
    });

    socket.connect(port, host);

    return stream;

};