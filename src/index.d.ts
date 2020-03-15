export interface PollingCheckpoint {
  getLastTweetDate(): Promise<number>;
  setLastTweetDate(timestamp: number): void;
}

export interface TweetProcessor {
  process(tweets: any[]): void;
}
