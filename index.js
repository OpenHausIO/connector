const path = require("path");

// 1) fetch devices from backend
// 2) buld mapping interface ws endpoint to interface obj (tcp/udp/raw socket)
// 2) Try to connect to socket
// 3) if conneciton not possible, try again when data from ws arrives


(() => {

    let env = {};

    try {

        env = require("dotenv").config({
            path: path.resolve(process.cwd(), ".env")
        });

        if (env.error) {
            env.parsed = {};
        }

    } catch (err) {
        console.log("Could not load dotenv", err.message);
    }


    // default environment variables
    process.env = Object.assign({
        NODE_ENV: "production",
        BACKEND_URL: "",
        BACKEND_PROTOCOL: "http",
        BACKEND_HOST: "127.0.0.1",
        BACKEND_PORT: "8080",
        RECONNECT_DELAY: "3000",
        ENABLE_SSDP: "true"
    }, env.parsed, process.env);


    // build backend url if its empty
    if (process.env.BACKEND_URL === "") {
        process.env.BACKEND_URL = `${process.env.BACKEND_PROTOCOL}://`;
        process.env.BACKEND_URL += `${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}`;
    }

})();


require("./bootstrap.js");
require("./autodiscover.js");