#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ApiStack } from "../lib/api-stack";
import { DataStack } from "../lib/data-stack";
import { GitHubOidcStack } from "../lib/github-oidc-stack";
import { config } from "../lib/config";

const app = new cdk.App();

const env = {
  account: config.account,
  region: config.region,
};

const dataStack = new DataStack(app, "BoatAppDataStack", { env });
new ApiStack(app, "BoatAppApiStack", {
  env,
  dataBucket: dataStack.dataBucket,
  modelsBucket: dataStack.modelsBucket,
});
new GitHubOidcStack(app, "BoatAppGitHubOidcStack", { env });

app.synth();
