---
layout: default
title: Helping Travis catch the rustc train
description: >
    Manually configuring Travis CI to handle the Rust release trains
    and upload documentation is annoying. Getting a script to do it is
    far less annoying.

comments:
    users: "https://users.rust-lang.org/t/helping-travis-catch-the-rustc-train/1167"
    r_rust: "http://www.reddit.com/r/rust/comments/344o0e/helping_travis_catch_the_rustc_train/"
---

I've been putting off configuring my continuous integration settings
to match the Rust train model: it involves non-trivial branching on
the configuration, and duplicating that over a pile of repos is not
something I looked forward to. So, instead, I wrote
[travis-cargo](https://github.com/huonw/travis-cargo) to make things
easier.

## Branching on configuration?

One approach to developing Rust libraries once 1.0 is released will be
to test by building with the latest stable compiler, to ensure that
code is behaving as one hopes. I'm sure this will work well enough, but it's missing an important part of the release model

Rust is adopting ["trains"][train] for releases, where features migrate
from unstable to beta and then on to stable. That beta period is a big
motivation for the approach: before releases become stable, there is 6
weeks of development for people to test their code and help ensure
backwards compatibility isn't accidentally broken. If there is a
regression, it will be assessed and presumably fixed before the stable
release. There is effort on going to incorporate this sort of checking
into [crates.io][crates]&mdash;brson has been posting regular
[regression reports][regress] recently&mdash;but this doesn't cover
all cases: at the very least, not all code is on crates.io.

[train]: http://blog.rust-lang.org/2014/10/30/Stability.html
[crates]: https://crates.io/
[regress]: https://internals.rust-lang.org/t/regression-report-beta-2015-04-03-vs-nightly-2015-04-24/1967

The easiest way to get code to be tested is to have continuous
integration infrastructure like [Travis CI](https://travis-ci.org/)
running tests against all configurations of interest: for a lot of
code this is likely to mean running builds against the most recent
stable release, the current beta, and the current nightly, and I
forsee that some libraries may wish to compile against slightly older
versions too. And having three builds for everything is just the start.

The nightly compilers offer unstable features that are fully
disallowed on the beta and stable channels, and libraries may wish to
offer or use functionality that is only enabled with unstable
compilers. At the moment, a big example is
[microbenchmarks with `#[bench]`][bench], running them requires
importing the feature-gated `test` crate: I configure my libraries to
have an `unstable` [feature][feature] that has to be activated for
nightly-only features like benchmarks to be compiled in, so that the
library and its tests can be run with stable and beta compilers.

[bench]: http://doc.rust-lang.org/nightly/book/benchmark-tests.html
[feature]: http://doc.crates.io/manifest.html#the-[features]-section

Unfortunately, all this means it is a little tricky to configure CI
optimally so that nightly builders build with unstable features, and
stable builds don't. That said, It's not *that* tricky, for example, using
[Travis' Build Matrix][matrix] functionality.

[matrix]: http://docs.travis-ci.com/user/build-configuration/#The-Build-Matrix

The final nail in the coffin is that I and others use CI to upload
rendered documentation for successful builds of the master branch:
[method I usually use][doc-upload] involves a big chunk of commands,
and requires manually inserting the library name. Having a separate
script allows me to use hoverbear's code but abstracted out in a
DRY-er way. (The script even calls `cargo` directly to extract the
true library name, straight from the horse's mouth.)

[doc-upload]: http://www.hoverbear.org/2015/03/07/rust-travis-github-pages/

## Travis-cargo by example

{% include rust-lib.html name="order-stat" %}

The interesting bit of the Travis configuration I'm now using for,
say,
[`order-stat`](https://github.com/huonw/order-stat/blob/34be76de3672baeae474eedc6955e7d7b0efdee7/.travis.yml),
looks like:

{% highlight yaml linenos=table %}
language: rust
# run builds for both the nightly and beta branch
rust:
  - nightly
  - beta

# load travis-cargo
before_script:
  - git clone --depth 1 https://github.com/huonw/travis-cargo
  # make a short alias (`alias` itself doesn't work)
  - ln -s ./travis-cargo/travis-cargo.py tc

# the main build
script:
  - |
      tc cargo build &&
      tc cargo test &&
      tc cargo bench &&
      tc cargo doc
after_success:
  # upload the documentation from the build with beta (automatically only actually
  # runs on the master branch)
  - tc --only beta doc-upload

# ...
{% endhighlight %}

which makes builds look like (look at the two jobs!):

[![](travis.png)](travis.png)

And, it's exactly the same configuration that I'm using for my other
libraries, other than the chunk of `secure` nonsense at the end (the
encrypted Github token).

`tc cargo ...` just runs cargo, but implicitly adds `--feature
unstable` when running the `rust: nightly` configuration (and
`--verbose` by default for all configurations). The command `tc
doc-upload` pushes the docs rendered by `cargo doc` to the main repo,
but with multiple configuration this may result in "races"/displaying
documentation for an undesired or inconsistent configuration: the
`--only beta` argument ensures that it only runs in the `beta`
configuration.

On the point of uploading docs: I imagine/hope there will be some sort
of crates.io-based doc hosting in future which makes manually hosting
docs less imperative. However, that day isn't here yet, and that host
will presumably only have docs for released crates, being able to
easily host documentation for the cutting-edge master branch still
seems handy.

Once we have a stable release, I intend to add `- stable` to `rust:`,
and switch `doc-upload` to `--only stable`; I believe these should be
the only changes necessary to get reliable testing against all three
channels.

Also, the manual passing of an unstable flag may become moot in
future, if the
[compiler itself supports a `nightly` `cfg` setting][cfgnightly],
further reducing the necessity for this script.

[cfgnightly]: https://internals.rust-lang.org/t/setting-cfg-nightly-on-nightly-by-default/1893

The [travis-cargo repo](https://github.com/huonw/travis-cargo)
contains a README with more details, and the script itself.

(Thanks to hoverbear for their original code, and bluss for
[their similar shell script](https://users.rust-lang.org/t/psa-1-0-0-beta-2-is-out/1019/13)
for inspiration.)

{% include comments.html c=page.comments %}
