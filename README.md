# AWS Serverless Tweet Event Source

This serverless app creates an AWS Lambda event source by invoking a given lambda function to monitor tweets returned by a predefined search query. It works by periodically polling the freely available public Twitter API and invoking a lambda function you provide to process the returned tweets.