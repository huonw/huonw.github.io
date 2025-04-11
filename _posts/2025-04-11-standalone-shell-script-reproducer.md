---
layout: default
title: "Communicating bugs: use a single standalone shell script"

not_rust: true
description: >-
    When I file a bug, I can get more reliable minimal working examples using a shell script, leading to better bugs and faster help.
comments:
---

Hitting a bug is no fun: maybe it interferes with your work or play, or maybe it means you have to dive down a debugging rabbit hole. Remotely debugging a bug _someone else_ has found is even less fun... I've settled on using a shell script for sharing executable self-contained reproducers for issues I find in software libraries and developer tools, to get help faster.

Sometimes, when I've found an issue, telling someone how to see it for themselves—how to reproduce it—is trivial: "go to this documentation link `https://...` and see the typo: `miispeled`". However, it's usually harder.

Reproducing a bug might involve particular versions of libraries and tools, it might involve data in one or ten different files, and a precise set of flags and configuration. How can we communicate all of that? How can we communicate it well, so someone debugging is **not wasting time manually piecing it together**?

I've found an effective way, in many cases, is a single standalone shell script with 3 main steps:

1. **Prep a clean directory**: `cd $(mktemp -d)`
2. **Create any required files**, from content inline in the shell script: using `cat` + heredocs, `echo` and/or `touch`
3. **Execute commands to demonstrate the problem**: whatever is required to show off the bug!

By putting it into a single shell script, it can be **shared in any text field** (no need for file attachments, or creating and linking to git repos), and it can be easily **reviewed, copy-pasted, and executed**. By aiming to have a standalone shell script, I'm also reminded to reduce the reproducer to a small set of files, cutting away anything irrelevant.

That is, when I use a script, I feel more assured of sharing a [*minimal* **working** example][mwe]:

