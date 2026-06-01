<!--
Admin form fields:
  Title:    The two-IAM-roles trap in AWS SSM CD
  Slug:     the-two-iam-roles-trap-in-ssm-cd (auto-derived)
  Excerpt:  Your GitHub Actions workflow can send the SSM command and still not be able to read its result. The role that calls SendCommand and the role that calls GetCommandInvocation are conceptually the same thing — but AWS doesn't think so, and your "successful" deploy will hang waiting for a status it can't fetch.
  Cover:    (none)
  Body:     everything below this comment
-->

Here's the CD pipeline I shipped last week, in shape:

```yaml
- name: Trigger deploy via SSM
  run: |
    COMMAND_ID=$(aws ssm send-command \
      --instance-ids "$INSTANCE_ID" \
      --document-name "AWS-RunShellScript" \
      --parameters 'commands=["cd /opt/app && docker compose pull && docker compose up -d"]' \
      --query 'Command.CommandId' --output text)

    echo "Command ID: $COMMAND_ID"

    while true; do
      STATUS=$(aws ssm get-command-invocation \
        --command-id "$COMMAND_ID" \
        --instance-id "$INSTANCE_ID" \
        --query 'Status' --output text)
      case "$STATUS" in
        Success)   exit 0 ;;
        Failed|Cancelled|TimedOut) exit 1 ;;
        *) sleep 5 ;;
      esac
    done
```

The OIDC role this workflow assumes has a policy granting `ssm:SendCommand` against the instance. The first deploy ran. The first deploy showed success in CloudWatch. The first deploy *also* hung the GitHub Actions job for ten minutes, then failed with:

```
An error occurred (AccessDeniedException) when calling the GetCommandInvocation operation: User: arn:aws:sts::…:assumed-role/synap-cd-deploy-role/… is not authorized to perform: ssm:GetCommandInvocation
```

The deploy worked. The job failed. The workflow turned red. Slack pinged the on-call. On-call (me) spent twenty minutes trying to figure out what actually shipped.

This post is about the IAM permission split that nearly every guide to using SSM from GitHub Actions gets wrong by omission.

## What `ssm:SendCommand` does and doesn't grant

The mental model most folks build the first time: "I gave the role SSM access, the role can do SSM things." That model is wrong, in a very specific way.

`ssm:SendCommand` lets you queue a command for execution on an instance. It returns a `CommandId`. That's it.

`ssm:GetCommandInvocation` lets you fetch the *status and output* of a previously-queued command. It's a separate operation. Granting one doesn't grant the other.

If your workflow does the realistic CD pattern — *send a command, then poll for its result* — you need both permissions. The first is well-publicized. The second is treated as a footnote that nobody reads.

## What "deploy succeeded but job failed" looks like

You start out polling something like:

```bash
while true; do
  STATUS=$(aws ssm get-command-invocation --command-id "$COMMAND_ID" --instance-id "$INSTANCE_ID" \
    --query 'Status' --output text 2>/dev/null || echo "InProgress")
  ...
done
```

Notice the `2>/dev/null || echo "InProgress"`. This is the trap. AccessDenied gets swallowed; the script falls back to "InProgress"; the loop continues; the deploy actually succeeds on the box; but the loop never observes the `Success` status because it can never read the status. It eventually times out the GitHub Actions job at whatever your step timeout is.

