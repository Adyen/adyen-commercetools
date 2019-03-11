# UI tests

### How to run
There are 2 ways to run UI tests:
1. Running with headless browser:
```
CTP_PROJECT_KEY=${ctpProjectKey} CTP_CLIENT_ID=${ctpClientId} CTP_CLIENT_SECRET=${ctpClientSecret} ADYEN_API_KEY=${adyenApiKey} ADYEN_MERCHANT_ACCOUNT=${adyenMerchantAccount} CLIENT_ENCRYPTION_PUBLIC_KEY="${clientEncryptionPublicKey}" npm run cypress
``` 
1. Running in Cypress UI mode:
```
CTP_PROJECT_KEY=${ctpProjectKey} CTP_CLIENT_ID=${ctpClientId} CTP_CLIENT_SECRET=${ctpClientSecret} ADYEN_API_KEY=${adyenApiKey} ADYEN_MERCHANT_ACCOUNT=${adyenMerchantAccount} CLIENT_ENCRYPTION_PUBLIC_KEY="${clientEncryptionPublicKey}" npm run cypress-ui
```
