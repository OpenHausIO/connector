const path = require("path");
const pkg = require("./package.json");

console.log(`Starting Connector v${pkg.version}...`);

// 1) fetch devices from backend
// 2) buld mapping interface ws endpoint to interface obj (tcp/udp/raw socket)
// 2) Try to connect to socket
// 3) if conneciton not possible, try again when data from ws arrives

let env = {};

try {

    env = require("dotenv").config({
        path: path.resolve(process.cwd(), ".env")
    });

    if (env.error) {
        env.parsed = {};
    }

} catch (err) {
    //console.log("Could not load dotenv", err.message);
}


// default environment variables
process.env = Object.assign({
    NODE_ENV: "production",
    BACKEND_URL: "",
    BACKEND_PROTOCOL: "http",
    BACKEND_HOST: "127.0.0.1",
    BACKEND_PORT: "8080",
    RECONNECT_DELAY: "15",
    ENABLE_SSDP: "true",
    ENABLE_MDNS: "true",
    ALLOW_HALF_OPEN: "true",
    AUTOCONNECT: "true",
    STARTUP_DELAY: "0",
    MQTT_HOST: "127.0.0.1",
    MQTT_PORT: "1883",
    ENABLE_MQTT: "false",
    LOG_PATH: path.resolve(process.cwd(), "logs"),
    LOG_LEVEL: "info",
    LOG_DATEFORMAT: "yyyy.mm.dd - HH:MM.ss.l",
    LOG_SUPPRESS: "false",
    LOG_TARGET: "",
}, env.parsed, process.env);


// build backend url if its empty
if (process.env.BACKEND_URL === "") {
    process.env.BACKEND_URL = `${process.env.BACKEND_PROTOCOL}://`;
    process.env.BACKEND_URL += `${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}`;
}

setTimeout(() => {
    require("./bootstrap.js");
}, Number(process.env.STARTUP_DELAY));