import { DynamoDB } from 'aws-sdk';
import { PutItemInput } from 'aws-sdk/clients/dynamodb';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';

import { Logger, LoggerFactory } from '@codificationorg/commons-core';

import { PollingCheckpoint } from './';
import { AppConfig } from './AppConfig';

const Logger = LoggerFactory.getLogger();

const CHECKPOINT_ATTRIBUTE = 'checkpoint';
const TIMESTAMP_KEY = 'CHECKPOINT_TIMESTAMP';
const DB: DynamoDB = new DynamoDB();

export class DynamoDBPollingCheckpoint implements PollingCheckpoint {
  public getLastTweetDate(): Observable<number> {
    const params = {
      Key: {
        id: {
          S: TIMESTAMP_KEY,
        },
      },
      TableName: AppConfig.instance.tableName,
    };
    return Observable.create((observer: Observer<string>) => {
      DB.getItem(params, (err, data) => {
        if (err) {
          observer.error(err);
        } else if (data.Item) {
          observer.next(data.Item[CHECKPOINT_ATTRIBUTE].N);
        } else {
          observer.next('');
        }
        observer.complete();
      });
    });
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
    DB.putItem(params, (err, data) => {
      if (err) {
        Logger.error('Error while updating checkpoint teimstamp: ', err);
      } else {
        Logger.debug('Checkpoint timestamp updated: ', new Date(timestamp).toUTCString());
      }
    });
  }
}
