import { DynamoDBPollingCheckpoint } from '../DynamoDBPollingCheckpoint';
import { LambdaListingProcessor } from '../LambdaTwitterProcessor';
import { TweetPoller } from '../TweetPoller';

const poller: TweetPoller = new TweetPoller(new DynamoDBPollingCheckpoint(), new LambdaListingProcessor());

exports.handler = () => {
  poller.poll();
};
