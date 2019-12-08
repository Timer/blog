---
slug: 'practical-xargs'
title: 'xargs(1), Shell Brace Expansion, and Single-Line Execution'
date: '2019-12-08T05:35:07.322Z'
---

`xargs` reads space and line delimited strings from stdin and executes a specified command with the input as arguments.

This makes `xargs` a very powerful command when you want to run a command against arbitrary input.

For example, let's run the following command:

```bash
❯ echo 'hello    there\nbig         world' | xargs echo
```

`xargs` automatically parses `hello`, `there`, `big`, and `world` as individual inputs.
Then, these arguments are passed to the specified command (in this case, also `echo`).

```bash
❯ echo 'hello    there\nbig         world' | xargs echo

# What gets executed:
# echo 'hello' 'there' 'big' 'world'

# Output:
hello there big world
```

> **Note**: All computed input arguments were passed to a single `echo` command.

For more practical usage, you may find yourself wanting to run a command per single input line.
For example, when the command you're using doesn't support multiple arguments.

A common command I find this useful for is `aws s3`.
`aws s3` doesn't support passing multiple arguments, so each command may only accept a single bucket name.

For example, using brace expansion and `xargs` to pipe bucket names to `aws s3 rm` doesn't work:

```bash
❯ echo s3://my-bucket/partition-{1..3}/ | xargs aws s3 rm --recursive

# What gets executed:
# aws s3 rm --recursive 's3://my-bucket/partition-1/' 's3://my-bucket/partition-2/' 's3://my-bucket/partition-3/'

# Output:
Unknown options: s3://my-bucket/partition-2/,s3://my-bucket/partition-3/
```

To solve this, `xargs` accepts an `-n <number>` argument.
The `-n` argument configures how many arguments should be per command invocation (the default is `5000`).

So, since `aws s3 rm` only accepts one argument, we can pass `-n 1` to `xargs` to execute a single command per line:

```bash
❯ echo s3://my-bucket/partition-{1..3}/ | xargs -n 1 aws s3 rm --recursive

# What gets executed (sequentially):
# aws s3 rm --recursive 's3://my-bucket/partition-1/'
# aws s3 rm --recursive 's3://my-bucket/partition-2/'
# aws s3 rm --recursive 's3://my-bucket/partition-3/'

# Output:
success
success
success
```

> **Note**: The `aws s3 rm` command was invoked three times—one per input.

Success! 🎉

Now that we're running one command per line, it's important to note it's done so sequentially.
However, you may also want to parallelize execution of long-running commands.

`xargs` has an argument for parallelizing execution: `-P <number>`.

The above `aws s3 rm --recursive` example may take very long per parition, so we can maximize efficency by running all the commands at once.
To do this, we'll pass the `-P 3` argument:

```bash
❯ echo s3://my-bucket/partition-{1..3}/ | xargs -n 1 -P 3 aws s3 rm --recursive

# What gets executed (in parallel):
# aws s3 rm --recursive 's3://my-bucket/partition-1/'
# aws s3 rm --recursive 's3://my-bucket/partition-2/'
# aws s3 rm --recursive 's3://my-bucket/partition-3/'

# Output:
success
success
success
```

> **Tip**: To run one-command per CPU, you can use this handy shortcut:
>
> ```bash
> xargs -n 1 -P $(getconf _NPROCESSORS_ONLN) command
> ```

Good luck! 🏎

<!--
TODO: how to handle spaces in arguments:
1. echo with escaped slashes
2. use NUL (``\0'') characters as the separator, instead of spaces and lines (see -print0 w/ find(1))
-->
