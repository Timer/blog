---
slug: 'practical-xargs'
title: 'xargs(1), Shell Brace Expansion, and Single-Line Execution'
date: '2019-12-08T05:35:07.322Z'
---

`xargs` reads space and line delimited strings from stdin and executes a specified command with the input as arguments.<sub style="font-size:0.7em"><a href="#ref-1">[1]</a></sub>

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

For more practical usage, you may find yourself wanting to run a command once per argument.
For example, when the command you're using only accepts a single argument.

A common command I find this useful for is `aws s3`.
`aws s3` doesn't support passing multiple arguments, so each command may only accept a single S3 path.

For example, using brace expansion and `xargs` to pipe S3 paths to `aws s3 rm` doesn't work:

```bash
❯ echo s3://my-bucket/partition-{1..3}/ | xargs aws s3 rm --recursive

# What gets executed:
# aws s3 rm --recursive 's3://my-bucket/partition-1/' 's3://my-bucket/partition-2/' 's3://my-bucket/partition-3/'

# Output:
Unknown options: s3://my-bucket/partition-2/,s3://my-bucket/partition-3/
```

To solve this, `xargs` accepts an `-n <number>` argument.<sub style="font-size:0.7em"><a href="#ref-2">[2]</a></sub>
The `-n` argument configures how many arguments should be per command invocation.

So, since `aws s3 rm` only accepts one argument, we can pass `-n 1` to `xargs` to execute one command per argument:

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

> **Note**: The `aws s3 rm` command was invoked three times, once per argument.

Success! 🎉

Now that we're running one command per argument, it's important to note it's done so sequentially.
However, you may also want to parallelize execution of long-running commands.

`xargs` has an argument for parallelizing execution: `-P <number>`.<sub style="font-size:0.7em"><a href="#ref-3">[3]</a></sub>

The above `aws s3 rm --recursive` example may take a long time per path, so we can maximize efficiency by running all the commands at once.
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

> **Tip**: To run one command per CPU, you can use this handy shortcut:
>
> ```bash
> xargs -n 1 -P $(getconf _NPROCESSORS_ONLN) command
> ```

Good luck! 🏎

<small>

<span id="ref-1">[1]</span> IEEE Std 1003.1. ["xargs — construct argument lists and invoke utility"](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/xargs.html). The Open Group Base Specifications.

<span id="ref-2">[2]</span> GNU. ["xargs invocation"](https://www.gnu.org/software/findutils/manual/html_node/find_html/xargs-options.html). GNU Findutils Manual. `-n max-args`: Use at most max-args arguments per command line.

<span id="ref-3">[3]</span> GNU. ["Controlling Parallelism"](https://www.gnu.org/software/findutils/manual/html_node/find_html/Controlling-Parallelism.html). GNU Findutils Manual. `-P max-procs`: Run up to max-procs processes at a time.

</small>

<!--
TODO: how to handle spaces in arguments:
1. echo with escaped slashes
2. use NUL (``\0'') characters as the separator, instead of spaces and lines (see -print0 w/ find(1))
3. use -I@ to interpolate multiple times
4. bash -c
-->
