import { KMS } from 'aws-sdk';
import * as got from 'got';
import { Observable } from 'rxjs/Observable';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { of } from 'rxjs/observable/of';
import { Observer } from 'rxjs/Observer';
import { flatMap, map } from 'rxjs/operators';

import { Config, LoggerFactory } from '@codificationorg/commons-core';

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
    this.bearerToken.subscribe(
      () => Logger.info('Config is ready.'),
      err => {
        throw new Error(`Configuration failed to initialized: ${JSON.stringify(err, null, 2)}`);
      },
    );
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

  public get bearerToken(): Observable<string> {
    let rval: Observable<string>;
    if (!this.cachedBearerToken) {
      rval = this.consumerCredentials.pipe(flatMap(creds => this.fetchBearerToken(creds)));
    } else {
      rval = of(this.cachedBearerToken);
    }
    return rval;
  }

  private fetchBearerToken(creds: ConsumerCredentials): Observable<string> {
    const bearerCreds = Buffer.from(`${encodeURIComponent(creds.apiKey)}:${encodeURIComponent(creds.apiSecretKey)}`).toString(
      'base64',
    );
    const options: got.GotBodyOptions<string> = {
      body: 'grant_type=client_credentials',
      headers: {
        Authorization: `Basic ${bearerCreds}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
    };
    return Observable.create((observer: Observer<string>) => {
      Logger.info('Requesting Twitter bearer token...');
      got
        .post('https://api.twitter.com/oauth2/token', options)
        .then(response => {
          const auth: AuthResponse = JSON.parse(response.body);
          if (auth.token_type === 'bearer') {
            Logger.info('Twitter bearer token received and ready.');
            this.cachedBearerToken = auth.access_token;
            observer.next(this.cachedBearerToken);
            observer.complete();
          } else {
            observer.error('Received wrong type of token from Twitter.');
          }
        })
        .catch(err => observer.error(err));
    });
  }

  private get consumerCredentials(): Observable<ConsumerCredentials> {
    if (this.cachedCredentials) {
      return of(this.cachedCredentials);
    } else {
      Logger.info('Preparing consumer credentials.');
      const tasks: Array<Observable<string>> = [
        this.toApiKey('Consumer API Key', EnvVar.consumerApiKey),
        this.toApiKey('Consumer API Secret Key', EnvVar.consumerApiSecretKey),
      ];
      return forkJoin(tasks).pipe(
        map(results => {
          this.cachedCredentials = {
            apiKey: results[0],
            apiSecretKey: results[1],
          };
          Logger.info('Consumer credentials ready.');
          return this.cachedCredentials;
        }),
      );
    }
  }

  private toApiKey(keyName: string, keyVarName: string): Observable<string> {
    let rval: Observable<string>;
    const encKeyVarName = `${EnvVar.encryptedPrefix}${keyVarName}`;
    if (Config.get(encKeyVarName)) {
      rval = this.decryptKey(keyName, encKeyVarName);
    } else if (Config.get(keyVarName)) {
      rval = of(Config.get(keyVarName));
    } else {
      throw new Error(`Missing required api credential: ${keyVarName} or ${encKeyVarName}`);
    }
    return rval;
  }

  private decryptKey(keyName: string, encryptedKey: string): Observable<string> {
    const kms = new KMS();
    const params = {
      CiphertextBlob: new Buffer(encryptedKey, 'base64'),
    };
    return Observable.create((observer: Observer<string>) => {
      Logger.info(`Decrypting '${keyName}'...`);
      kms.decrypt(params, (err, data) => {
        if (err) {
          observer.error(err);
        } else {
          Logger.info('Decrypted.');
          observer.next(data.Plaintext.toString());
          observer.complete();
        }
      });
    });
  }
}
