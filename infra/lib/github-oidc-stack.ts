import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { config } from "./config";

/**
 * GitHub Actions 用 OIDC ロール。
 * 初回 cdk deploy 時に作成し、出力された RoleArn を GitHub Secrets に登録する。
 */
export class GitHubOidcStack extends cdk.Stack {
  readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const oidcProvider = new iam.OpenIdConnectProvider(this, "GitHubOidcProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    this.deployRole = new iam.Role(this, "GitHubActionsDeployRole", {
      roleName: "github-actions-boat-app-deploy",
      description: "GitHub Actions deploy role for boat-app",
      assumedBy: new iam.FederatedPrincipal(
        oidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub": `repo:${config.githubRepo}:*`,
          },
        },
        "sts:AssumeRoleWithWebIdentity",
      ),
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // 初回は広めの権限。運用安定後に絞り込み可能。
    this.deployRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"),
    );

    new cdk.CfnOutput(this, "GitHubActionsRoleArn", {
      value: this.deployRole.roleArn,
      description: "GitHub Repository Secret: AWS_DEPLOY_ROLE_ARN に設定",
      exportName: "BoatAppGitHubActionsRoleArn",
    });
  }
}
