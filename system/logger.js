const path = require("path");
const { Writable } = require("stream");
const { createWriteStream } = require("fs");
const { EOL } = require("os");


const Logger = require("./class.logger.js");
const formatter = require("./formatter.js");

if (!process.env.LOG_PATH) {
    process.env.LOG_PATH = path.resolve(process.cwd(), "logs");
}

const combined = createWriteStream(path.resolve(process.env.LOG_PATH, "combined.log"), {
    flags: "a"
});

[combined].forEach((stream) => {
    stream.on("error", (err) => {
        console.error(err);
        process.exit(1);
    });
});


const stdout = new Writable({
    write: (chunk, encoding, cb) => {

        chunk = JSON.parse(chunk);
        chunk.message = formatter(chunk);

        //console.log(chunk.message);
        process.stdout.write(chunk.message + EOL);

        if (chunk.error) {
            console.log(JSON.parse(chunk.error).stack + EOL);
        }

        cb(null);

    }
});


const options = {
    name: "system",
    streams: [
        stdout,
        combined
    ],
    level: process.env.LOG_LEVEL
};


const logger = new Logger(options);


Object.defineProperty(logger, "create", {
    value: function create(name) {

        let opts = Object.assign({}, options, {
            name,
            streams: [
                stdout,
                combined
            ]
        });

        return new Logger(opts);

    },
    writable: false,
    configurable: false,
    enumerable: false
});


if (process.env.LOG_TARGET) {
    logger.warn(`Log target set to "${process.env.LOG_TARGET}"`);
}


module.exports = logger;