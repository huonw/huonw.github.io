---
layout: default
title: Little libraries
description: >
    On focused libraries in Rust.

comments:
    users: "http://users.rust-lang.org/t/little-libraries/1159"
    r_rust: "http://www.reddit.com/r/rust/comments/340dtb/little_libraries/"
    # r_programming:
    # hn:
---

I've been having a lot of fun recently solving "little" problems in
Rust. I have a long term project to make something for displaying my
(GPS-tagged) photos nicely and, along the way, I've discovered and
filled in a few gaps by creating focused crates for small tasks.

{% include image.html src="whole-world.jpg" title="Lots of places to go yet." caption="My travels over the last few years, as displayed by the current web interface (served to the browser via Rust, of course)." alt="A screenshot of a world map, with dots and coloured lines joined into a time series" %}


Once an idea is formed, `cargo` means it only takes an hour or two to go
from zero to a focused crate with a chunk of code &
[documentation][docdoc], published on [crates.io](http://crates.io)
and a nice feeling of completion.

[docdoc]: http://doc.rust-lang.org/book/documentation.html

The best part is that it makes sense to do this: `cargo` makes it so
easy to reuse code in a reliable way that publishing such little
crates is worth the effort: it takes a single line in the package
manifest to use them, and package versions only change when you
ask[^lock], so your code won't implicitly break if upstream changes.
Rust[^unique] is improving on many traditional systems languages in
this respect by encouraging a good package ecosystem from the
beginning, whereas languages like C or C++ don't have a canonical
process and so it can take non-trivial effort to integrate third party
code.

[^lock]: This locking even holds true when using git dependencies:
         once you compile once with Cargo versions of dependencies are
         locked until you explicitly opt-in to a version upgrade with
         `cargo update`. See
         ["Cargo.toml vs Cargo.lock"](http://doc.crates.io/guide.html#cargo.toml-vs-cargo.lock)
         for more details.

[^unique]: This post isn't meant to imply that Rust is the only
           language (or even systems language) with this property. I
           just think it's cool that Rust has it.

Of course, not everything can be a small library: for the GPS photo
project, I needed to be able to read EXIF data (`rexiv2`), interact
with a database (`rusqlite`) and display a web interface (`iron`,
`nickel`). Nonetheless, the ease with which `cargo` manages
dependencies is still massively useful for "big" libraries like those,
for both the developers and the users.

<div class="centered-libs">
{% include rust-lib.html name="rexiv2" inline=true doc_link="https://felixcrux.com/files/doc/rexiv2/" %}
{% include rust-lib.html name="rusqlite" inline=true doc_link="http://www.rust-ci.org/jgallagher/rusqlite/doc/rusqlite/" %}
{% include rust-lib.html name="iron" inline=true doc_link="http://ironframework.io/doc/iron/" %}
{% include rust-lib.html name="nickel" inline=true doc_link="http://docs.nickel.rs/nickel/" %}
</div>

## The process

I have a "process" with three parts:

- write the code
- infrastructure: register [travis CI](https://travis-ci.org) to
  upload documentation to be visible at `$user.github.io/$repo` (I
  also add some [project management tools][infra]),
- crates.io: add
  [metadata](http://doc.crates.io/manifest.html#package-metadata)
  and
  [publish the crate](http://doc.crates.io/crates-io.html#publishing-crates)

[infra]: {% post_url 2015-03-17-rust-infrastructure-can-be-your-infrastructure %}

It's pretty simple, especially with some automation for the
infrastructure step. Other than writing the code itself, the most
complicated part of the whole process is uploading the documentation
to be readable online: everything else is essentially a single `cargo
...` invocation. My usual configuration for Travis looks something
like:

{% highlight yaml linenos %}
language: rust
sudo: false
script:
  - cargo build --verbose && cargo test --verbose && cargo doc --verbose
after_success:
  - |
        [ $TRAVIS_BRANCH = master ] &&
        [ $TRAVIS_PULL_REQUEST = false ] &&
        echo '<meta http-equiv=refresh content=0;url=[CRATE NAME]/index.html>' > target/doc/index.html &&
        git clone https://github.com/davisp/ghp-import &&
        ./ghp-import/ghp-import -n target/doc &&
        git push -fq https://${GH_TOKEN}@github.com/${TRAVIS_REPO_SLUG}.git gh-pages

env:
  global:
    secure: "Khw6CgS[...]jlPRac="
{% endhighlight %}

> *Update 2015-04-28*: see
> [*Helping Travis catch the rustc train*][travis-train] for a neater
> way to do this and more.

[travis-train]: {% post_url 2015-04-28-helping-travis-catch-the-rustc-train %}

The `after_success` section manages publishing the documentation that
`cargo doc` renders, via
[`ghp-import`](https://github.com/davisp/ghp-import). It is inspired
by
[Andrew Hobden's instructions](http://www.hoverbear.org/2015/03/07/rust-travis-github-pages/),
modified to avoid needing `sudo` to be able to get the faster/more
responsive Travis builds. Hopefully this will get even easier in
future, with some sort of `rustdoc` as a service. (See also Keegan
McAllister's
[more secure variant](https://github.com/kmcallister/travis-doc-upload).)

(I believe one can have a `.travis.yml` that compiles on both nightly
and beta/stable by adding something like `rust:
["nightly", "1.0.0-beta3"]`, but I've not yet investigated.)

## `cogset`

{% include rust-lib.html name="cogset" %}

The first problem that I encountered was wanting to group clusters of
photos that are close in space-time, so that I could highlight the
segments where I'm actually walking around some interesting place and
skip the boring bits of travelling in between.

{% include image.html src="scotland-circles.jpg" title="Climbing Arthur's Seat was great." caption="A few days in Scotland: Linlithgow (small circle, in the middle), Falkirk, back to Linlithgow (large) and ending in Edinburgh." alt="A screenshot of a map of a part of Scotland, with coloured dots and lines joined into a time-series, and circles around clusters of those" %}

This is exactly what
[clustering](https://en.wikipedia.org/wiki/Cluster_analysis) is
designed to do... but unfortunately I couldn't find any
pre-implemented algorithms for doing this in Rust.

A bit of research indicated that I probably wanted a density-based
clustering algorithm, such as
[DBSCAN](https://en.wikipedia.org/wiki/DBSCAN) or
[OPTICS](https://en.wikipedia.org/wiki/OPTICS_algorithm). These are
quite simple to use: feed in a collection of points with the ability
to find all the points that are less than ε units away from a given
point and DBSCAN efficiently iterates over those points finding
"dense" clusters, like the circles in the image above.

A few hours of working through the Wikipedia pseudocode, testing
and documenting gave me the
[`cogset`](http://huonw.github.io/cogset/cogset/) crate, with its
generic
[`Dbscan`](http://huonw.github.io/cogset/cogset/struct.Dbscan.html)
type. This slotted straight into my project by just adding `cogset =
"0.1"` to the `[dependencies]` section.

I particularly like how `Dbscan` is generic over the index/database of
points, letting someone calling `Dbscan` use a
[naive index](http://huonw.github.io/cogset/cogset/struct.BruteScan.html)
if performance of the DBSCAN computation isn't a problem, or an
efficient
[spatial index](https://en.wikipedia.org/wiki/Spatial_database#Spatial_index)
if it is.

## `tz-search`

{% include rust-lib.html name="tz-search" %}

I discovered that my Nexus 5 records some timestamps incorrectly:
panoramas use the local time as the GPS time, resulting in some
confusing artifacts on the map. Fortunately both the local time and
the GPS location are recorded correctly, so it is possible to compute
the true GPS time by deducing the UTC offset of the local time and
hence computing the true GPS time from the local time.

This requires knowing the timezone of a point on the Earth's surface,
again something for which I couldn't find a good Rust library. Looking
into this problem turned up
[`latlong`](https://github.com/bradfitz/latlong), a very neat little
Go library for doing exactly this task: mapping a latitude/longitude
pair to the name of the timezone it is in.

Porting it directly[^pattern-matching] was straight-forward, resulting in
[`tz-search`](http://huonw.github.io/tz-search/tz_search/), which offers:

[^pattern-matching]: It wasn't quite a one-to-one port: I opted to use
                     [an `enum`][enum] and [pattern matching][pattern]
                     to model the different internal encodings,
                     instead of a trait object which would be the true
                     translation of the [`interface`][interface] used
                     in the original library.

[enum]: https://github.com/huonw/tz-search/blob/229617cd23dc413957c5b02d027c7ce4bb2be3d0/src/lib.rs#L120-L124
[pattern]: https://github.com/huonw/tz-search/blob/229617cd23dc413957c5b02d027c7ce4bb2be3d0/src/lib.rs#L260-L284
[interface]: https://github.com/bradfitz/latlong/blob/7d3ff04aa2b06b9db6947f7d99a4bb3cc66570bc/latlong.go#L157-L159

{% highlight rust linenos %}
let timezone = tz_search::lookup(-33.8885, 151.1908).unwrap();
println!("{}", timezone); // Australia/Sydney
{% endhighlight %}

Of course, just knowing the name of the timezone isn't good enough,
but it's the first step of getting the UTC offset (I haven't
investigated the remaining ones yet...).

## `order-stat`

{% include rust-lib.html name="order-stat" %}

The most recent "little library" I published is `order-stat`, for
computing order statistics (the `k`th smallest/largest element of a
set). The motivation is expanding `cogset` slightly, with
[the OPTICS algorithm](https://en.wikipedia.org/wiki/OPTICS_algorithm),
which requires the ability to do exactly that.

Poking about, I found a few
[selection algorithms](https://en.wikipedia.org/wiki/Selection_algorithm),
notably [quickselect](https://en.wikipedia.org/wiki/Quickselect) and
[Floyd–Rivest](https://en.wikipedia.org/wiki/Floyd–Rivest_algorithm),
as well as the obvious one of doing a full sort and indexing to
retrieve the `k`th element. All offer the same interface, so decision
between them is only guided by performance.


<div class="table-wrapper" markdown="1">

| Algorithm | Huge (ms) | Large (µs) | Small (ns) |
|---|---:|---:|---:|
| Sort | 7.2  | 87.8 | 264 |
| Quickselect | 1.1 | 9.7  | 83  |
| Floyd–Rivest | **0.48** | **2.4**  | **72** |

</div>

Hence, Floyd–Rivest has the honour of being
[the star](http://huonw.github.io/order-stat/order_stat/fn.kth.html)
of this little library.

Somewhat against the idea of a little library, `order-stat`
[includes](http://huonw.github.io/order-stat/order_stat/fn.median_of_medians.html)
a
[medians-of-medians](https://en.wikipedia.org/wiki/Median_of_medians)
implementation too (in "little"'s defense, it's related to order
statistics and medians).

{% include rust-lib.html name="quickcheck" doc_link="https://github.com/BurntSushi/quickcheck#readme" %}

I should plug the `quickcheck` crate: it discovered a few subtle bugs
in my Floyd–Rivest implementation, stemming from me incorrectly
translating the copy-happy original version (presumably designed for
GC'd languages where any value can be duplicated cheaply) to a Rust
version that avoids clones and respects ownership.

(As a bonus, neither algorithm does any allocations!)

## Write your own!

I'm sure there's little tasks that you've solved in your own projects
that others might want to solve too, so unleashing them on the world
as a focused library on crates.io would be great! With 1.0 fast
approaching, the Rust ecosystem has a level of stability never seen
before, and maintaining a pile of little libraries is getting easier
and easier.

(For best results, include [documentation][docdoc] and fill out as
much crates.io
[metadata](http://doc.crates.io/manifest.html#package-metadata) as you
can.)

{% include comments.html c=page.comments %}
