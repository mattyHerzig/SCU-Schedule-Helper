import {
  CloudWatchLogsClient,
  DescribeMetricFiltersCommand,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const cwlClient = new CloudWatchLogsClient({ region: "us-west-1" });
const snsClient = new SNSClient({ region: "us-west-1" });

export const handler = async (event) => {
  const message = JSON.parse(event.Records[0].Sns.Message);

  const requestParams = {
    metricName: message.Trigger.MetricName,
    metricNamespace: message.Trigger.Namespace,
  };

  try {
    const metricFiltersData = await cwlClient.send(
      new DescribeMetricFiltersCommand(requestParams),
    );
    console.log("Metric Filter data is:", metricFiltersData);

    await getLogsAndPublishToSNS(message, metricFiltersData);
  } catch (err) {
    console.error("Error fetching metric filters:", err);
  }
};

async function getLogsAndPublishToSNS(message, metricFilterData) {
  const timestamp = Date.parse(message.StateChangeTime);
  const offset =
    message.Trigger.Period * message.Trigger.EvaluationPeriods * 1000;

  try {
    let logEvents = [];
    for (const metricFilter of metricFilterData.metricFilters) {
      const parameters = {
        logGroupName: metricFilter.logGroupName,
        filterPattern: metricFilter.filterPattern || "",
        startTime: timestamp - offset,
        endTime: timestamp,
      };
      const logData = await cwlClient.send(
        new FilterLogEventsCommand(parameters),
      );
      if (logData.events) {
        for (const event of logData.events) {
          event.logGroupName = metricFilter.logGroupName;
        }
        logEvents = logEvents.concat(logData.events);
      }
    }

    console.log("===PUBLISHING TO SNS===");

    const snsParams = generateSNSContent(logEvents, message);
    const snsResponse = await snsClient.send(new PublishCommand(snsParams));

    console.log("===SNS MESSAGE SENT===");
    console.log(snsResponse);
  } catch (err) {
    console.error("Error filtering logs or publishing to SNS:", err);
  }
}

function generateSNSContent(events, message) {
  let logData = "Logs:\n\n";
  events.forEach((event) => {
    logData += `Function: ${event.logGroupName}\n`;
    logData += `Log stream: ${event.logStreamName}\n`;
    logData += `Message: ${event.message}\n\n`;
  });

  const date = new Date(message.StateChangeTime);
  const text = `
Region: ${message.Region}
Alarm Time: ${date.toString()}
${logData}`;

  return {
    Message: text,
    Subject: `New Error - ${message.AlarmName}`,
    TopicArn: "arn:aws:sns:us-west-1:100329216735:CloudWatch_Alarm_Emails",
  };
}
