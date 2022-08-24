const dgram = require("dgram");
const url = require("url");

const WebSocket = require("ws");
const { xml2json } = require("xml-js");

const request = require("./request");




let uri = new url.URL(process.env.BACKEND_URL);
uri.protocol = (process.env.BACKEND_PROTOCOL === "https" ? "wss" : "ws");
uri.pathname = "/api/ssdp";
const ws = new WebSocket(uri);


const socket = dgram.createSocket({
    type: "udp4",
    reuseAddr: true
});


async function parseHeader(msg) {

    let headers = {};
    let lines = msg.toString().split("\r\n");
    let type = lines[0];

    if (type.endsWith("* HTTP/1.1")) {
        type = type.split(" ")[0];
    } else if (type === "HTTP/1.1 200 OK") {
        type = "SEARCH-RESPONSE";
    } else {
        console.log("Unknwon type");
    }

    // store head key/value pair in object
    lines.slice(1, lines.length - 2).forEach((line) => {

        let [key, ...value] = line.split(":");

        let k = key.toLowerCase();
        let v = value.join(":").trim().replaceAll(`"`, "");

        headers[k] = v;

    });

    // for better handling, convert to lowercase
    type = type.toLowerCase();


    if (!["m-search", "notify", "search-response"].includes(type)) {
        console.log("UNKNOWN SSDP MESSAGE");
        throw new Error(`unknown ssdp message type ${type}`);
    }

    return {
        headers,
        type
    };

}

function fetchLocation(uri) {
    return new Promise((resolve, reject) => {
        request(uri, (err, result) => {
            if (err) {

                reject(err);

            } else {

                let { body } = result;

                let json = xml2json(body.toString(), {
                    compact: true,
                    spaces: 4
                });

                resolve(json);

            }
        });
    });
}

socket.on("message", async (msg, { address, port }) => {
    try {

        let { headers: { location, nts }, type } = await parseHeader(msg);

        if (type === "notify" && nts === "ssdp:alive" && location) {

            let description = await fetchLocation(location);

            let data = Buffer.concat([
                Buffer.from(msg),
                Buffer.from(description),
                Buffer.from("\r\n"),
                Buffer.from("\r\n")
            ]);

            console.log(`Send to server from client udp://${address}:${port} `, data);

            ws.send(data);

        } else {

            ws.send(msg);

        }

    } catch (err) {

        console.error(err);

    }
});


socket.on("listening", () => {

    const address = socket.address();
    console.log(`server listening ${address.address}:${address.port}`);

    console.log("udp server listening");

    socket.addMembership("239.255.255.250");

});



ws.on("open", () => {

    console.log(`Connected to  ${ws.url}`);

    // bind socket
    socket.bind(1900, "0.0.0.0");

});