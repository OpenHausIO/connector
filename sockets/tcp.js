const net = require("net");

module.exports = ({ host, port }) => {

    /*
    for(key in options){
        if(options[key] instanceof Array){
            socket[key].apply(socket, options[key]);
        }
    }
    */

    let socket = new net.Socket();

    // keep socket alive
    //socket.setKeepAlive(true, 60000);

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