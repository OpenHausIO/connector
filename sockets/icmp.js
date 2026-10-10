const { workerData, threadId } = require("worker_threads");
const { Duplex } = require("stream");

// NOTE: Drop this all and switch to `ping` binary?
// could be parsed with readline & send over WS/stream
// this would prevent the need of "setcap"/cap_net_raw=epi

module.exports = ({ host }) => {

    const logger = require("../system/logger.js");
    const port = workerData?.icmpPort;

    let seq = 0;
    let pending = null; // { seq, done, timer, resolve }

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    function ping(timeout) {
        return new Promise((resolve) => {

            const buffer = Buffer.alloc(64);
            buffer.writeUInt8(8, 0);
            buffer.writeUInt8(0, 1);
            buffer.writeUInt16BE(0, 2);
            buffer.writeUInt16BE(threadId & 0xffff, 4);

            const currentSeq = (++seq) & 0xffff;
            buffer.writeUInt16BE(currentSeq, 6);
            buffer.write("OpenHaus", 8);

            pending = {
                seq: currentSeq,
                done: false,
                resolve,
                timer: setTimeout(() => {
                    if (pending && !pending.done) {

                        pending.done = true;

                        resolve({
                            timeout: true,
                            rttMs: null,
                            seq: currentSeq,
                            source: host
                        });

                    }
                }, timeout)
            };

            const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

            port.postMessage({
                type: "send",
                host,
                buffer: ab
            }, [ab]);

        });
    }

    let stream = new Duplex({
        async write(chunk, encoding, cb) {

            let options = {
                timeout: 2000,
                count: 1,
                interval: 1000
            };

            try {

                options = Object.assign(options, JSON.parse(chunk));

            } catch (err) {

                logger.warn(`icmp://${host} invalid options chunk, using defaults`, chunk.toString());

            }

            logger.verbose(`icmp://${host} .write called`, options);

            for (let i = 0; i < options.count; i++) {

                const result = await ping(options.timeout);
                stream.push(JSON.stringify(result));

                // nach dem letzten Ping keine Pause mehr abwarten
                if (i < options.count - 1 && options.interval > 0) {
                    await delay(options.interval);
                }

            }

            cb();

            // Alle angeforderten Pings sind durch - Session beenden
            stream.push(null); // Readable: EOF signalisieren
            stream.destroy();  // -> destroy(err, cb) Hook -> port.close()          

        },
        read(size) {
            logger.verbose(`icmp://${host} .read called`, size);
        },
        destroy(err, cb) {
            port.close();
            cb(err);
        }
    });

    port.on("message", (msg) => {
        if (msg.type === "message") {
            if (msg.source === host && pending && !pending.done) {

                const buffer = Buffer.from(msg.buffer);

                logger.verbose(`icmp://${host} received ${buffer.length} bytes from ${msg.source}`);

                pending.done = true;
                clearTimeout(pending.timer);

                pending.resolve({
                    timeout: false,
                    rttMs: msg.rttMs,
                    seq: pending.seq,
                    source: host
                });

            }
        } else if (msg.type === "error") {

            logger.error(`icmp://${host}`, msg.message);

        }
    });

    return stream;

};