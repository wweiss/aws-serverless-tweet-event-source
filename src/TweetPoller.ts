import * as got from 'got';
import { Observable } from 'rxjs/Observable';
import { EmptyObservable } from 'rxjs/observable/EmptyObservable';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { of } from 'rxjs/observable/of';
import { Observer } from 'rxjs/Observer';
import { flatMap, retry } from 'rxjs/operators';

import { Logger, LoggerFactory } from '@codificationorg/commons-core';

import { PollingCheckpoint, TweetProcessor } from './';
import { AppConfig } from './AppConfig';

const Logger = LoggerFactory.getLogger();

export class TweetPoller {
  private readonly URL_BASE = 'https://api.twitter.com/1.1';

  private config: AppConfig;
  private processor: TweetProcessor;
  private checkpoint: PollingCheckpoint;

  constructor(checkpoint: PollingCheckpoint, processor: TweetProcessor) {
    this.config = AppConfig.instance;
    this.processor = processor;
    this.checkpoint = checkpoint;
  }

  public poll(): void {
    this.doPoll().subscribe(
      pollResults => {
        this.processor.process(pollResults);
      },
      err => Logger.error('Polling encountered an error: ', err),
    );
  }

  public doPoll(): Observable<any[]> {
    return forkJoin(this.getLastestTweets(), this.checkpoint.getLastTweetDate()).pipe(
      flatMap(results => {
        const lastTweetDate = results[1];
        Logger.debug(`Received previous last tweet date: ${new Date(lastTweetDate).toUTCString()}`);

        Logger.debug('Total tweets: ', results.length);
        const newTweets = this.sortTweets(results[0]).filter(tweet => Date.parse(tweet.created_at) > lastTweetDate);
        Logger.debug('New tweets: ', newTweets.length);

        if (newTweets.length < 1) {
          Logger.debug('Exiting, no new tweets detected.');
          return new EmptyObservable();
        } else {
          const currentLatestTweetDate = Date.parse(newTweets[0].created_at);
          Logger.debug(`Updating checkpoint timestamp: ${new Date(currentLatestTweetDate).toUTCString()}`);
          this.checkpoint.setLastTweetDate(currentLatestTweetDate);
          return of(newTweets);
        }
      }),
    );
  }

  private getLastestTweets(): Observable<any[]> {
    const query = `q=${this.config.searchQuery}${
      this.config.additionalParameters ? '&' + this.config.additionalParameters : ''
    }`;
    Logger.trace(`Using query string: ${query}`);
    return this.callAPI(`/search/tweets.json`, query).pipe(retry(3));
  }

  private callAPI(url: string, query?: string): Observable<any[]> {
    const baseUrl = `${this.URL_BASE}${url}`;
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
              }else{
                Logger.debug('Did not receive any results: %j',resp.body)
              }
              observer.complete();
            })
            .catch(err => observer.error(err));
        },
        err => observer.error(err),
      );
    });
  }

  private sortTweets(tweets: any[]): any[] {
    return tweets.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  }
}
