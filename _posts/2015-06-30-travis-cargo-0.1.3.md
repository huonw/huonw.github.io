---
layout: default
title: "travis-cargo 0.1.3: --no-sudo"
description: >
   travis-cargo can now record coverage without requiring sudo.
---

I just pushed [travis-cargo](https://github.com/huonw/travis-cargo)
version 0.1.3, which adds a `--no-sudo` command to
[the `coveralls` and `coverage` subcommands][oldpost] to allow
recording/uploading test coverage without needing `sudo`.

[oldpost]: {% post_url 2015-05-01-travis-on-the-train-part-2 %}

This is based[^others] on [@seanmonstar](https://github.com/seanmonstar)'s
investigation/[implementation](https://github.com/seanmonstar/httparse/blob/48da357b84397cc512265c8f6a99c89a7f513351/.travis.yml)
of sudo-less `kcov`. It works because Travis's
[`apt` addon](http://docs.travis-ci.com/user/apt/) has
[whitelisted](https://github.com/travis-ci/apt-package-whitelist)
everything necessary. Unfortunately, it does require these to be
installed explicitly, which seems to be something `travis-cargo` can't
do itself: they seem to have to be explicitly listed in the manifest.

[^others]: [@jonas-schievink](https://github.com/jonas-schievink) had
           a
           [similar observation a month ago](https://github.com/huonw/travis-cargo/issues/7)
           but I only noticed after already implementing it just today:
           sorry Jonas!

{% highlight yaml linenos %}
addons:
  apt:
    packages:
      - libcurl4-openssl-dev
      - libelf-dev
      - libdw-dev
{% endhighlight %}

This allows leveraging Travis' container-based infrastructure, with
[all its benefits](http://blog.travis-ci.com/2014-12-17-faster-builds-with-container-based-infrastructure/),
especially around speed and latency. If you switch[^false], you can check that
your builds are using it by looking for the following paragraph in the
build-logs:

{% highlight text linenos %}
This job is running on container-based infrastructure, which does not allow use of 'sudo', setuid and setguid executables.
If you require sudo, add 'sudo: required' to your .travis.yml
See http://docs.travis-ci.com/user/workers/container-based-infrastructure/ for details.
{% endhighlight %}

`--no-sudo` is opt-in because it'd be a breaking change to do anything
else, and because adding `sudo: required` is simpler than the whole
`addons: apt: ...` thing.

[^false]: I think I have also sometimes found it necessary to also add
          `sudo: false` to forcibly opt-in to the container-based
          infrastructure.
