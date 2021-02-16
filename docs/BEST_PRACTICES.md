## Deployment best practices

- Both modules should be deployed as a publicly exposed services.
- Modules are **stateless** which makes running multiple instances in parallel possible. It is recommended to **enable horizontal scaling** with at least 2 running instances at the same time in order to omit downtime possibility.
- An encrypted HTTPS connection is strongly recommended for production setups instead of HTTP connection.
- To protect your server from unauthorized notifications, we strongly recommend that you activate Hash-based message authentication code [HMAC signatures](../notification/docs/IntegrationGuide.md#step-1-set-up-notification-webhook-and-generate-hmac-signature) during the notification setup.
