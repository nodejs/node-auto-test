'use strict'

import pkg from "@octokit/action";
const { Octokit } = pkg;
import ValidateCommit from "core-validate-commit";
console.log(ValidateCommit)
import { readFile } from "fs/promises";

const octokit = new Octokit();
const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
const eventPayload = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH));
console.log(eventPayload)
const { job_id } = eventPayload

await octokit.actions.getJobForWorkflowRun({ repo, owner, job_id })

const { data: checkRun } = await octokit.checks.create({
  repo,
  owner,
  'name': 'Validate Commit',
  'head_sha': eventPayload.pull_request.head.sha
});

console.log(checkRun)
process.exit()

const { repository } = await octokit.graphql(
  `query($owner:String!, $repo:String!, $pr:Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $pr) {
          commits(last: 250) {
            nodes {
              commit {
                oid
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

// process.on('exit', () => {
//   console.log(errors)
//   const { data: checkRun } = await octokit.checks.update({
//     repo,
//     owner,
//     check_run_id: checkRun.id,
//     'status': 'completed',
//     'conclusion': 'neutral',
//     'output': {
//       'annotations': [
//       ]
//     }

//   });
// });

validate.on('message', ({ data, commit }) => {
  const { message, level } = data;
  if (level === 'pass' || level === 'skip') {
    return;
  }

  errors.push({
    path: sha,
    start_line: 1,
    end_line: 1,
    annotation_level: level === fail ? 'failure' : 'warning',
    message,
    title,
    raw_details: this._rawStr
  });
})

const skippable = [
  'fixup!', '!fixup', '[fixup]', 'fixup:', 'fixup ',
  'squash!', '!squash', '[squash]', 'squash:', 'squash ',
]

for (const { commit } of repository.pullRequest.commits.nodes) {
  const { headers, data } = await octokit.git.getCommit({
    "owner": owner,
    "repo": repo,
    "commit_sha": commit.oid
  })
  if (skippable.some(data.title.startsWith)) {
    continue
  }
  validate.lint(data)
}
