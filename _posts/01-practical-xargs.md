---
slug: 'practical-xargs'
title: 'xargs(1), Shell Brace Expansion, and Single-Line Execution'
date: '2019-12-08T05:35:07.322Z'
lastEdited: '2026-11-09'
---

`xargs` reads whitespace-delimited strings (separated by spaces or newlines) from stdin and executes a specified command with the input as arguments.<sub style="font-size:0.7em"><a href="#ref-1">[1]</a></sub>

This makes `xargs` a very powerful command when you want to run a command against arbitrary input.

For example, let's run the following command:

```bash
❯ printf 'hello    there\nbig         world\n' | xargs echo
```

`xargs` automatically parses `hello`, `there`, `big`, and `world` as individual inputs.
Then, these arguments are passed to the specified command (in this case, `echo`).

```bash
❯ printf 'hello    there\nbig         world\n' | xargs echo

# What gets executed:
# echo 'hello' 'there' 'big' 'world'

# Output:
hello there big world
```

> **Note**: All computed input arguments were passed to a single `echo` command.

In practice, you'll often want to run a command once per argument, because the command you're using only accepts one.

A common command I find this useful for is `aws s3`.
`aws s3 rm` only accepts one S3 path per invocation.

Shell brace expansion is a quick way to generate a list of paths.
In bash and zsh, `s3://my-bucket/partition-{1..3}/` expands to three separate paths before the command runs.

However, using brace expansion and `xargs` to pipe those paths to `aws s3 rm` doesn't work on its own:

```bash
❯ echo s3://my-bucket/partition-{1..3}/ | xargs aws s3 rm --recursive

# What gets executed:
# aws s3 rm --recursive 's3://my-bucket/partition-1/' 's3://my-bucket/partition-2/' 's3://my-bucket/partition-3/'

# Output:
Unknown options: s3://my-bucket/partition-2/,s3://my-bucket/partition-3/
```

To solve this, `xargs` accepts an `-n <number>` argument.<sub style="font-size:0.7em"><a href="#ref-2">[2]</a></sub>
The `-n` argument sets the maximum number of arguments passed to each command invocation.

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

Now that we're running one command per argument, note that the commands run sequentially.
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

> **Warning**: By default, `xargs` splits its input on any whitespace and treats quotes and backslashes specially.
> A path like `my file.txt` becomes two arguments, and a stray apostrophe fails with `unterminated quote`.
> If your input might contain spaces or quotes, separate the items with NUL characters and pass `-0`:
>
> ```bash
> find . -name '*.log' -print0 | xargs -0 rm
> ```

Good luck! 🏎

<small>

<span id="ref-1">[1]</span> IEEE Std 1003.1. ["xargs — construct argument lists and invoke utility"](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/xargs.html). The Open Group Base Specifications.

<span id="ref-2">[2]</span> GNU. ["xargs options"](https://www.gnu.org/software/findutils/manual/html_node/xargs-options.html). GNU Findutils Manual. <code style="font-size:inherit">-n max-args</code>: Use at most max-args arguments per command line.

<span id="ref-3">[3]</span> GNU. ["Controlling Parallelism"](https://www.gnu.org/software/findutils/manual/html_node/Controlling-Parallelism.html). GNU Findutils Manual. <code style="font-size:inherit">-P max-procs</code>: Run up to max-procs processes at a time.

</small>

<!--
TODO: how to handle spaces in arguments:
1. echo with escaped slashes
2. use -I@ to interpolate multiple times
3. bash -c
-->
