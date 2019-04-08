## Deployment best practices

Both modules should be deployed as a publicly exposed services.

Modules are **stateless** which makes running multiple instances in parallel possible.
It is recommended to **enable horizontal scaling**
with at least 2 running instances at the same time in order to omit downtime
possibility.

It's also recommended to use HTTPS.
