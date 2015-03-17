---
layout: default
title: Rust infrastructure can be your infrastructure
description: |
    Homu and highfive were created for rust-lang, but you can easily benefit too.
draft: true
comments:
    users: ""
    r_rust: ""
---

[Rust](http://rust-lang.org) is a reasonably large project:
[the compiler and standard libraries](https://github.com/rust-lang/rust)
are over 350kloc, built across nearly 40000 commits by the hands of
around 900 contributors. Not only that: there are more than 30 other
repositories in
[the rust-lang GitHub organisation](https://github.com/rust-lang) that
shouldn't fall by the wayside, and, for rust-lang/rust alone, there
are often more than 100 pull requests landing and a dozen new
contributors in a single week.

It is sometimes chaotic... *often* chaotic... with
[1.0 quickly approaching](http://blog.rust-lang.org/2015/02/13/Final-1.0-timeline.html),
and there are definitely places where the core team (and the rest of
the community) sometimes can't keep up, but getting
code into rust-lang/rust is rarely one[^rollups], due to two critical robots:

- an integration bot/pull request manager, [Barosl Lee's Homu](https://github.com/barosl/homu)
- a review assigner, [Nick Cameron's Highfive](https://github.com/nrc/highfive)

The former ensures the master tree is essentially always passing
tests, on all first-class platforms: it won't let a patch land until
it does. The latter makes sure that pull requests don't slip through
the cracks, there's someone with power watching out for each one.

Both of these tools can be configured to run on your own (or an
organisation's) repos on GitHub. All you need is a public-facing
server.

[^rollups]: I'm being... optimistic. There's so many patches submitted
            that we only keep up via regular "rollups": landing
            several pull requests in a single batch (usually created
            by the hard-working
            [Manish Goregaokar](https://github.com/Manishearth)). This
            is a curse and a blessing of the design of the testing
            infrastructure: serialized testing means things take a
            while to land, but testing everything (including rollups)
            before landing ensures that the master branch still passes
            tests.

## Homu: "Not rocket science"

Homu is a reimplementation/extension of the original
[bors](https://github.com/graydon/bors) bot. Bors was implemented by
[Graydon Hoare (Rust's original designer) in 2013 (or so)](http://graydon.livejournal.com/186550.html)
to apply Ben Elliston's "not rocket science" rule to Rust:

> The Not Rocket Science Rule Of Software Engineering:
>
> automatically maintain a repository of code that always passes all the tests

The [core idea](http://buildbot.rust-lang.org/homu/) is simple: the
correct way for anyone (including core developers) to land code into
rust-lang/rust is to submit a pull request to that repo.  Someone on
the reviewers whitelist will review the code and, once it looks good,
write a "review approved" comment:
[`@bors r+`](https://github.com/rust-lang/rust/pull/23415#issuecomment-81877665)[^bors]. Homu
will take the pull request, merge it with master into a new branch,
and submit that branch to a testing backend. If the tests pass, Homu
fast-forwards to the merge commit and starts on the next patch in
[its queue](http://buildbot.rust-lang.org/homu/queue/rust).

[^bors]: Why `@bors` if its now Homu? The Homu back-end listens for
         mentions of the account it is registered to use, and
         rust-lang still uses [@bors](https://github.com/bors).

The process of code review and landing gated on testing works wonders
for Rust: only really subtly---or transiently---broken patches get
into master, other forms of brokenness are eliminated before touching
mainline at all and backing out/reverting of patches once landed is
rarely needed.[^no-free-lunch]

[^no-free-lunch]: Unfortunately, there's no free lunch, and the test
                  guarantees come at a cost of scalability, as landing
                  patches to master is serialised
                  ([see above too](#fn:rollups)).

Having tests always passing sounds great, right? It's even better
because it's not hard to use Homu with your own repos: just follow the
[usage instructions](https://github.com/barosl/homu#usage) (I could
only get the git version to work). It supports two testing backends at
the moment, [Buildbot](http://buildbot.net/) and
[Travis CI](https://travis-ci.org/).

Even if you don't need the test handling, Homu is still useful: the
queue pages are nice pull request summary panels, especially since
they can be combined to display pull requests across multiple repos,
e.g. the
[rust-lang Homu instance](http://buildbot.rust-lang.org/homu/) manages
two repositories, `cargo` and `rust`, and there's a variety of ways to
digest that:

- [.../queue/cargo](http://buildbot.rust-lang.org/homu/queue/cargo)
- [.../queue/cargo+rust](http://buildbot.rust-lang.org/homu/queue/cargo+rust)
- [.../queue/all](http://buildbot.rust-lang.org/homu/queue/all)

I easily lose track of pull requests against my own repos, so I've
registered a lot of my repos with my Homu instance, and the `/all`
endpoint shows me everything I want to know.

Which brings me on to highfive:

## Highfive: "welcome! You should hear from @huonw soon."

As I said, I easily lose track of pull requests against my own
repos. My GitHub news feed and emails is very busy with all
development and discussion in rust-lang/rust, so small pull requests
in other repositories can get drowned out and lost. Fortunately, Rust
(and Servo) itself had this problem and has made progress on it
already: [Nick Cameron](https://github.com/nrc/highfive) built on
[Josh Matthew's script](https://github.com/jdm/highfive) for greeting
new contributors to create
[@rust-highfive](https://github.com/rust-highfive), a bot that still
[says hi](https://github.com/rust-lang/rust/pull/23364#issuecomment-80426067),
but also manages
[assigning potential reviewers to PRs](https://github.com/rust-lang/rust/pull/23430#event-256365835).

The bot randomly chooses a person (out of a small per-repo whitelist)
and uses GitHub's assignment feature to make the pull request their
responsibility. The theory is that, for people who don't know who
should review the code, the randomly chosen reviewer will either do
the review themselves or will know someone more appropriate, so things
rarely get left in limbo for weeks or months, especially not small
patches like edits to documentation.

Of course, in single-person projects like my own, finding other
reviewers doesn't make so much sense, the goal is to be friendly, and
have pull requests automatically assigned to me, so that they show up
in the list that GitHub can show.

### Setting it up

Highfive is currently mainly designed for use as an internal rust-lang
tool, and so isn't as well documented as Homu which was written to be
more generic from the start. I'll write down a bit of docs here, but
they're just an overview, so don't be afraid to look at/edit the
source if you do wish to deploy it: it is easy to customize. Of
course, as an internal tool, it is designed to cater just for the
needs of rust-lang and support/patches not needed for that use case
may not be accepted upstream.

Highfive lives as CGI script `newpr.py`, using a basic configuration
file to authenticate with GitHub and JSON files to control the
possible reviewers on a per repo basis. The script selects a person
out of a set of eligible reviewers it determines by looking at the
JSON files, and the directory that has the most code changes in the
pull request.

Highfive also supports pinging reviewers on IRC to... encourage them
to make progress on the PR: the upstream repo is currently
[hard-coded](https://github.com/nrc/highfive/blob/7c5b73babfd0881d1c676b8f0f7dbbeed5a392ba/highfive/newpr.py#L109-L114)
to `#rust-bots` on `irc.mozilla.org`. (It's an internal tool!) **Any deployment should
disable/change this.**


It interacts with GitHub via
[webhooks](https://help.github.com/articles/about-webhooks/): to add
Highfive to a repository, create a webhook under the repo's
settings pointing to whereever `newpr.py` is exposed to the internet,
with the `application/x-www-form-urlencoded` content type.

#### Configuration files

The GitHub file should just be called `config`, and looks like:

{% highlight ini linenos=table %}
[github]
user = <user name of the account to use for the bot>
token = <api token generated for that account>
{% endhighlight %}

The API token must be protected, i.e. be careful to ensure that file
it isn't accessible over the internet. I'm not sure of the exact
permissions the token should have, but I suspect just `repo` is
enough.

There are two sorts of JSON repo configuration files: `<name>.json`
defines the set of reviewers chosen in the repo specifically called
`<name>`, while `_global.json` defines groups of reviewers in scope in
all other config files. E.g. For rust-lang,
[`_global.json`](https://github.com/nrc/highfive/blob/7c5b73babfd0881d1c676b8f0f7dbbeed5a392ba/highfive/configs/_global.json)
looks like:

{% highlight json linenos=table %}
{
    "groups": {
        "core": ["@brson", "@pcwalton", "@nikomatsakis", "@alexcrichton", "@huonw"],
        "crates": ["@huonw", "@alexcrichton"],
        "doc": ["@steveklabnik"]
    }
}
{% endhighlight %}

And
[`rust.json`](https://github.com/nrc/highfive/blob/7c5b73babfd0881d1c676b8f0f7dbbeed5a392ba/highfive/configs/rust.json)
looks like:

{% highlight json linenos=table %}
{
    "groups": {
        "all": ["core"],
        "compiler": ["@pnkfelix", "@nick29581", "@eddyb", "@Aatch"],
        "syntax": ["@pnkfelix", "@nick29581", "@sfackler", "@kmc"],
        "libs": ["@aturon"]
    },
    "dirs": {
        "doc":              ["doc"],
        "liballoc":         ["libs"],
        "libarena":         ["libs"],
        "libbacktrace":     [],
        "libcollections":   ["libs", "@Gankro"],
        ...
        "librustc":         ["compiler"],
        ...
{% endhighlight %}

As one might guess, `groups` defines groups of reviewers, in terms of
GitHub handles and other groups. The `dirs` dictionary lists
directories under `src` in the repo, Highfive will determine which
directory contains the most changed files in the patch, and select
those groups/users, so that people with particular areas of expertise
get to review those patches (heuristically).

The people in the `all` group are considered eligible for any review,
and so are added to the pool no matter what. As such the `dirs` field
is completely optional, if it is missing (or any directories are
missing) Highfive will select from only the `all` group.  I've
used this to
[configure my Highfive](https://github.com/huonw/highfive/tree/8bf65450821629fd5815fe7bbc3aab3ae69a449a/highfive/configs)
to assign me for everything (makes sense...).

## Batch configuration

It's pretty annoying to use GitHub's web interface to manually add to
each repo your robot collaborator, and then add the webhooks necessary
for Homu and Highfive, so I wrote
[a few Python scripts](https://github.com/huonw/repo-admin) to
help. The code has some examples of using them to set-up these two pieces of
infrastructure.

{% include comments.html c=page.comments %}
