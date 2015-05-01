---
layout: default
title: Travis on the train, part 2
description: >
    My script for better Travis CI and Cargo integration has had some
    improvements, including support for recording test coverage via
    coveralls.io.

comments:
---

After announcing [travis-cargo][travis-cargo] a few days ago in
[*Helping Travis catch the rustc train*][travis-train], I got some
great hints/contributions from [Jan Segre][jan] and had a fun little
time automating [code coverage collection][cover] via
[coveralls.io][coveralls]. Unfortunately, **this is a breaking
change** for existing users of travis-cargo, but the migration is
easy.

[travis-cargo]: https://github.com/huonw/travis-cargo
[travis-train]: {% post_url 2015-04-28-helping-travis-catch-the-rustc-train %}
[jan]: https://github.com/jansegre
[cover]: https://users.rust-lang.org/t/tutorial-how-to-collect-test-coverages-for-rust-project/650/2?u=huon
[coveralls]: http://coveralls.io

(If you're wondering what travis-cargo is, see [the linked post][travis-train].)

Version 0.1 of travis-cargo is now available on PyPI[^pypi] and should be
installed via that medium. This works on Travis:

[^pypi]: Incidentally, I found publishing Python packages on PyPI much
         more difficult than publishing Rust packages on crates.io.
         Great job on getting cargo and crates.io so streamlined, Alex
         Crichton, Yehuda Katz and everyone who has contributed!

{% highlight sh linenos=table %}
pip install 'travis-cargo<0.2' --user && export PATH=$HOME/.local/bin:$PATH
{% endhighlight %}

The explicit `<0.2` requirement will reduce the risk of builds
breaking due to upstream changes in future, as I will make every
effort to follow semantic versioning and bump versions for any further
breaking changes.

## `[breaking-change]`

Part of migrating to PyPI requires renaming the `travis-cargo.py`
script to `travis_cargo.py` and making it no longer a
directly-executable script. **This means that a direct `git clone` and
alias as I suggested previously will not work**.

From now, the only supported way to install travis-cargo is via `pip`
as demonstrated above, and the recommended format to use with `pip` is
the PyPI package, with a version requirement. The example installation
listed above will install a `travis-cargo` binary to `~/.local/bin`
and then ensure that that it is available to the shell by name.

However, that's not the only breaking change: the `cargo` subcommand
has been removed since the default binary is now much longer, and
looks more like the real `cargo` program. Cargo subcommands passed to
`travis-cargo` directly work as one would expect. Migration:

{% highlight sh linenos=table %}
# before
./tc cargo build
# after
travis-cargo build
{% endhighlight %}

The `doc-upload` subcommand and the `--only` and `-q` arguments have
not been changed.


I've opened pull requests on all users of travis-cargo that I found
via Github's search. I apologise if I missed you, fortunately
[the migration](https://github.com/huonw/order-stat/commit/251a80999b5d727224523a33847479d23048d7ab)
is straight-forward.


## Covering your coverage needs

The new and improved travis-cargo includes `travis-cargo coveralls`,
which will use the awesome [kcov][kcov] along with Rust's debuginfo
support to record the test coverage of your libraries, and then upload
them to [coveralls.io][coveralls].

{% include image.html src="coveralls.png" caption="order-stat's test coverage: being a little library makes it easy to get high numbers." %}

kcov combines with Coveralls to make supporting this ridiculously
easy: simply register/activate coveralls.io and add `sudo: required` &
`travis-cargo coveralls` to your `.travis.yml`. (The `sudo`
requirement is necessary to install kcov; it unfortunately makes
Travis much slower to start builds.)

[kcov]: (https://github.com/SimonKagstrom/kcov)

`travis-cargo coveralls` should successfully handle both in-crate and
external tests, so the Coveralls dashboard will display the total
coverage across all real tests (doc-tests are figments of our
imaginations). At the moment, Cargo doesn't provide reliable
programmatic access to everything it knows, so `travis-cargo
coveralls` first searches the output of `cargo test` for the binaries
it runs, and then executes those binaries under kcov. For this to work
best, the `test` [profile][profile] must have `debug = true` (which is
the default).

[profile]: http://doc.crates.io/manifest.html#the-[profile.*]-sections

## Travis-cargo by example: the sequel

order-stat's [`.travis.yml`][commit] now looks like ([diff for the change][diff]):

[commit]: https://github.com/huonw/order-stat/blob/251a809/.travis.yml
[diff]: https://github.com/huonw/order-stat/commit/251a80999b5d727224523a33847479d23048d7ab

{% highlight yaml linenos=table %}
language: rust
sudo: required

rust:
  - nightly
  - beta
before_script:
  - pip install 'travis-cargo<0.2' --user && export PATH=$HOME/.local/bin:$PATH
script:
  - |
      travis-cargo build &&
      travis-cargo test &&
      travis-cargo bench &&
      travis-cargo doc
after_success:
  - travis-cargo --only beta doc-upload
  - travis-cargo coveralls

# ...
{% endhighlight %}

travis-cargo's [README][readme] contains more information.

[readme]: https://github.com/huonw/travis-cargo#readme

(Thanks to Simon Kagstrom for assistance with getting kcov working
properly, lifthrasiir and jscheivink for
[their tutorials][coverage-tute] on collecting coverage, and Jan Segre
for the assistance with packaging and feedback.)

[coverage-tute]: https://users.rust-lang.org/t/tutorial-how-to-collect-test-coverages-for-rust-project/650?u=huon

{% include comments.html c=page.comments %}
