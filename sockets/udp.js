const dgram = require("dgram");
const { Duplex } = require("stream");

module.exports = ({ host, port }) => {

    let socket = dgram.createSocket("udp4");

    let stream = new Duplex({
        write(chunk, encoding, cb) {
            socket.send(chunk, cb);
        },
        read(size) {
            console.log("Read called", size);
        },
        end() {
            socket.close();
        }
    });

    socket.on("error", (err) => {
        console.error(`[error] udp://${host}:${port}`, err);
    });

    socket.on("close", () => {
        console.error(`[closed] udp://${host}:${port}`);
    });

    socket.on("connect", () => {
        console.error(`[connected] udp://${host}:${port}`);
    });

    // or use a dirty merge?!
    //Object.assign({}, socket, stream);

    socket.on("message", (msg) => {
        stream.push(msg);
    });

    socket.connect(port, host);

    return stream;

};