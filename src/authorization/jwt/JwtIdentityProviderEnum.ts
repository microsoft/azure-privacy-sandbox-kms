// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * JWT Identity Providers. List all supported IDPs
 */
export enum JwtIdentityProviderEnum {
  MS_AAD = "https://sts.windows.net/72f988bf-86f1-41af-91ab-2d7cd011db47/",
  Demo = "http://Demo-jwt-issuer",
  MAA_deus2 = "https://sharedeus2.eus2.attest.azure.net",
  MAA_NoSecureBootTyFu = "https://maanosecureboottestyfu.eus.attest.azure.net",
  MAA_NoSecureBootWeu = "https://accnosecurebootmaawesteu.weu.attest.azure.net",
  MAA_NoSecureBootEus = "https://accnosecurebootmaa.eus2.attest.azure.net",
}
