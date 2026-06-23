import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { config } from "./config";

/**
 * Phase 2: FastAPI を Lambda コンテナ + Fargate ジョブに移行する際の API 基盤。
 * 現時点ではヘルスチェック Lambda のみ。本番 API 移行時に FastAPI ハンドラを差し替える。
 */
export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool = cognito.UserPool.fromUserPoolId(
      this,
      "UserPool",
      config.cognitoUserPoolId,
    );

    const authorizer = new authorizers.HttpUserPoolAuthorizer(
      "CognitoAuthorizer",
      userPool,
      {
        userPoolClients: [
          cognito.UserPoolClient.fromUserPoolClientId(
            this,
            "UserPoolClient",
            config.cognitoClientId,
          ),
        ],
      },
    );

    const healthFn = new lambda.Function(this, "HealthFunction", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.handler",
      code: lambda.Code.fromInline(`
def handler(event, context):
    return {
        "statusCode": 200,
        "headers": {"content-type": "application/json"},
        "body": "{\\"status\\":\\"ok\\",\\"service\\":\\"boat-app-api\\"}"
    }
`),
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    const httpApi = new apigatewayv2.HttpApi(this, "HttpApi", {
      apiName: "boat-app-api",
      corsPreflight: {
        allowHeaders: ["Authorization", "Content-Type"],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: [`https://${config.domainName}`, "http://localhost:3000"],
      },
    });

    httpApi.addRoutes({
      path: "/health",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        "HealthIntegration",
        healthFn,
      ),
    });

    httpApi.addRoutes({
      path: "/protected",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        "ProtectedIntegration",
        healthFn,
      ),
      authorizer,
    });

    new cdk.CfnOutput(this, "HttpApiUrl", {
      value: httpApi.apiEndpoint,
    });
    new cdk.CfnOutput(this, "ApiDomainTarget", {
      value: `${httpApi.apiId}.execute-api.${config.region}.amazonaws.com`,
      description: "Route53 api.boat-ai.click の CNAME/Alias 先（カスタムドメイン設定時）",
    });
  }
}
