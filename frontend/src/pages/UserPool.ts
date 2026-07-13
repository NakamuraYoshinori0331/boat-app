import { CognitoUserPool } from "amazon-cognito-identity-js";
import { cognitoConfig } from "../config/cognito";

const poolData = {
  UserPoolId: cognitoConfig.UserPoolId,
  ClientId: cognitoConfig.ClientId,
};

const userPool = new CognitoUserPool(poolData);

export default userPool;
