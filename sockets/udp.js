const dgram = require("dgram");
const { Duplex } = require("stream");

module.exports = ({ host, port }) => {

    const logger = require("../system/logger.js");
    let socket = dgram.createSocket("udp4");

    let stream = new Duplex({
        write(chunk, encoding, cb) {

            // feedback
            logger.verbose(`udp://${host}:${port} .write called`);

            // write to underlaying network socket
            socket.send(chunk, 0, chunk.length, port, host, (err, resp) => {

                // echo back magic packet if we handle WoL
                // this allows to check in the backend if the package was send
                // this is not standard as devices do not respond to WoL packats
                if (port === 9 && host === "255.255.255.255") {
                    stream.push(chunk);
                }

                // close socket if WoL package was send
                // broadcast messages are special, and we should not block them
                if (chunk.length === resp && port === 9 && host === "255.255.255.255") {
                    socket.close();
                }

                cb(err);

            });

        },
        read(size) {
            logger.verbose(`udp://${host}:${port} .read called`, size);
        },
        end(chunk) {
            if (chunk) {
                socket.send(chunk, 0, chunk.length, port, host);
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

    // "hot fix", till "options setting" are implmented
    socket.once("listening", () => {
        if (host === "255.255.255.255") {
            socket.setBroadcast(true);
        }
    });

    // or use a dirty merge?!
    //Object.assign({}, socket, stream);

    socket.on("message", (msg) => {
        stream.push(msg);
    });

    // if its a broadcast address
    // connect is not needed
    /*
    if (host !== "255.255.255.255") {
        socket.connect(port, host);
    }
    */
    // socket.connect is not necessary
    // calling socket.send() bind/connect automaticly
    // https://nodejs.org/docs/latest/api/dgram.html#socketconnectport-address-callback

    return stream;

};