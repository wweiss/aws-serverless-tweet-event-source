import { LoggerFactory } from '@codification/cutwater-logging';
import { default as got } from 'got';
import { APIGateway } from './APIGateway';
import { AppConfig } from './AppConfig';

const Logger = LoggerFactory.getLogger();

export class TwitterAPIGateway implements APIGateway {
  private urlBase: string;
  private config: AppConfig;

  public constructor(urlBase: string, config: AppConfig) {
    this.urlBase = urlBase;
    this.config = config;
  }

  public async callAPI(url: string, query?: string): Promise<any[] | undefined> {
    const baseUrl = `${this.urlBase}${url}`;
    const token = await this.config.getBearerToken();
    const options: got.GotJSONOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      json: true,
      query,
      timeout: this.config.perRequestTimeout,
    };
    Logger.debug('Calling api url: ', baseUrl);
    const resp = await got(`${baseUrl}`, options);
    if (resp.body.statuses && resp.body.statuses.length > 0) {
      return resp.body.statuses;
    } else {
      Logger.debug('Did not receive any results: ', resp.body);
    }
  }
}
