const { URL } = require("url");

function rewriteURL(inputUrl) {

    let parsedUrl = new URL(inputUrl);

    if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
    } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
    } else {
        throw new Error("Unsupported protocol");
    }

    return parsedUrl.toString();

}

module.exports = rewriteURL;