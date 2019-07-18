import { AppConfig } from '../AppConfig';
import { DynamoDBPollingCheckpoint } from '../DynamoDBPollingCheckpoint';
import { LambdaListingProcessor } from '../LambdaTwitterProcessor';
import { TweetPoller } from '../TweetPoller';
import { TwitterAPIGateway } from '../TwitterAPIGateway';

const URL_BASE = 'https://api.twitter.com/1.1';
const config = AppConfig.instance;

const poller: TweetPoller = new TweetPoller(
  config,
  new TwitterAPIGateway(URL_BASE, config),
  new DynamoDBPollingCheckpoint(),
  new LambdaListingProcessor(),
);

exports.handler = () => {
  poller.poll();
};
