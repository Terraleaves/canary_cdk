# COMP2029 DevOps App project
This Lambda function contains the following features:
1. Obtaining metrics(Availability, latency) for 3 URLs
2. Creating a monitoring service to monitor the metrics
3. Creating alarms on metrics
4. Send notification of each websites metrics
5. Create DynamoDB table and store alarm information

## Run app
Make sure you have created repository using aws cdk before pull this repository.
Once you've got repository, take following steps to run app
```
npm install
npm run build
cdk bootstrap (You might need to configure your account)
cdk synth
cdk deploy
```
