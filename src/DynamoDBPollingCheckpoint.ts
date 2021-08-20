import { LoggerFactory } from '@codification/cutwater-logging';
import { DynamoDB } from 'aws-sdk';
import { GetItemOutput, PutItemInput } from 'aws-sdk/clients/dynamodb';
import { PollingCheckpoint } from './';
import { AppConfig } from './AppConfig';

const Logger = LoggerFactory.getLogger();

const CHECKPOINT_ATTRIBUTE = 'checkpoint';
const TIMESTAMP_KEY = 'CHECKPOINT_TIMESTAMP';
const DB: DynamoDB = new DynamoDB();

export class DynamoDBPollingCheckpoint implements PollingCheckpoint {
  public async getLastTweetDate(): Promise<number> {
    const params = {
      Key: {
        id: {
          S: TIMESTAMP_KEY,
        },
      },
      TableName: AppConfig.instance.tableName,
    };
    const data: GetItemOutput = await DB.getItem(params).promise();
    if (!!data.Item && !!data.Item[CHECKPOINT_ATTRIBUTE] && !!data.Item[CHECKPOINT_ATTRIBUTE].N) {
      return +(data.Item[CHECKPOINT_ATTRIBUTE].N || '0');
    } else {
      return -1;
    }
  }

  public setLastTweetDate(timestamp: number): void {
    const params: PutItemInput = {
      Item: {
        [CHECKPOINT_ATTRIBUTE]: {
          N: timestamp.toString(),
        },
        id: {
          S: TIMESTAMP_KEY,
        },
      },
      TableName: AppConfig.instance.tableName,
    };
    DB.putItem(params, err => {
      if (err) {
        Logger.error('Error while updating checkpoint teimstamp: ', err);
      } else {
        Logger.debug('Checkpoint timestamp updated: ', new Date(timestamp).toUTCString());
      }
    });
  }
}
