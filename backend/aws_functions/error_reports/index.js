import {
  CloudWatchLogsClient,
  DescribeMetricFiltersCommand,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const region = process.env.SNS_CWL_REGION;
const periodLengthMs = process.env.PERIOD_LENGTH_MS;
const periodTimezone = process.env.PERIOD_TIMEZONE;
const snsReceiverTopicArn = process.env.SNS_RECEIVER_TOPIC_ARN;
const metricName = process.env.METRIC_NAME;
const metricReadableName = process.env.METRIC_READABLE_NAME;
const metricNamespace = process.env.METRIC_NAMESPACE;
const reportSubject = process.env.REPORT_SUBJECT;

const cwlClient = new CloudWatchLogsClient({ region });
const snsClient = new SNSClient({ region });

export const handler = async (event) => {
  const requestParams = {
    metricName,
    metricNamespace,
  };

  try {
    const metricFiltersData = await cwlClient.send(
      new DescribeMetricFiltersCommand(requestParams),
    );

    await getLogsAndPublishToSNS(metricFiltersData);
  } catch (err) {
    console.error("Error fetching metric filters:", err);
  }
};

async function getLogsAndPublishToSNS(metricFilterData) {
  try {
    let logEvents = [];
    for (const metricFilter of metricFilterData.metricFilters) {
      const parameters = {
        logGroupName: metricFilter.logGroupName,
        filterPattern: metricFilter.filterPattern || "",
        startTime: Date.now() - periodLengthMs,
        endTime: Date.now(),
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

    if (logEvents.length === 0) {
      return;
    }
    await snsClient.send(new PublishCommand(generateSNSContent(logEvents)));
  } catch (err) {
    console.error("Error filtering logs or publishing to SNS:", err);
  }
}

function generateSNSContent(events) {
  let logData = "Logs:\n\n";
  events.forEach((event) => {
    logData += `Function: ${event.logGroupName}\n`;
    logData += `Log stream: ${event.logStreamName}\n`;
    logData += `Message: ${event.message}\n\n`;
  });

  const date = new Date();
  const text = `
Region: ${region}
Period (${periodTimezone}): ${new Date(
    date.getTime() - periodLengthMs,
  ).toLocaleString(
    {},
    {
      timeZone: periodTimezone,
    },
  )} to ${date.toLocaleString(
    {},
    {
      timeZone: periodTimezone,
    },
  )} 
Total ${metricReadableName}: ${events.length}
${logData}`;

  return {
    Message: text,
    Subject: reportSubject,
    TopicArn: snsReceiverTopicArn,
  };
}
