import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as cloudwatchDashboards from "aws-cdk-lib/aws-cloudwatch";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export class DevOpsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Create an SNS Topic and add email subscription to the SNS topic
    const alarmTopic = new sns.Topic(this, "DevOpsNotificationTopic", {
      displayName: "Website Health Alarm Topic",
    });
    alarmTopic.addSubscription(new snsSubscriptions.EmailSubscription("kiyohiro.0310@gmail.com"));

    // 2. Create CloudWatch Dashboard
    // No widget can be added here because I need to fetch website data from S3 first, so creating dashboard is done in lambda function
    const dashboard = new cloudwatchDashboards.Dashboard(this, "DevOpsDashboard", {
      dashboardName: "DevOpsMonitoringDashboard",
    });

    // 3. Crete dynamoDB table
    const table = new dynamodb.Table(this, 'DevOpsAlarmLog', {
      partitionKey: { name: 'websiteName', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN for production environments
    });
    table.autoScaleWriteCapacity({ minCapacity: 5, maxCapacity: 20 }).scaleOnUtilization({
      targetUtilizationPercent: 70,
    });

    // 4. Create Lambda function
    const canaryFunction = new lambda.Function(this, "DevOpsCanaryFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../function")),
      timeout: cdk.Duration.seconds(60),
      environment: {
        TOPIC_ARN: alarmTopic.topicArn,
        DB_TABLE: table.tableName,
        CW_DASHBOARD_NAME: dashboard.dashboardName
      }
    });

    // Add admin access to do everything
    canaryFunction.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess")
    );

    table.grantWriteData(canaryFunction); // Grant write access to DynamoDB

    const rule = new events.Rule(this, "CanaryFuncitonScheduleRule", {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1))
    });

    rule.addTarget(new targets.LambdaFunction(canaryFunction));
  }
}