The deploy happened. The pipeline thinks it didn't. The next person to push a change either re-deploys (now you've shipped the same image twice) or rolls back (now you've rolled back a working deploy). Both are wrong.

The first time I hit this, I'd already merged the "fix" PR. The actual fix needed a separate operator action on the AWS console — adding `ssm:GetCommandInvocation` to the role's policy — and there was no way for the workflow to grant itself that permission. I had to write the workflow PR, merge it, *and* leave a comment in the PR body saying "operator must add this IAM permission before this workflow will report deploys correctly." It still took two deploys to confirm.

## The actual policy you need

For a GitHub Actions OIDC role that does "ship and verify" against a specific instance:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "QueueDeployCommand",
      "Effect": "Allow",
      "Action": "ssm:SendCommand",
      "Resource": [
        "arn:aws:ssm:us-east-1::document/AWS-RunShellScript",
        "arn:aws:ec2:us-east-1:ACCOUNT_ID:instance/i-1234567890abcdef0"
      ]
    },
    {
      "Sid": "PollDeployStatus",
      "Effect": "Allow",
      "Action": "ssm:GetCommandInvocation",
      "Resource": "*"
    }
  ]
}
```

Two actions, two statements, two resource scopes.

- **SendCommand** is resource-scoped to the document AND the specific instance. The role can only queue `AWS-RunShellScript` commands, only on the one EC2 instance you've authorized. That's tight enough to feel safe.
- **GetCommandInvocation** has resource `"*"`. This isn't laziness. `GetCommandInvocation` accepts a `CommandId` and an `InstanceId`; there's no resource ARN it operates against in the conventional sense. AWS's IAM model for this action only supports `*`. You can't tighten it further; you can only choose whether to grant it at all.

This is the second-order trap. Someone reviewing the policy says "why is this one starred?" and the answer is "because AWS only lets you grant it starred, and you need it." Document that in the policy with the `Sid` so the next reviewer understands.

## A worse failure mode that happens once

If your polling loop swallows AccessDenied as I described above, and you *also* set an aggressive step timeout (say, 5 minutes), this is what your CI/CD log looks like:

```
Run: aws ssm send-command ...
Command ID: abc-123-def
Status: InProgress
Status: InProgress
... (every 5 seconds for 5 minutes) ...
Error: The action 'Deploy' exceeded its 5 minute timeout
```

There is no error message about IAM. There is no error message about the underlying SSM call failing. The `2>/dev/null` ate the only diagnostic. From the logs, all you can tell is "deployment was slow." So you increase the timeout to 15 minutes. Re-run. Same loop. Same outcome 10 minutes later.

The fix is to *not* swallow errors:

```bash
while true; do
  STATUS=$(aws ssm get-command-invocation --command-id "$COMMAND_ID" --instance-id "$INSTANCE_ID" \
    --query 'Status' --output text)
  case "$STATUS" in
    Success)   echo "Deploy succeeded"; exit 0 ;;
    Failed)    aws ssm get-command-invocation --command-id "$COMMAND_ID" --instance-id "$INSTANCE_ID"; exit 1 ;;
    Cancelled) echo "Deploy cancelled"; exit 1 ;;
    TimedOut)  echo "Deploy timed out on the box"; exit 1 ;;
    Pending|InProgress|Delayed) sleep 5 ;;
    *) echo "Unexpected status: $STATUS"; exit 1 ;;
  esac
done
```

If `get-command-invocation` returns AccessDenied, the shell exits with a non-zero status, the GitHub Action step fails immediately, and the log shows the actual IAM error. You lose the "deploy succeeded silently" footgun in exchange for "the workflow fails clearly at the first bad call." That's the trade I want.

## A surprising corollary: split the role responsibilities

Some teams I've talked to handle this by splitting CD into two stages: a *trigger* stage (uses a role with only `ssm:SendCommand`) and a *verify* stage (uses a role with only `ssm:GetCommandInvocation`). The trigger stage emits the `CommandId` as an output; the verify stage consumes it.

That gives you tighter least-privilege ("the trigger role can't read other people's command output") but the operational cost is real — two role configurations, two OIDC trust policies, two IAM things to forget to set up. Unless you have a specific reason to enforce that split, one role with both actions is fine, especially when the verify role is `*`-scoped anyway and so doesn't gain much from being separate.

If you're the audit-conscious type, the meaningful tightening is on `SendCommand` — make sure that resource list is the specific instance and document you intend to ship to. The verify side can't be tightened, so it shouldn't get hand-wringing energy that the send side deserves.

## What I wish guides led with

Every "GitHub Actions → SSM CD" guide I've read starts with the OIDC trust policy, the role assumption, the `SendCommand` invocation. Most of them stop there — and most of them, if you copy them verbatim, give you the silent-failure pipeline I described above. The polling loop is treated as the "and then you fetch the result" footnote, with no warning that fetching the result needs a separate permission.

If you're writing this kind of guide, lead with the **policy you actually need** — both actions, both scopes — and walk through the failure mode where you forget the second one. The first deploy after a fresh setup is the most likely place to hit this; surfacing it before someone gets bitten saves more time than the polished step-by-step does after.

## The summary

`ssm:SendCommand` queues. `ssm:GetCommandInvocation` reads. They're separate IAM actions; granting one doesn't grant the other; CD pipelines need both; the second one only accepts `*` resource scope. Don't swallow errors in your polling loop. The deploy that "succeeded but failed" is almost always this missing permission.

It takes thirty seconds to fix once you know. It can take half a deploy cycle to figure out the first time. Now you know.
