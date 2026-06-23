import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { config } from "./config";

export class DataStack extends cdk.Stack {
  readonly dataBucket: s3.Bucket;
  readonly modelsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.dataBucket = new s3.Bucket(this, "DataBucket", {
      bucketName: config.dataBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: "AbortIncompleteUploads",
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],
    });

    this.modelsBucket = new s3.Bucket(this, "ModelsBucket", {
      bucketName: config.modelsBucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new cdk.CfnOutput(this, "DataBucketName", {
      value: this.dataBucket.bucketName,
    });
    new cdk.CfnOutput(this, "ModelsBucketName", {
      value: this.modelsBucket.bucketName,
    });
  }
}
