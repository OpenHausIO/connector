const net = require("net");

module.exports = ({ host, port }) => {

    const logger = require("../system/logger.js");

    let socket = new net.Socket();

    // keep socket alive
    socket.setKeepAlive(true, 5000);

    /*
    // breaks persistent TCP connections like eISCP
    // without a ping/pong/keepalive message
    // eISCP is established, but only data transmitet when needed, no "ping/pong/keepalive"
    // so this would falsly trigger a "timeout"
    // timeout logic should be implemented in the backend
    socket.setTimeout(60000, () => {
        logger.warn(`[timeout] tcp://${host}:${port} - keine Aktivität, schließe Verbindung`);
        socket.destroy(new Error("IDLE_TIMEOUT"));
    });
    */

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