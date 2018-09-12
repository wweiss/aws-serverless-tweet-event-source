# AWS Serverless Tweet Event Source

This serverless app creates an AWS Lambda event source by invoking a given lambda function to monitor tweets returned by a predefined search query. It works by periodically polling the freely available public Twitter API and invoking a lambda function you provide to process the returned tweets.

## Architecture

1.  The **TweetPoller** lambda function is periodically triggered by a CloudWatch Events Rule.

2.  A DynamoDB table is used to keep track of a checkpoint, which is the timestamp of the most recent tweet.

3.  The poller function calls the public Twitter API and fetches recent tweets matching the specified **SearchQuery** (provided by the app user).

4.  The **TweetProcessor** lambda function (provided by the app user) is invoked with the received tweets if newer the the previous timestamp.

    i. Note, the **TweetProcessor** function is invoked asynchronously (Event invocation type). The app does not confirm that the lambda was able to successfully process the listings.

## Installation Steps

1.  [Create a Twitter Developer Account](https://developer.twitter.com/en/apply-for-access) if you do not already have one and login

2.  Go to the app's page on the [Serverless Application Repository](https://localhost) and click "Deploy"

3.  Provide the required app parameters (see below for steps to create Twitter API parameters, e.g., Consumer API Key)

## Twitter Consumer API Key Parameters

The app requires the following Twitter API parameters: Consumer Key (API Key) and Consumer Secret (API Secret). The following steps walk you through registering the app with your Twitter account to create these values.

1.  Create a [Twitter](https://developer.twitter.com/en/apply-for-access) account if you do not already have one

2.  Create a new application.

    i.Go to https://developer.twitter.com/en/apps/create

    ii. Fill out required fields and click "Create"

3.  Get API Key:

    i. After creating your application, go to the [applications page](https://developer.twitter.com/en/apps) and click on "Details" next to your new application.

    ii. Click on the "Keys and tokens" tab at the top of the page.

    iii. Your keys are listed under "Consumer API Keys".

4.  (Optional) Limit Permissions

    i. For added security, click the "Permissions" tab at the top of the screen.

    ii. Click "Edit" and then select the "Read-only" radio button.

    iii. Click "Save".

### Encrypting the Twitter API Keys

Once you've created your Twitter API keys, you can copy it as plain text into the **ConsumerApiKey** and **ConsumerApiSecretKey** parameters of the serverless application. However, it is highly recommended that you do NOT pass these values in as plain text and instead encrypt them using an AWS Key Management Service (KMS) key. Once encrypted, you put the encrypted values into the **EncryptedConsumerApiKey** and **EncryptedConsumerApiSecretKey** parameters and provide the **DecryptionKeyName** parameter as well. The reason the plain text fields are provided at all is so this app can be used in regions that do not support AWS KMS.

The following subsections walk you through how to create a KMS key using the AWS console and encrypt your Twitter API Keys using the AWS CLI.

#### Create a new KMS Key

1.  Login to the AWS IAM console.

2.  Click the "Encryption keys" menu item.

3.  (Important) Just below the "Create key" button, there will be a Region selected. Change this to be the same region that you will deploy your app to.

4.  Click "Create key".

5.  Enter an alias, e.g., "twitter-api" and click "Next Step".

6.  Click "Next Step" again to skip the add tags step.

7.  Select a role that is allowed to administer the key, e.g., delete it, and click "Next Step".

8.  Select a role that is allowed to use the key, e.g., encrypt with it, and click "Next Step".

9.  Preview the key policy and then click "Finish".

10. Click on your newly created key and copy its full ARN value.

#### Encrypt Twitter API parameters with the AWS CLI

1.  Install the AWS CLI.

2.  Encrypt your Twitter Consumer API Key by running this command: `aws kms encrypt --key-id <key ARN> --plaintext '<Twitter Consumer API key>'`

3.  The result JSON will contain a field called `CiphertextBlob`. That string value (without the double-quotes) is what should be provided into the **EncryptedConsumerApiKey** parameter of the serverless app.

4.  Repeat for these step for the **EncryptedConsumerApiSecretKey**.

## Other Parameters

In addition to the Twitter Consumer API Key parameters, the app also requires some of the following parameters:

1.  **SearchQuery** (required) - This is the search query to be used to select which tweets from the last 7 days will be returned.

    i. Please note that this string _should not be URL encoded_, the app will take care of that.

    ii. A guide on writing search queries can be found [here](https://developer.twitter.com/en/docs/tweets/search/guides/standard-operators).

2.  **AdditionalParamters** (optional) - Parameters to further refine what tweets are returned by the Twitter API.

    i. These should be defined as a query string _without_ the leading `?`.

    ii. _Do not redefine the `q` parameter here!_

    iii. A list of parameters can be found [here](https://developer.twitter.com/en/docs/tweets/search/api-reference/get-search-tweets).

3.  **ProcessorFunctionName** (required) - This is the name (not ARN) of the lambda function that will process tweets gathered by the app.

4.  **DecryptionKeyName** (required if providing encrypted Twitter Consumer API Keys) - This is the KMS key name of the key used to encrypt the Twitter Consumer API Keys parameters. Note, this must be just the key name (UUID that comes after key/ in the key ARN), not the full key ARN. It's assumed the key was created in the same account and region as the app deployment.

5.  **PollingFrequencyInMinutes** (optional) - The frequency at which the lambda will poll the Twitter API (in minutes). Default: 5.

6.  **PerRequestTimeout** (optional) - Milliseconds before any given request to the Twitter API will timeout and give up. Default: 1500.

7.  **PollTimeout** (optional) - Maximum time in seconds to spend on a given polling sesssion. Default: 30.

8.  **LoggingLevel** (optional) - The level of logging desired (`error,warn,info,debug` or `trace`).

# Special Thanks

Special thanks to AWS Labs and their excellent [Twitter Event Source](https://github.com/awslabs/aws-serverless-twitter-event-source) for providing the idea and foundations for this app.
