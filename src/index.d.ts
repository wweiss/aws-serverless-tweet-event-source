import { Observable } from 'rxjs/Observable';

export interface PollingCheckpoint {
  getLastTweetDate(): Observable<number>;
  setLastTweetDate(timestamp: number): void;
}

export interface TweetProcessor {
  process(tweets: any[]): void;
}
