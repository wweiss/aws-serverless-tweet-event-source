import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import * as test from 'tape';

import { LoggerFactory } from '@codificationorg/commons-core';

import { PollingCheckpoint, TweetProcessor } from './';
import { TweetPoller } from './TweetPoller';

const Logger = LoggerFactory.getLogger();

test('TweetPoller Unit Tests', assert => {
  assert.plan(4);

  const checkpoint = new MockPollingCheckpoint();
  const processor = new MockTweetProcessor(assert);
  const poller = new TweetPoller(checkpoint, processor);

  poller.doPoll().subscribe(
    tweets => {
      Logger.info(`Received results: ${JSON.stringify(tweets, null, 2)}`);

      assert.ok(tweets.length > 1, 'returns more than one tweet.');

      const first = tweets[0];
      const last = tweets[tweets.length - 1];
      assert.ok(Date.parse(first.created_at) > Date.parse(last.created_at), 'properly sorts from newest to oldest.');

      assert.ok(checkpoint.lastTweetDate > -1, 'properly sets latest tweet date.');

      const lastTweetDate = checkpoint.lastTweetDate;
      poller.doPoll().subscribe(() => assert.fail('no tweets should return without updates.'), null, () => {
        assert.equal(checkpoint.lastTweetDate, lastTweetDate, 'latest date only updates when there are new tweets.');
      });
    },
    err => Logger.error('Polling encountered an error: ', err),
  );
});

class MockPollingCheckpoint implements PollingCheckpoint {
  public lastTweetDate: number = -1;

  constructor(lastTweetDate?: number) {
    if (lastTweetDate) {
      this.lastTweetDate = lastTweetDate;
    }
  }

  public getLastTweetDate(): Observable<number> {
    return of(this.lastTweetDate);
  }

  public setLastTweetDate(timestamp: number): void {
    this.lastTweetDate = timestamp;
  }
}

class MockTweetProcessor implements TweetProcessor {
  private assert: test.Test;

  constructor(assert: test.Test) {
    this.assert = assert;
  }

  public process(tweets: any[]): void {
    this.assert.comment(`Recieved tweets: ${JSON.stringify(tweets, null, 2)}`);
  }
}
