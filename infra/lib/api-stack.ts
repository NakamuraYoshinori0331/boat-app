import * as path from "path";
import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { config } from "./config";

export interface ApiStackProps extends cdk.StackProps {
  dataBucket: s3.IBucket;
  modelsBucket: s3.IBucket;
}

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const apiFn = new lambda.DockerImageFunction(this, "ApiFunction", {
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, "../../backend"),
      ),
      memorySize: 2048,
      timeout: cdk.Duration.minutes(15),
      environment: {
        DATA_BUCKET: props.dataBucket.bucketName,
        MODELS_BUCKET: props.modelsBucket.bucketName,
        DATA_DIR: "/tmp/data",
        MODELS_ROOT: "/tmp/models",
        COGNITO_USER_POOL_ID: config.cognitoUserPoolId,
        COGNITO_CLIENT_ID: config.cognitoClientId,
        ALLOWED_ORIGINS: `https://${config.domainName},http://localhost:3000`,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    props.dataBucket.grantRead(apiFn);
    props.modelsBucket.grantReadWrite(apiFn);

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

    const integration = new integrations.HttpLambdaIntegration(
      "ApiIntegration",
      apiFn,
    );

    httpApi.addRoutes({
      path: "/{proxy+}",
      methods: [apigatewayv2.HttpMethod.ANY],
      integration,
    });

    httpApi.addRoutes({
      path: "/",
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: new integrations.HttpLambdaIntegration(
        "RootIntegration",
        apiFn,
      ),
    });

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "HostedZone",
      {
        hostedZoneId: config.hostedZoneId,
        zoneName: config.domainName,
      },
    );

    const certificate = new acm.Certificate(this, "ApiCertificate", {
      domainName: config.apiDomainName,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    const domainName = new apigatewayv2.DomainName(this, "ApiDomainName", {
      domainName: config.apiDomainName,
      certificate,
    });

    new apigatewayv2.ApiMapping(this, "ApiMapping", {
      api: httpApi,
      domainName,
      stage: httpApi.defaultStage!,
    });

    new route53.ARecord(this, "ApiAliasRecord", {
      zone: hostedZone,
      recordName: "api",
      target: route53.RecordTarget.fromAlias(
        new route53targets.ApiGatewayv2DomainProperties(
          domainName.regionalDomainName,
          domainName.regionalHostedZoneId,
        ),
      ),
    });

    new cdk.CfnOutput(this, "HttpApiUrl", {
      value: httpApi.apiEndpoint,
    });
    new cdk.CfnOutput(this, "CustomApiUrl", {
      value: `https://${config.apiDomainName}`,
    });
  }
}
