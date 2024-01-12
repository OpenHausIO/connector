const net = require("net");

module.exports = ({ host, port }) => {

    const logger = require("../system/logger.js");

    let socket = new net.Socket();

    // keep socket alive
    socket.setKeepAlive(true, 5000);

    socket.on("error", (err) => {
        logger.error(`[error] tcp://${host}:${port}`, err);
    });

    socket.on("close", () => {
        logger.debug(`[closed] tcp://${host}:${port}`);
    });

    socket.on("connect", () => {
        logger.info(`[connected] tcp://${host}:${port}`);
    });

    socket.connect(port, host);

    return socket;

};