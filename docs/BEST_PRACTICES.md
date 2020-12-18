<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  
<!-- *generated with [DocToc](https://github.com/thlorenz/doctoc)* -->

- [Deployment best practices](#deployment-best-practices)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

#### Deployment best practices

- Both modules should be deployed as a publicly exposed services.
- Modules are **stateless** which makes running multiple instances in parallel possible.
It is recommended to **enable horizontal scaling**
with at least 2 running instances at the same time in order to omit downtime
possibility.
- It's also recommended to use HTTPS.
