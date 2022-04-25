const net = require("net");

module.exports = ({ host, port }) => {

    let socket = new net.Socket();

    socket.on("error", (err) => {
        console.error(`[error] tcp://${host}:${port}`, err);
    });

    socket.on("close", () => {
        console.error(`[closed] tcp://${host}:${port}`);
    });

    socket.on("connect", () => {
        console.error(`[connected] tcp://${host}:${port}`);
    });

    socket.connect(port, host);

    return socket;

};