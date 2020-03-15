import { LoggerFactory } from '@codification/cutwater-logging';
import { PollingCheckpoint, TweetProcessor } from './';
import { APIGateway } from './APIGateway';
import { AppConfig } from './AppConfig';

const Logger = LoggerFactory.getLogger();

export class TweetPoller {
  private config: AppConfig;
  private apiGateway: APIGateway;
  private processor: TweetProcessor;
  private checkpoint: PollingCheckpoint;

  constructor(config: AppConfig, apiGateway: APIGateway, checkpoint: PollingCheckpoint, processor: TweetProcessor) {
    this.config = config;
    this.processor = processor;
    this.checkpoint = checkpoint;
    this.apiGateway = apiGateway;
  }

  public poll(): void {
    this.doPoll()
      .then(results => this.processor.process(results))
      .catch(err => Logger.error('Polling encountered an error: ', err));
  }

  public async doPoll(): Promise<any[]> {
    const lastTweetDate = await this.checkpoint.getLastTweetDate();
    Logger.debug(`Received previous last tweet date: ${new Date(lastTweetDate).toUTCString()}`);

    const latestTweets = (await this.getLastestTweets()) || [];
    Logger.debug('Total tweets: ', latestTweets.length);
    const newTweets = this.sortTweets(latestTweets).filter(tweet => Date.parse(tweet.created_at) > lastTweetDate);
    Logger.debug('New tweets: ', newTweets.length);

    if (newTweets.length < 1) {
      Logger.debug('Exiting, no new tweets detected.');
      return [];
    } else {
      const currentLatestTweetDate = Date.parse(newTweets[0].created_at);
      Logger.debug(`Updating checkpoint timestamp: ${new Date(currentLatestTweetDate).toUTCString()}`);
      this.checkpoint.setLastTweetDate(currentLatestTweetDate);
      return newTweets;
    }
  }

  private getLastestTweets(): Promise<any[] | undefined> {
    const query = `q=${this.config.searchQuery}${
      this.config.additionalParameters ? '&' + this.config.additionalParameters : ''
    }`;
    Logger.trace(`Using query string: ${query}`);
    return this.apiGateway.callAPI(`/search/tweets.json`, query);
  }

  private sortTweets(tweets: any[]): any[] {
    return tweets.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  }
}
