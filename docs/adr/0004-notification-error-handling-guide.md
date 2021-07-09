# Notification Module Error Handling Guide

There are two kinds of scenario in where exception can be thrown in notification module :

1. Notification handler attempts to make a call to Commercetools platform but failed.
2. Transaction states are not correct.

For the first scenario, try-catch block has been adapted in order to retrieve the error thrown from CTP client.
In order to make sure the thrown error can be passed from notification.handler to notification.controller for further
operation, VError package has been adapted. It helps to wrap the entire error instance and then throw it back to function
caller as below.

```
try {
    ...
    //Attempt to perform request to CTP platform
    ...
} catch (err) {
   throw new VError(err, 'customized error message')
}
```

and we can retrieve the wrapped error from VError wrapper by following code snippet

```
   const cause = VError.cause(err)
```

or

```
   const cause = err.cause()
```

For more detais, please refer to [VError documentation](https://www.npmjs.com/package/verror)

For the second scenario, we don't need to adapt VError, since no error has been thrown out from any external call.
We simply instantiate an Error object by parsing error message like example below

```
 if (
    !transactionStateFlow.hasOwnProperty(currentState) ||
    !transactionStateFlow.hasOwnProperty(newState)
  ) {
    const errorMessage = `Wrong transaction state passed. CurrentState: ${currentState}, newState: ${newState}`
    throw new Error(errorMessage)
  }
```
