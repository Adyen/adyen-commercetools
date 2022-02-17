# 4. Notification error handling.

Date: 2021-07-09

## Status

[Accepted](https://github.com/commercetools/commercetools-adyen-integration/pull/747)

## Context

When error occurs during validating additional notification data and sending request to CTP platform, the Adyen 
notification wraps the thrown error by using customized error objects `CommercetoolsError` and `ValidationError`.
````
class ValidationError extends Error {
  constructor({ stack, message }) {
    super()
    this.stack = stack
    this.message = message
    this.retry = false
  }
}
```` 
````
class CommercetoolsError extends Error {
  constructor({ stack, message, statusCode }) {
    super()
    this.stack = stack
    this.message = message
    this.retry = this._shouldRetry(statusCode)
  }
  _shouldRetry(statusCode) {
    return statusCode < 200 || statusCode === 409 || statusCode >= 500
  }
}
````
As displayed above, these customized error objects only wrap partial information from original error. Since
the whole error object is not logged, some important information may be missing for debug purpose.

## Decision
For the error occurs when making request to CTP platform, we adapt VError package which helps to wrap the entire original
error and propagate it to function caller.

 ```
try {
    ...
    //Attempt to perform request to CTP platform
    ...
} catch (err) {
   throw new VError(err, 'customized error message')
}
```
The wrapped error can be retrieved from VError wrapper by either following code snippet
```
   const cause = VError.cause(err)
```
```
   const cause = err.cause()
```
   For more detais, please refer to [VError documentation](https://www.npmjs.com/package/verror)

In case error is not thrown from external call, but it happens when fail from data validation, we don't need to 
adapt `VError`. We simply instantiate an Error object by parsing error message like example below

```
 if (
    !transactionStateFlow.hasOwnProperty(currentState) ||
    !transactionStateFlow.hasOwnProperty(newState)
  ) {
    const errorMessage = `Wrong transaction state passed. CurrentState: ${currentState}, newState: ${newState}`
    throw new Error(errorMessage)
  }
```

## Consequences

- Fewer boilerplate code after those customized error object has been obsoleted.
- All the information from original error can be listed out in logs.

Below example shows the logs when customized error wrapper is used.
```
{
"name": "ctp-adyen-integration-notifications",
  "hostname": "ct-00646",
  "pid": 20396,
  "level": 50,
  "notification": [
    {
      "eventCode": "AUTHORISATION",
      "eventDate": "2019-01-30T18:16:22+01:00",
      "pspReference": "test_AUTHORISATION_1",
      "success": "true"
    }
  ],
  "err": {
    "message": "Got a concurrent modification error when updating payment with id \"undefined\". Version tried \"undefined\", currentVersion: \"2\". Won't retry again because of a reached limit 20 max retries. Failed actions: [{\"action\":\"addInterfaceInteraction\",\"type\":{\"key\":\"ctp-adyen-integration-interaction-notification\",\"typeId\":\"type\"},\"fields\":{\"createdAt\":\"2021-07-07T09:01:51.953Z\",\"status\":\"authorisation\",\"type\":\"notification\",\"notification\":{\"eventCode\":\"AUTHORISATION\",\"eventDate\":\"2019-01-30T18:16:22+01:00\",\"pspReference\":\"test_AUTHORISATION_1\",\"success\":\"true\"}}},{\"action\":\"addTransaction\",\"transaction\":{\"type\":\"Authorization\",\"amount\":{\"currencyCode\":\"EUR\",\"centAmount\":10100},\"state\":\"Success\",\"interactionId\":\"test_AUTHORISATION_1\"}}]: Object 62f05181-4789-47ce-84f8-d27c895ee23c has a different version than expected. Expected: 1 - Actual: 2.",
    "name": "VError",
    "stack": "VError: Got a concurrent modification error when updating payment with id \"undefined\". Version tried \"undefined\", currentVersion: \"2\". Won't retry again because of a reached limit 20 max retries. Failed actions: [{\"action\":\"addInterfaceInteraction\",\"type\":{\"key\":\"ctp-adyen-integration-interaction-notification\",\"typeId\":\"type\"},\"fields\":{\"createdAt\":\"2021-07-07T09:01:51.953Z\",\"status\":\"authorisation\",\"type\":\"notification\",\"notification\":{\"eventCode\":\"AUTHORISATION\",\"eventDate\":\"2019-01-30T18:16:22+01:00\",\"pspReference\":\"test_AUTHORISATION_1\",\"success\":\"true\"}}},{\"action\":\"addTransaction\",\"transaction\":{\"type\":\"Authorization\",\"amount\":{\"currencyCode\":\"EUR\",\"centAmount\":10100},\"state\":\"Success\",\"interactionId\":\"test_AUTHORISATION_1\"}}]: Object 62f05181-4789-47ce-84f8-d27c895ee23c has a different version than expected. Expected: 1 - Actual: 2.\n    at updatePaymentWithRepeater (/Users/leungkinghin/Projects/commercetools-adyen-integration/notification/src/handler/notification/notification.handler.js:115:15)\n    at async processNotification (/Users/leungkinghin/Projects/commercetools-adyen-integration/notification/src/handler/notification/notification.handler.js:51:5)\n    at async Object.handleNotification (/Users/leungkinghin/Projects/commercetools-adyen-integration/notification/src/api/notification/notification.controller.js:27:7)\n    at async Context.<anonymous> (/Users/leungkinghin/Projects/commercetools-adyen-integration/notification/test/unit/notification.controller.spec.js:264:13)\nCaused by: ConcurrentModification: Object 62f05181-4789-47ce-84f8-d27c895ee23c has a different version than expected. Expected: 1 - Actual: 2.\n    at buildMockErrorFromConcurrentModificaitonException (/Users/leungkinghin/Projects/commercetools-adyen-integration/notification/test/test-utils.js:57:17)\n    at Object.<anonymous> (/Users/leungkinghin/Projects/commercetools-adyen-integration/notification/test/unit/notification.controller.spec.js:250:23)\n    at Object.invoke (/Users/leungkinghin/Projects/commercetools-adyen-integration/notification/node_modules/sinon/lib/sinon/behavior.js:177:32)\n    at Object.functionStub (/Users/leungkinghin/Projects/commercetools-adyen-integration/notification/node_modules/sinon/lib/sinon/stub.js:42:43)\n    at Function.invoke (/Users/leungkinghin/Projects/commercetools-adyen-integration/notification/node_modules/sinon/lib/sinon/proxy-invoke.js:50:47)\n    at Object.update (/Users/leungkinghin/Projects/commercetools-adyen-integration/notification/node_modules/sinon/lib/sinon/proxy.js:265:26)\n    at updatePaymentWithRepeater (/Users/leungkinghin/Projects/commercetools-adyen-integration/notification/src/handler/notification/notification.handler.js:85:23)\n    at async processNotification (/Users/leungkinghin/Projects/commercetools-adyen-integration/notification/src/handler/notification/notification.handler.js:51:5)\n    at async Object.handleNotification (/Users/leungkinghin/Projects/commercetools-adyen-integration/notification/src/api/notification/notification.controller.js:27:7)\n    at async Context.<anonymous> (/Users/leungkinghin/Projects/commercetools-adyen-integration/notification/test/unit/notification.controller.spec.js:264:13)"
  },
  "msg": "Unexpected exception occurred.",
  "time": "2021-07-07T09:01:51.958Z",
  "v": 0
}
```

Following is the example logs when VError package has been applied.
```
{
  "name": "ctp-adyen-integration-notifications",
  "hostname": "ct-00646",
  "pid": 30062,
  "level": 50,
  "notification": [
    {
      "eventCode": "AUTHORISATION",
      "eventDate": "2019-01-30T18:16:22+01:00",
      "pspReference": "test_AUTHORISATION_1",
      "success": "true"
    }
  ],
  "cause": {
    "body": {
      "statusCode": 409,
      "message": "Object 62f05181-4789-47ce-84f8-d27c895ee23c has a different version than expected. Expected: 1 - Actual: 2.",
      "errors": [
        {
          "code": "ConcurrentModification",
          "message": "Object 62f05181-4789-47ce-84f8-d27c895ee23c has a different version than expected. Expected: 1 - Actual: 2.",
          "currentVersion": 2
        }
      ]
    },
    "name": "ConcurrentModification",
    "code": 409,
    "status": 409,
    "statusCode": 409,
    "originalRequest": {
      "uri": "/my-project-91/payments/62f05181-4789-47ce-84f8-d27c895ee23c",
      "method": "POST",
      "body": {
        "version": 1,
        "actions": [
          {
            "action": "addInterfaceInteraction",
            "type": {
              "key": "ctp-adyen-integration-interaction-notification",
              "typeId": "type"
            },
            "fields": {
              "status": "Authorised",
              "type": "notification",
              "response": "123"
            }
          }
        ]
      },
      "headers": {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": [
          "Bearer ********"
        ]
      }
    },
    "retryCount": 0,
    "headers": {
      "server": [
        "nginx"
      ],
      "date": [
        "Thu, 07 Mar 2019 23:11:49 GMT"
      ],
      "content-type": [
        "application/json; charset=utf-8"
      ],
      "content-length": [
        "322"
      ],
      "server-timing": [
        "projects;dur=6"
      ],
      "x-correlation-id": [
        "projects-433dda8c-0703-4b62-a75c-2f939bc5df62"
      ],
      "x-served-by": [
        "api-xxx.commercetools.de"
      ],
      "x-served-config": [
        "sphere-projects-ws-1.0"
      ],
      "access-control-allow-origin": [
        "*"
      ],
      "access-control-allow-headers": [
        "Accept, Authorization, Content-Type, Origin, User-Agent"
      ],
      "access-control-allow-methods": [
        "GET, POST, DELETE, OPTIONS"
      ],
      "access-control-max-age": [
        "299"
      ],
      "via": [
        "1.1 google"
      ],
      "alt-svc": [
        "clear"
      ],
      "connection": [
        "close"
      ]
    }
  },
  "msg": "Unexpected exception occurred.",
  "time": "2021-07-07T10:41:26.929Z",
  "v": 0
}
```