- Minimal: the constraints of fitting into a single script encourages small examples (and makes it easy for someone else to minimise even further, if I didn't get all the way to minimal).
- Working: the shell script is standalone and executable, so running it is enough to see that demonstates the problem.

[mwe]: https://en.wikipedia.org/wiki/Minimal_reproducible_example

## Empathy = better results

I've spent a lot of time on both sides of the bug equation, and thus know what either side wants:

- as a **user**, who is finding and reporting issues, I often want **actionable** help **quickly**.
- as a **maintainer**, who is triaging, understanding and fixing issues, I always want a **clear** description with **easy-to-follow** "steps to reproduce".

As a user, even if as a purely self-interested user with no concern for anyone else[^selfish], I know I'll get the best result using a healthy dose of empathy and understanding for the maintainers who will help me: it is **in my interest to make my issue as clear as possible**! I want to help them help me!

[^selfish]: Of course, it's even better to not be purely self-interested. Being a good person only adds even more reasons to be polite, empathetic, and gracious.

## Structure

The basic structure of a script for effectively communicating a bug:

1. Prepping a clean directory
2. Creating any required files
3. Executing commands to demonstrate the problem

{% highlight shell linenos %}
# 1. always start in a new empty directory
cd $(mktemp -d)

# 2. Create any relevant files
cat > several_lines.txt <<EOF
file with
several
lines
EOF

echo 'just one line' > single_line.txt
touch empty.txt

# 3. Execute commands, both any set-up, comparison and demonstrating the bug
prepare --some=things

# BUG: brief description!
see --the=bug
{% endhighlight %}

Usually, it's good to include (tastefully edited) **output of the script** in the issue description too.

With a reproducer like that, someone helping me can copy it to a local script and run `bash script.sh`. Hopefully they can confirm they see the same problem straight away, and then they can start editing and debugging!

## Real-world example

Here's [an example][pants21264] of this style of reproducer:

[pants21264]: https://github.com/pantsbuild/pants/issues/21264

{% highlight shell linenos %}
cd $(mktemp -d)

cat > pants.toml <<EOF
[GLOBAL]
pants_version = "2.22.0.dev2"
pantsd_timeout_when_multiple_invocations = 1
EOF

# OK: prints the version
PANTS_VERSION=2.22.0.dev1 pants version

# BUG: Exception: Expected [GLOBAL] pantsd_timeout_when_multiple_invocations to be a float but given 1
pants version
{% endhighlight %}

This example demonstrates the three moving parts. Let's look at each one.

### 1. Prepping a clean directory

{% highlight shell linenos %}
cd $(mktemp -d)
{% endhighlight %}

This does a bit of shell magic: create a temporary directory with `mktemp -d`, which prints the path to that directory, and feed that output into `cd` to immediately change to it. Thus, the rest of the script executes from that empty directory, no matter where we started.

To keep the script neater, I generally don't bother cleaning up the temporary directory, on the assumption that the contents will be small, and that'll get cleared out automatically, by restarting the machine or similar. It is explicitly a temporary directory.

Why do this at all? **Keep myself honest**. By always switching to a new directory, I'm double-checking that running it on my machine is more likely to behave like running elsewhere, making the script more likely to work first time for my helpers: it's helping them help me!

Without it, it's easy to make a mistake. When I'm experimenting and iterating to find a reproducer, I usually end up with a messy working directory with random files lying around. It's easy to accidentally not realise that one of those files is influencing behaviour, and forget to include it. This leads to a bad bug report that takes longer to resolve.

### 2. Creating any required files

{% highlight shell linenos %}
cat > pants.toml <<EOF
[GLOBAL]
pants_version = "2.22.0.dev2"
pantsd_timeout_when_multiple_invocations = 1
EOF
{% endhighlight %}

This particular example only needs one file: `pants.toml`, with a few lines of content. This is using ["heredoc"][heredoc] syntax to define the content: everything between the `EOF` delimiters, starting `[GLOBAL]` and ending `..._invocations = 1`.

Notably, the content of the files should be directly in the script! No downloading opaque blobs that I created myself. (Downloading tools and dependencies is fine, especially if they're published  (or depended-upon)  by the project against which I am filing a bug.)

[heredoc]: https://en.wikipedia.org/wiki/Here_document

### 3. Execute commands to demonstrate the problem

{% highlight shell linenos %}
# OK: prints the version
PANTS_VERSION=2.22.0.dev1 pants version

# BUG: Exception: Expected [GLOBAL] pantsd_timeout_when_multiple_invocations to be a float but given 1
pants version
{% endhighlight %}

Finally, let's actually demonstrate the bug by running the relevant commands. The first `OK` one is demonstrating a working version for comparison, while the second `BUG` shows the problematic behaviour.

I like to include **explicit `OK`/`BUG` comments** (or even `echo` statements) to highlight which parts specifically are showing the problem, and which parts are for comparison or set-up or similar, rather than require my helper to work that out themselves. If my issue is easier to understand, it's easier to resolve: I want to help the reader help me!

## Self-contained?

The example script is almost fully self-contained, mostly using common Unix tools (`cat`, `mktemp`, etc)... but it also uses a "`pants`" binary. I am a maintainer of [Pantsbuild][pantsbuild] and filing an issue about it, so I've got a lot of context that tells me (a) other contributors will almost certainly have binary that installed, and (b) the specific version of it is very unlikely to matter for this particular bug.

[pantsbuild]: https://www.pantsbuild.org

However, I also file issues against other projects and ecosystems, some that I'm familiar with and others much less. When I'm less familiar, I make sure to have **empathy for maintainers**. As a maintainer, I prefer to start with a full working reproducer and then cut out any irrelevant bits (and expertise/familiarity usually makes this very quick). When I start with something that doesn't fully reproduce the problem, I'm going to have to **guess** at details to make it run: I might guess wrong, and waste a bunch of time looking at something irrelevant. Boo!

So, as a user, if I'm less familiar with the ins-and-outs of a project or ecosystem, I'll specify more of that in any reproducers, like versions of tools and preferably even installing them.

Sometimes installing something is quite awkward or very slow. In that case, at least running `program --version` in the script makes it easy for everyone to confirm what version being used.

## Revisiting

Having a single executable reproducer is great for revisiting bugs in future, and confirming they still reproduce or even that they've been fixed. I [experienced this recently][recent]:

1. Months ago, I filed a bug against the `strawberry-graphql` Python library, with a shell script reproducer.
2. More recently, someone commented to indicate that it seems to be fixed.
3. Just now, I revisited and used the shell script reproducer to quickly confirm that it has been fixed, and, further, took only minute or two to bisect the exact version in which the fix was made.

(This did require minor updates to the script to make the bisection smoother. That is, I didn't do a perfect job with a standalone reproducer the first time, but the bones were right and the changes were small.)

[recent]: https://github.com/strawberry-graphql/strawberry/issues/3288

## Why not do this?

When you're filing a bug, there's **many other ways** to try to describe it to someone who might help you. For instance:

- link to an online "playground" or "fiddle" that demonstrates the bug, when available
- text, image, and/or video descriptions ("create file `pants.toml` with contents `...`, and then run command `pants version`")
- attach a zip or tarball containing everything, that the helper can download, extract and run
- post a pull/merge request with a test case or script that demonstrates the bug
- link to a git repo (or even a [gist][gist]), that the helper can clone and run

[gist]: https://gist.github.com

All of these have their place:

- Maybe it's a complicated issue without a known way to reproduce, yet, and thus describing symptoms and suspicions is all that is possible.
- Maybe it's an issue with some UI, so describing where to click and what to type is all that is possible.
- Maybe a zip file works best with access control measures in your company.
- Maybe a unit test is easy to construct and the project has a convention of merging "xfailed" tests, so throwing up a pull request is a good start.
- Maybe there's a lot of large assets that are best included in a git repo.

However, for the sort of bugs I encounter, I've personally found that the single shell script often works and is low overhead.

As a maintainer, too, the effort of downloading a zip file or cloning a git repo and then navigating the resulting structure is **noticeable friction**, that makes me less inclined to look at a given ticket immediately. Sometimes, too, the issue is obvious from the file content, without having to execute everything, so having that content **immediately visible** when reading the bug increases the chance I'll be able to give advice and/or solutions during an initial triage: **instant assistance**!

### Dependency lockfiles

A particularly notable reason to avoid a shell script is lockfiles for dependencies: if I'm filing a bug against a library that has bunch of (transitive) dependencies involved, the exact versions of all those dependencies might be relevant, and/or might be helpful when revisiting the issue in the far future. Unfortunately, lockfiles are often huge, and thus not appropriate to include inline in a shell script. In this case, switching to a multi-file approach, like git repo or gist, may be the best way to share the reproducer.

That said, sometimes one can get a good-enough solution for transitive dependencies without a full lockfile and thus stick with the shell script solution. In the Python ecosystem specifically, one can strike a good middle-ground using `pip freeze`[^uv]: imagine you're working in a virtual environment to reproduce some issue:

1. once you're successful, take a snapshot of the dependency versions with `pip freeze`, which outputs a bunch of pinned requirements, like `cowsay==6.1`, `numpy==2.2.4`
2. place all those requirements into a single `pip install cowsay==6.1 numpy==2.2.4 ...` line in the script

This has limitations compared to a true lockfile (such as no hashes for increased supply-chain security), but dramatically increases the chance that a helper can reproduce the exact environment in which you observed the bug.

[^uv]: For Python, and particularly reproducers that involve a single Python script (with or without PyPI dependencies), one can also use [uv][uv]: have PEP 723 metadata at the start of the script with both `dependencies = [...]` for top-level dependencies but also, crucially, `[tool.uv].exclude-newer = "..."` field for [improved reproducibility][uv-repro]. This isn't exactly a lockfile, but will mean new releases of any transitive dependencies are less likely to break the script in future. That said, sticking to "plain old pip" is usually the most reliable strategy for sharing Python reproducers, though: almost everyone with Python installed will also have pip installed, and chucking a few `python -m venv venv`/`pip install ...` commands into a shell script works fine!

[uv]: https://docs.astral.sh/uv
[uv-repro]: https://docs.astral.sh/uv/guides/scripts/#improving-reproducibility

## Summary

When I've found a bug in a software library or a developer tool, I've found an effective way to share a reproducer for it is a single shell script with 3 moving main steps:

1. Prep a clean directory: `cd $(mktemp -d)`
2. Create any required files, from content inline in the shell script: using `cat` + heredocs, `echo` and/or `touch`
3. Executing commands to demonstrate the problem: whatever is required to show off the bug!

This seems to strike a good balance of convenience for me (as a user reporting the bug) and maintainers, hopefully leading to faster resolution.

This isn't a one-size-fits-all solution: other options for sharing a reproducer can be sensible.

{% include comments.html c=page.comments %}
