'use strict'

import pkg from "@octokit/action";
const { Octokit } = pkg;
import ValidateCommit from "core-validate-commit";
import { readFile } from "fs/promises";

const octokit = new Octokit();
const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
const eventPayload = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH));

const { data: checkRun } = await octokit.checks.create({
  repo,
  owner,
  'name': 'Validate Commit',
  'head_sha': eventPayload.pull_request.head.sha
});

const { repository } = await octokit.graphql(
  `query($owner:String!, $repo:String!, $pr:Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $pr) {
          commits(last: 250) {
            nodes {
              commit {
                oid,
                message
              }
            }
          }
        }
      }
    }`,
  {
    owner: owner,
    repo: repo,
    pr: eventPayload.number
  }
);

const validate = new ValidateCommit({ 'validate-metadata': false })

const errors = []
let shouldExit = false;

process.on('beforeExit', () => {
  if (shouldExit) {
    return
  }
  shouldExit = true
  console.log(errors)
  if (errors.length === 0) {
    octokit.checks.update({
      repo,
      owner,
      check_run_id: checkRun.id,
      'status': 'completed',
      'conclusion': 'success',
      'output': {
        'title': "Valid Commit",
        'summary': "",
        'annotations': errors
      }
    }).then(() => console.log('done'))
    return
  }
  const summary = `Commits listed below don't follow  our [commit guidelines](https://goo.gl/p2fr5Q):

${errors.map(e => `- [${e.sha} ${e.title}] ${e.message}`).join('\n')}`;

  octokit.checks.update({
    repo,
    owner,
    check_run_id: checkRun.id,
    'status': 'completed',
    'conclusion': 'neutral',
    'output': {
      'title': "Invalid Commit Message",
      summary,
      'annotations': errors
    }
  }).then(() => console.log('done'))
});

validate.on('message', ({ data, commit }) => {
  const { message, level } = data;
  if (level === 'pass' || level === 'skip') {
    return;
  }

  const { title, sha } = commit
  errors.push({
    path: sha,
    start_line: 1,
    end_line: 1,
    annotation_level: level === 'fail' ? 'failure' : 'warning',
    message,
    title,
    raw_details: commit._rawStr
  });
})

const skippable = [
  'fixup!', '!fixup', '[fixup]', 'fixup:', 'fixup ',
  'squash!', '!squash', '[squash]', 'squash:', 'squash ',
]

for (const { commit } of repository.pullRequest.commits.nodes) {
  if (skippable.some(s => commit.message.startsWith(s))) {
    continue
  }
  const { headers, data } = await octokit.git.getCommit({
    "owner": owner,
    "repo": repo,
    "commit_sha": commit.oid
  })
  validate.lint(data)
}
