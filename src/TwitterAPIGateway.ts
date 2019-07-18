import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';

import { Logger, LoggerFactory } from '@codificationorg/commons-core';

import { APIGateway } from './APIGateway';
import { AppConfig } from './AppConfig';

import got = require('got');

const Logger = LoggerFactory.getLogger();

export class TwitterAPIGateway implements APIGateway {
  private urlBase: string;
  private config: AppConfig;

  public constructor(urlBase: string, config: AppConfig) {
    this.urlBase = urlBase;
    this.config = config;
  }

  public callAPI(url: string, query?: string): Observable<any[]> {
    const baseUrl = `${this.urlBase}${url}`;
    return Observable.create((observer: Observer<any[]>) => {
      this.config.bearerToken.subscribe(
        token => {
          const options: got.GotJSONOptions = {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            json: true,
            query,
            timeout: this.config.perRequestTimeout,
          };
          Logger.debug('Calling api url: ', baseUrl);
          got(`${baseUrl}`, options)
            .then(resp => {
              if (resp.body.statuses && resp.body.statuses.length > 0) {
                observer.next(resp.body.statuses);
              } else {
                Logger.debug('Did not receive any results: %j', resp.body);
              }
              observer.complete();
            })
            .catch(err => observer.error(err));
        },
        err => observer.error(err),
      );
    });
  }
}
