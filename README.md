# Connector
Forwards traffic between the [backend](https://github.com/OpenHausIO/backend) &amp; local network devices over WebSockets.
To controll your devices on your local network, it is necessary to have a piece of software running on your local network.

> NOTE: This application is in a eraly developmen state!

## Environment variables
| Name             | Default value | Description                                       |
| ---------------- | ------------- | ------------------------------------------------- |
| NODE_ENV         | `production`  | `production` or `development`                     |
| BACKEND_URL      |               | Full URL to backend. E.g. `http://172.16.0.15:80` |
| BACKEND_PROTOCOL | `http`        | Protocol for HTTP/WS requests: `http` or `https`  |
| BACKEND_HOST     | `127.0.0.1`   | Backend IP/Hostname                               |
| BACKEND_PORT     | `8080`        | Backend Webserver port                            |
| RECONNECT_DELAY  | `3000`        | Delay between disconnect & connecting again       |

## Usage of single bridge
### General
```sh
./bridge.js --upstream="ws://127.0.0.1:8080/api/devices/<_id>/interfaces/<_id>" --socket="tcp" --host="<host>" --port="<port>"
```

### Example
```sh
./bridge.js --upstream="ws://127.0.0.1:8080/api/devices/625c311123ed9311d25efbeb/interfaces/625c311123ed9311d25efbec" --host="licht.lan" --port="443"
./bridge.js --upstream="ws://127.0.0.1:8080/api/devices/625c311123ed9311d25efbeb/interfaces/625c311123ed9311d25efbec" --host="licht.lan" --port="80"
```

```sh
./bridge.js --upstream="ws://127.0.0.1:8080/api/devices/625c330e23ed9311d25efbee/interfaces/625c330e23ed9311d25efbef" --host="av-receiver.lan" --port="60128"
```

```sh
./bridge.js --upstream="ws://127.0.0.1:8080/api/devices/62a4c005b9e05a649f6cec57/interfaces/62a4c005b9e05a649f6cec58" --host="av-receiver.lan"
```