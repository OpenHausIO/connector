# Connector
Forwards traffic between the [backend](https://github.com/OpenHausIO/backend) &amp; local network devices over WebSockets.
To controll your devices on your local network, it is necessary to have a piece of software running on your local network.

> NOTE: This application is in a eraly developmen state!

## Environment variables
| Name             | Default value | Description                                            |
| ---------------- | ------------- | ------------------------------------------------------ |
| NODE_ENV         | `production`  | `production` or `development`                          |
| BACKEND_URL      |               | Full URL to backend. E.g. `http://172.16.0.15:80`      |
| BACKEND_PROTOCOL | `http`        | Protocol for HTTP/WS requests: `http` or `https`       |
| BACKEND_HOST     | `127.0.0.1`   | Backend IP/Hostname                                    |
| BACKEND_PORT     | `8080`        | Backend Webserver port                                 |
| RECONNECT_DELAY  | `15`          | Delay between disconnect & connecting again in Seconds |
| ENABLE_SSDP      | `true`        | Enable SSDP Autodiscover?                              |
| ALLOW_HALF_OPEN  | `false`       | Allow half open bridging                               |

## Installation
Download the latest version from the [release page]("./releases).<br />
Execute the binary or install node.js and run the script as systemd service.

## Usage of single bridge
### General
```sh
Usage of bridge.js as cli tool: 

  bridge.js --upstream="http://example.com" --host="127.0.0.1" --port="8080" 
  
  --upstream	WebSocket upstream to backend
  --socket	Network socket type: tcp|udp|raw
  --host	Host to connect to
  --port	Host port to connect to
  [--settings]	Settings object from interface as json string
  [--options]	Duplex stream optinos passed to WebSocket.createWebSocketStream
```

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
./bridge.js --upstream="ws://127.0.0.1:8080/api/devices/62a4c005b9e05a649f6cec57/interfaces/62a4c005b9e05a649f6cec58" --host="samsung-tv.lan" --port="8080"
```

## Note
This is bascily the same concept as [Websockify](https://github.com/novnc/websockify).<br />
Forward data between network socket & Websocket.