const { BlockList } = require("net");
const { existsSync, readFileSync } = require("fs");
const dns = require("dns");
const net = require("net");

const logger = require("./logger.js");

module.exports = class Allowlist {

    constructor() {
        this.whitelist = [];
        this.allowlist = new BlockList();
    }

    load() {
        return new Promise((resolve, reject) => {

            try {
                if (!existsSync(process.env.ALLOWLIST_PATH)) {

                    logger.warn(`allowlist.json does not exists, skip.`);

                } else {

                    let content = readFileSync(process.env.ALLOWLIST_PATH);
                    this.whitelist = JSON.parse(content);

                }
            } catch (err) {

                logger.warn(err, "Could not read/parse allowlist.json");

            }


            if (!this.whitelist) {
                return resolve({
                    whitelist: [],
                    allowlist: this.allowlist,
                });
            }


            if (this.whitelist.length <= 0) {
                logger.warn(`Empty allowlist.json detected. Every connection attempt will be rejected!`);
            }

            const resolvers = this.whitelist.map((host) => {
                return new Promise((resolve) => {

                    if (host.includes("/")) {

                        let [range, prefix] = host.split("/");
                        this.allowlist.addSubnet(range, parseInt(prefix));

                        resolve();

                    } else if (net.isIP(host)) {

                        this.allowlist.addAddress(host);
                        resolve();

                    } else {

                        // dns.resolve does not work with *.local domains
                        // it sends raw dns queries to the dns server and do not respect avhai
                        dns.lookup(host, (err, addr) => {
                            //dns.resolve(host, (err, records) => {

                            if (err) {
                                logger.warn(err, `Could not resolve hostname "${err}"`);
                                return;
                            }

                            /*
                            // does only work with dns.resolve
                            records.forEach((ip) => {
                                allowlist.addAddress(ip);
                            });
                            */

                            allowlist.addAddress(addr);

                            resolve();

                        });

                    }

                });
            });


            Promise.all(resolvers).then(() => {
                resolve(this);
            }).catch(reject);

        });
    }

    includes(host) {
        return new Promise((resolve) => {

            if (this.whitelist.length === 0) {
                logger.debug(`Empty allowlist.json - abort connection bridging for host "${host}"`);
                return resolve(false);
            }

            if (this.whitelist.includes(host)) {

                resolve(true);

            } else if (net.isIP(host)) {

                resolve(this.allowlist.check(host));

            } else {

                dns.lookup(host, (err, addr) => {
                    if (err) {

                        logger.warn(err, `Could not resolve hostname "${host}"`);
                        resolve(false);

                    } else {

                        resolve(this.allowlist.check(addr));

                    }
                });

            }

        });
    }

    data() {
        return {
            whitelist: this.whitelist,
            allowlist: this.allowlist,
            self: this
        };
    }

};