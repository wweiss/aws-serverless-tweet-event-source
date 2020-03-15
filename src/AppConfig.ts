import { Config } from '@codification/cutwater-core';
import { LoggerFactory } from '@codification/cutwater-logging';
import { KMS } from 'aws-sdk';
import { DecryptResponse } from 'aws-sdk/clients/kms';
import * as got from 'got';

export enum EnvVar {
  searchQuery = 'SEARCH_QUERY',
  additionalParameters = 'ADDITIONAL_PARAMETERS',
  perRequestTimeout = 'PER_REQUEST_TIMEOUT',
  processorFunctionName = 'PROCESSOR_FUNCTION_NAME',
  pollingCheckpointTable = 'POLLING_CHECKPOINT_TABLE_NAME',
  consumerApiKey = 'CONSUMER_API_KEY',
  consumerApiSecretKey = 'CONSUMER_API_SECRET_KEY',
  encryptedPrefix = 'ENCRYPTED_',
}

const Logger = LoggerFactory.getLogger();

interface AuthResponse {
  token_type: string;
  access_token: string;
}

interface ConsumerCredentials {
  apiKey: string;
  apiSecretKey: string;
}

export class AppConfig {
  public static readonly instance: AppConfig = new AppConfig();

  private cachedBearerToken: string;
  private cachedCredentials: ConsumerCredentials;

  private constructor() {
    Logger.info('Initializing config...');
    this.getBearerToken()
      .then(() => Logger.info('Config is ready.'))
      .catch(err => new Error(`Configuration failed to initialized: ${JSON.stringify(err, null, 2)}`));
  }

  public get searchQuery(): string {
    return encodeURIComponent(Config.get(EnvVar.searchQuery));
  }

  public get additionalParameters(): string {
    return Config.get(EnvVar.additionalParameters);
  }

  public get perRequestTimeout(): number {
    return +Config.get(EnvVar.perRequestTimeout);
  }

  public get processorFunctionName(): string {
    return Config.get(EnvVar.processorFunctionName);
  }

  public get tableName(): string {
    return Config.get(EnvVar.pollingCheckpointTable);
  }

  public async getBearerToken(): Promise<string> {
    if (!this.cachedBearerToken) {
      return await this.fetchBearerToken(await this.getConsumerCredentials());
    } else {
      return this.cachedBearerToken;
    }
  }

  private async fetchBearerToken(creds: ConsumerCredentials): Promise<string> {
    const bearerCreds = Buffer.from(
      `${encodeURIComponent(creds.apiKey)}:${encodeURIComponent(creds.apiSecretKey)}`,
    ).toString('base64');
    const options: got.GotBodyOptions<string> = {
      body: 'grant_type=client_credentials',
      headers: {
        Authorization: `Basic ${bearerCreds}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
    };
    Logger.info('Requesting Twitter bearer token...');
    const response = await got.post('https://api.twitter.com/oauth2/token', options);

    const auth: AuthResponse = JSON.parse(response.body);
    if (auth.token_type === 'bearer') {
      Logger.info('Twitter bearer token received and ready.');
      this.cachedBearerToken = auth.access_token;
      return this.cachedBearerToken;
    } else {
      throw new Error('Received wrong type of token from Twitter.');
    }
  }

  private async getConsumerCredentials(): Promise<ConsumerCredentials> {
    if (this.cachedCredentials) {
      return this.cachedCredentials;
    } else {
      Logger.info('Preparing consumer credentials.');
      const tasks: Array<Promise<string>> = [
        this.toApiKey('Consumer API Key', EnvVar.consumerApiKey),
        this.toApiKey('Consumer API Secret Key', EnvVar.consumerApiSecretKey),
      ];
      const results = await Promise.all(tasks);
      this.cachedCredentials = {
        apiKey: results[0],
        apiSecretKey: results[1],
      };
      Logger.info('Consumer credentials ready.');
      return this.cachedCredentials;
    }
  }

  private async toApiKey(keyName: string, keyVarName: string): Promise<string> {
    let rval: string;
    const encKeyVarName = `${EnvVar.encryptedPrefix}${keyVarName}`;
    if (Config.get(encKeyVarName)) {
      rval = await this.decryptKey(keyName, Config.get(encKeyVarName));
    } else if (Config.get(keyVarName)) {
      rval = Config.get(keyVarName);
    } else {
      throw new Error(`Missing required api credential: ${keyVarName} or ${encKeyVarName}`);
    }
    return rval;
  }

  private async decryptKey(keyName: string, encryptedKey: string): Promise<string> {
    const kms = new KMS();
    const params = {
      CiphertextBlob: new Buffer(encryptedKey, 'base64'),
    };
    const data: DecryptResponse = await kms.decrypt(params).promise();
    return !!data.Plaintext ? data.Plaintext?.toString() : '';
  }
}
