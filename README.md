# Connector
Forwards traffic between the [backend](https://github.com/OpenHausIO/backend) &amp; local network devices over WebSockets.
To controll your devices on your local network, it is necessary to have a piece of software running on your local network.

> NOTE: This application is in a eraly developmen state!

## Environment variables
| Name             | Default value | Description                                                                 |
| ---------------- | ------------- | --------------------------------------------------------------------------- |
| NODE_ENV         | `production`  | `production` or `development`                                               |
| BACKEND_URL      | ``            | Full URL to backend. E.g. `http://172.16.0.15:80`                           |
| BACKEND_PROTOCOL | `http`        | Protocol for HTTP/WS requests: `http` or `https`                            |
| BACKEND_HOST     | `127.0.0.1`   | Backend IP/Hostname                                                         |
| BACKEND_PORT     | `8080`        | Backend Webserver port                                                      |
| TRANSPORT_FILTER | ``            | Comma seperated filter list for transport connections. E.g: `tcp`, `udp,ws` |
