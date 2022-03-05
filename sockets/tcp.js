// this file handles tcp "sockets"
// forward only payload between backend & socket

const net = require("net");

module.exports = (host, port) => {

    let socket = new net.Socket();

    socket.on("error", (err) => {
        //cb(err);
        console.error(`[error] tcp://${host}:${port}`, err)
    });

    socket.on("close", () => {
        console.error(`[closed] tcp://${host}:${port}`);
    });

    socket.on("connect", () => {
        console.error(`[connected] tcp://${host}:${port}`)
    });

    socket.connect(port, host);

    return socket;

};