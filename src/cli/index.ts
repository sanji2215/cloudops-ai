#!/usr/bin/env node
import { Command } from 'commander';
import * as readline from 'node:readline';
import chalk from 'chalk';
import ora from 'ora';
import { VERSION, APP_NAME } from '../index.js';
import { createAgentService } from '../service/index.js';
import { getConfiguredProviders, loadConfig } from '../config/index.js';
import { deployRepository } from '../deploy/index.js';

const program = new Command();

program
  .command('deploy <repository>')
  .description('Clone a Git repository and deploy it to Vercel')
  .option('--preview', 'Create a preview deployment instead of production')
  .option('--branch <name>', 'Deploy a specific branch')
  .option('--project <name>', 'Vercel project name')
  .option('--team <slug>', 'Vercel team slug')
  .option('--token <token>', 'Vercel token (defaults to VERCEL_TOKEN)')
  .option('--dry-run', 'Show the deployment command without executing it')
  .action(async (repository: string, options: Record<string, unknown>) => {
    const spinner = ora('Deploying repository to Vercel...').start();
    try {
      const result = await deployRepository(repository, {
        production: !options['preview'],
        branch: options['branch'] as string | undefined,
        project: options['project'] as string | undefined,
        team: options['team'] as string | undefined,
        token: options['token'] as string | undefined,
        dryRun: options['dryRun'] as boolean,
      });
      spinner.succeed(options['dryRun'] ? 'Deployment simulated' : 'Deployment complete');
      console.log(result.url ? chalk.green(`Live URL: ${result.url}`) : result.output);
    } catch (error) {
      spinner.fail('Deployment failed');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exitCode = 1;
    }
  });

program
  .name('cloudops')
  .description(`${APP_NAME} - AI-powered Cloud/DevOps agent`)
  .version(VERSION)
  .argument('[prompt]', 'Natural language request to execute')
  .option('-v, --verbose', 'Enable verbose debug logging')
  .option('--dry-run', 'Simulate mutating operations without executing')
  .option('--plan', 'Generate a plan before executing')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('--provider <id>', 'Override default AI provider')
  .option('--model <name>', 'Override default model')
  .action(async (prompt: string | undefined, options: Record<string, unknown>) => {
    const config = loadConfig({
      verbose: Boolean(options['verbose']),
      configFile: options['config'] as string | undefined,
      defaultProvider: options['provider'] as string | undefined,
      defaultModel: options['model'] as string | undefined,
    });

    const providers = getConfiguredProviders(config);
    if (providers.length === 0) {
      console.error(chalk.red('No AI providers configured.'));
      console.error(chalk.yellow('Set at least one API key in .env (see .env.example).'));
      process.exit(1);
    }

    const service = createAgentService({
      verbose: Boolean(options['verbose']),
      dryRun: Boolean(options['dryRun']),
      planMode: Boolean(options['plan']),
      configFile: options['config'] as string | undefined,
      defaultProvider: options['provider'] as string | undefined,
      defaultModel: options['model'] as string | undefined,
    });

    const agentOptions = {
      dryRun: Boolean(options['dryRun']),
      planMode: Boolean(options['plan']),
      explicitProvider: options['provider'] as string | undefined,
      explicitModel: options['model'] as string | undefined,
      onProgress: (summary: string) => {
        if (options['verbose']) {
          console.log(chalk.dim(`[progress] ${summary}`));
        }
      },
      onMessage: (content: string) => {
        console.log(chalk.cyan('\nAssistant:\n') + content);
      },
    };

    if (prompt) {
      await runSinglePrompt(service, prompt, agentOptions, Boolean(options['plan']));
    } else {
      runInteractive(service, agentOptions);
    }
  });

async function runSinglePrompt(
  service: ReturnType<typeof createAgentService>,
  prompt: string,
  options: Parameters<ReturnType<typeof createAgentService>['run']>[1],
  planMode: boolean,
): Promise<void> {
  const spinner = ora('Processing request...').start();

  try {
    const result = await service.run(prompt, options);
    spinner.stop();

    if (planMode && result.plan) {
      console.log(chalk.blue('\n' + result.plan + '\n'));
    }

    console.log(chalk.green('\nResult:\n') + result.response);

    if (result.verified) {
      console.log(chalk.green('\n✓ Verified'));
    } else {
      console.log(chalk.yellow('\n⚠ Verification incomplete'));
    }
  } catch (error) {
    spinner.fail('Request failed');
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(message));
    process.exit(1);
  }
}

function runInteractive(
  service: ReturnType<typeof createAgentService>,
  options: Parameters<ReturnType<typeof createAgentService>['run']>[1],
): void {
  console.log(chalk.bold(`\n${APP_NAME} v${VERSION}`));
  console.log(chalk.dim('Interactive mode. Type "exit" or Ctrl+C to quit.\n'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const promptUser = (): void => {
    rl.question(chalk.green('> '), (input) => {
      void handleInput(input);
    });
  };

  const handleInput = async (input: string): Promise<void> => {
    const trimmed = input.trim();
    if (!trimmed || trimmed === 'exit' || trimmed === 'quit') {
      rl.close();
      return;
    }

    const spinner = ora('Thinking...').start();
    try {
      const result = await service.run(trimmed, options);
      spinner.stop();

      if (result.plan) {
        console.log(chalk.blue('\n' + result.plan));
      }
      console.log(chalk.cyan('\n' + result.response + '\n'));
    } catch (error) {
      spinner.fail('Error');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    }

    promptUser();
  };

  promptUser();
}

program.parse();
