import type { CloudProvider, CloudOperation } from '../CloudProvider.js';

const AWS_READ_OPERATIONS: CloudOperation[] = [
  { name: 'sts_get_caller_identity', command: 'aws sts get-caller-identity', description: 'Get current AWS account identity', classification: 'read' },
  { name: 's3_list_buckets', command: 'aws s3 ls', description: 'List S3 buckets', classification: 'read' },
  { name: 'ec2_describe_instances', command: 'aws ec2 describe-instances', description: 'Describe EC2 instances', classification: 'read' },
  { name: 'lambda_list_functions', command: 'aws lambda list-functions', description: 'List Lambda functions', classification: 'read' },
  { name: 'iam_get_account_summary', command: 'aws iam get-account-summary', description: 'Get IAM account summary', classification: 'read' },
  { name: 'cloudwatch_describe_alarms', command: 'aws cloudwatch describe-alarms', description: 'Describe CloudWatch alarms', classification: 'read' },
  { name: 'ec2_describe_vpcs', command: 'aws ec2 describe-vpcs', description: 'Describe VPCs', classification: 'read' },
];

export class AWSCloudProvider implements CloudProvider {
  readonly id = 'aws';
  readonly name = 'Amazon Web Services';

  getReadOperations(): CloudOperation[] {
    return AWS_READ_OPERATIONS;
  }

  buildCommand(operation: string, params?: Record<string, string>): string | null {
    const op = AWS_READ_OPERATIONS.find((o) => o.name === operation);
    if (!op) return null;

    let command = op.command;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        command += ` --${key} ${value}`;
      }
    }
    return command;
  }
}

export function createAWSCloudProvider(): AWSCloudProvider {
  return new AWSCloudProvider();
}
