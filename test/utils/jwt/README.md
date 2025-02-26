# Token issuer

## Request
```
curl -X POST ${AadEndpoint:-http://localhost:3000/token} \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=${ClientApplicationId:-}&client_secret=${ClientSecret:-}&scope=${ApiIdentifierUri:-}/.default&grant_type=client_credentials" \
    -w "\n"
```