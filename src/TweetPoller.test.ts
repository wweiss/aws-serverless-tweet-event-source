import { LoggerFactory } from '@codification/cutwater-logging';
import * as fs from 'fs';
import * as path from 'path';
import { PollingCheckpoint, TweetProcessor } from '.';
import { APIGateway } from './APIGateway';
import { AppConfig } from './AppConfig';
import { TweetPoller } from './TweetPoller';

const Logger = LoggerFactory.getLogger();

// tslint:disable: max-classes-per-file
class MockAPIGateway implements APIGateway {
  private readonly MOCK_FILE_PATH = path.resolve(__dirname, 'TwitterAPIResponse.mock.json');
  public callAPI(url: string, query?: string): Promise<any[]> {
    return JSON.parse(fs.readFileSync(this.MOCK_FILE_PATH, { encoding: 'utf8' })).statuses;
  }
}

class MockPollingCheckpoint implements PollingCheckpoint {
  public lastTweetDate: number = -1;

  constructor(lastTweetDate?: number) {
    if (lastTweetDate) {
      this.lastTweetDate = lastTweetDate;
    }
  }

  public async getLastTweetDate(): Promise<number> {
    return this.lastTweetDate;
  }

  public setLastTweetDate(timestamp: number): void {
    this.lastTweetDate = timestamp;
  }
}

class MockTweetProcessor implements TweetProcessor {
  public process(tweets: any[]): void {
    Logger.debug(`Recieved tweets: ${JSON.stringify(tweets, null, 2)}`);
  }
}

describe('TweetPoller', () => {
  const config = AppConfig.instance;
  const apiGateway = new MockAPIGateway();
  const checkpoint = new MockPollingCheckpoint();
  const processor = new MockTweetProcessor();
  const poller = new TweetPoller(config, apiGateway, checkpoint, processor);

  it('can progressively poll tweets', async () => {
    let tweets: any[] = await poller.doPoll();
    expect(tweets.length).toBeGreaterThan(1);

    const first = tweets[0];
    const last = tweets[tweets.length - 1];
    expect(Date.parse(first.created_at)).toBeGreaterThan(Date.parse(last.created_at));
    expect(checkpoint.lastTweetDate).toBeGreaterThan(-1);

    const lastTweetDate = checkpoint.lastTweetDate;
    tweets = await poller.doPoll();
    expect(tweets.length).toEqual(0);
    expect(checkpoint.lastTweetDate).toEqual(lastTweetDate);
  });
});