module.exports = (mappings, ws) => {

    ws.on("message", (msg) => {

        msg = JSON.parse(msg);

        if (msg.component === "devices") {

            let device = msg.args[0];

            if (msg.event === "add") {
                console.log("Device in backend added", device);
            } else if (msg.event === "update") {
                console.log("Device in backend updated", device);
            }

            //console.log("Handle updated/added devices", msg);
            if (["add", "update", "remove"].includes(msg.event)) {
                if (msg.event === "add" || msg.event === "update") {

                    device.interfaces.forEach(({ _id, settings }) => {
                        mappings.i2d.set(_id, device._id);
                        mappings.i2s.set(_id, settings);
                    });

                } if (msg.event === "remove") {

                    device.interfaces.forEach(({ _id }) => {
                        mappings.i2d.delete(_id);
                        mappings.i2s.delete(_id);
                    });

                }
            }

        }
    });


};