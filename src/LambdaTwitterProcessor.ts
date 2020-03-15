import { LoggerFactory } from '@codification/cutwater-logging';
import { Lambda } from 'aws-sdk';
import { InvocationRequest } from 'aws-sdk/clients/lambda';
import { TweetProcessor } from './';
import { AppConfig } from './AppConfig';

const Logger = LoggerFactory.getLogger();
const LAMBDA = new Lambda();

export class LambdaListingProcessor implements TweetProcessor {
  public process(tweets: any[]): void {
    const functionName = AppConfig.instance.processorFunctionName;
    const params: InvocationRequest = {
      FunctionName: functionName,
      InvocationType: 'Event',
      Payload: JSON.stringify(tweets),
    };
    LAMBDA.invoke(params, err => {
      if (err) {
        Logger.error(`Encountered error publishing tweets to lambda[${functionName}]: `, err);
      } else {
        Logger.info(`Successfully published ${tweets.length} tweet(s) to lambda: ${functionName}`);
      }
    });
  }
}
